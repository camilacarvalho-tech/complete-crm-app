/**
 * OpenStreetMap / Overpass — descoberta de estabelecimentos (sem Google Billing).
 * Endpoints fixos (anti-SSRF). Sem scraping. Atribuição: © OpenStreetMap contributors
 */
const admin = require('firebase-admin')
const { logger } = require('firebase-functions')

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'NexusLeadsMonitor/1.2 (openstreetmap-overpass; +https://recomece-cred-oficial)'
const MASTER_EMAILS = new Set(['carvalhoduraocamila@gmail.com', 'laiane26022@gmail.com'])
const BBOX_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const bboxCache = new Map()

const SEGMENT_SELECTORS = {
  clinicas: [
    'nwr["amenity"="clinic"]',
    'nwr["amenity"="doctors"]',
    'nwr["amenity"="hospital"]',
    'nwr["healthcare"="clinic"]',
    'nwr["healthcare"="doctor"]',
    'nwr["healthcare"="dentist"]',
  ],
  empresa_b2b: ['nwr["office"]', 'nwr["shop"]'],
  inss: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]', 'nwr["office"="insurance"]'],
  credito_clt: ['nwr["office"="financial"]', 'nwr["office"="company"]', 'nwr["amenity"="bank"]'],
  emprestimo: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]'],
  consignado: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]'],
  fgts: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]'],
  cartao: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]'],
  corban: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]', 'nwr["office"="company"]'],
}

const KEYWORD_SELECTORS = [
  { test: /cl[ií]nic/i, selectors: ['nwr["amenity"="clinic"]', 'nwr["healthcare"="clinic"]'] },
  { test: /hospital/i, selectors: ['nwr["amenity"="hospital"]'] },
  { test: /m[eé]dic|doutor|doctor/i, selectors: ['nwr["healthcare"="doctor"]', 'nwr["amenity"="doctors"]'] },
  { test: /dentist/i, selectors: ['nwr["healthcare"="dentist"]', 'nwr["amenity"="dentist"]'] },
  { test: /farm[aá]c/i, selectors: ['nwr["amenity"="pharmacy"]'] },
  { test: /pet\s*shop|petshop|\bpet\b/i, selectors: ['nwr["shop"="pet"]'] },
  { test: /academia|fitness|gym/i, selectors: ['nwr["leisure"="fitness_centre"]'] },
  { test: /mercado|supermerc/i, selectors: ['nwr["shop"="supermarket"]'] },
  { test: /escrit[oó]rio|office/i, selectors: ['nwr["office"]'] },
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clampText(value, max) {
  return String(value || '').trim().slice(0, max)
}

function sanitizeEmpresaId(value) {
  const id = String(value || '').trim()
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(id)) return ''
  return id
}

function pickFiltros(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    cidade: clampText(src.cidade, 80),
    estado: clampText(src.estado, 2).toUpperCase(),
    segmento: clampText(src.segmento, 40).toLowerCase(),
    palavraChave: clampText(src.palavraChave, 80),
    nomeEmpresa: clampText(src.nomeEmpresa, 80),
    bairro: clampText(src.bairro, 80),
    cep: clampText(String(src.cep || '').replace(/\D/g, ''), 8),
  }
}

function escapeOverpassRegex(value) {
  return String(value || '')
    .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    .replace(/"/g, '')
    .slice(0, 60)
}

function classifyOverpassError(httpStatus, message) {
  const lower = String(message || '').toLowerCase()
  if (httpStatus === 429) return { code: 'unavailable', hint: 'Overpass rate limit (429).' }
  if (httpStatus >= 500) return { code: 'unavailable', hint: `Overpass HTTP ${httpStatus}.` }
  if (/timeout|aborted|abort|timed out/i.test(lower)) return { code: 'timeout', hint: 'Timeout ao consultar OpenStreetMap/Overpass.' }
  if (/nominatim/i.test(lower)) return { code: 'unavailable', hint: message || 'Nominatim indisponível.' }
  if (/cidade|localiza/i.test(lower)) return { code: 'skipped', hint: message }
  return { code: 'error', hint: message || `HTTP ${httpStatus || 'erro'}` }
}

async function verifyTenant(req, empresaId) {
  const authHeader = String(req.header('authorization') || '')
  const idToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  if (!idToken) {
    const err = new Error('missing_auth')
    err.status = 401
    throw err
  }
  let decoded
  try {
    decoded = await admin.auth().verifyIdToken(idToken)
  } catch {
    const err = new Error('invalid_auth')
    err.status = 401
    throw err
  }
  const uid = decoded.uid
  const tokenEmail = String(decoded.email || '').toLowerCase()
  const userSnap = await admin.firestore().collection('usuarios').doc(uid).get()
  const userData = userSnap.data() || {}
  const userEmpresa = userData.empresaId || userData.empresa_id
  const perfil = String(userData.perfil || userData.role || userData.tipo || '').toLowerCase()
  const isMaster = perfil === 'master' || MASTER_EMAILS.has(tokenEmail)
  if (!isMaster && userEmpresa !== empresaId) {
    const err = new Error('forbidden_tenant')
    err.status = 403
    throw err
  }
  return { uid, tokenEmail }
}

function cacheGet(key) {
  const row = bboxCache.get(key)
  if (!row) return null
  if (Date.now() - row.at > BBOX_CACHE_TTL_MS) {
    bboxCache.delete(key)
    return null
  }
  return row.value
}

function cacheSet(key, value) {
  if (bboxCache.size > 200) {
    const first = bboxCache.keys().next().value
    bboxCache.delete(first)
  }
  bboxCache.set(key, { at: Date.now(), value })
}

function isAllowedUrl(url) {
  if (OVERPASS_ENDPOINTS.includes(url)) return true
  if (url === NOMINATIM_ENDPOINT) return true
  if (url.startsWith(`${NOMINATIM_ENDPOINT}?`)) return true
  return false
}

async function fetchFixed(url, { method, body, timeoutMs, headers }) {
  if (!isAllowedUrl(url)) {
    const err = new Error('endpoint_not_allowed')
    err.status = 400
    err.code = 'error'
    throw err
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 20000)
  try {
    const res = await fetch(url, {
      method: method || 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        ...(headers || {}),
      },
      body,
      signal: ctrl.signal,
    })
    const text = await res.text()
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text.slice(0, 200) }
    }
    return { res, data, text }
  } finally {
    clearTimeout(t)
  }
}

async function geocodeBbox(filtros) {
  if (!filtros.cidade) {
    const err = new Error('Informe cidade (e UF) para buscar no OpenStreetMap.')
    err.status = 400
    err.code = 'skipped'
    throw err
  }
  const cacheKey = [filtros.cep, filtros.bairro, filtros.cidade, filtros.estado].filter(Boolean).join('|').toLowerCase()
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const q = [filtros.bairro, filtros.cidade, filtros.estado, 'Brasil'].filter(Boolean).join(', ')
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'br',
    addressdetails: '0',
    q,
  })
  if (filtros.cep) params.set('postalcode', filtros.cep)

  const url = `${NOMINATIM_ENDPOINT}?${params.toString()}`
  const { res, data } = await fetchFixed(url, { method: 'GET', timeoutMs: 12000 })
  if (!res.ok) {
    const err = new Error(`Nominatim HTTP ${res.status}`)
    err.status = res.status
    err.code = res.status === 429 ? 'unavailable' : 'unavailable'
    throw err
  }
  const hit = Array.isArray(data) ? data[0] : null
  const box = hit?.boundingbox
  if (!box || box.length < 4) {
    const err = new Error('Nominatim não encontrou bounding box para a cidade informada.')
    err.status = 404
    err.code = 'skipped'
    throw err
  }
  const south = Number(box[0])
  const north = Number(box[1])
  const west = Number(box[2])
  const east = Number(box[3])
  if (![south, north, west, east].every((n) => Number.isFinite(n))) {
    const err = new Error('Bounding box inválida retornada pelo Nominatim.')
    err.status = 502
    err.code = 'unavailable'
    throw err
  }
  const value = { south, west, north, east, displayName: hit.display_name || q }
  cacheSet(cacheKey, value)
  return value
}

function buildSelectors(filtros) {
  const set = new Set()
  const fromSegment = SEGMENT_SELECTORS[filtros.segmento] || []
  fromSegment.forEach((s) => set.add(s))
  const blob = `${filtros.palavraChave} ${filtros.nomeEmpresa} ${filtros.segmento}`
  for (const row of KEYWORD_SELECTORS) {
    if (row.test.test(blob)) row.selectors.forEach((s) => set.add(s))
  }
  if (set.size === 0) {
    if (!filtros.palavraChave && !filtros.nomeEmpresa && !filtros.segmento) {
      return []
    }
    set.add('nwr["amenity"]')
    set.add('nwr["shop"]')
    set.add('nwr["office"]')
  }
  return Array.from(set)
}

function buildOverpassQuery(filtros, bbox) {
  const nameNeedle = escapeOverpassRegex(filtros.palavraChave || filtros.nomeEmpresa)
  const nameFilter = nameNeedle ? `["name"~"${nameNeedle}",i]` : '["name"]'
  const selectors = buildSelectors(filtros)
  const bboxClause = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
  const union = selectors.map((sel) => `  ${sel}${nameFilter}${bboxClause};`).join('\n')
  return `[out:json][timeout:25];\n(\n${union}\n);\nout center tags;`
}

function tag(tags, key) {
  if (!tags || typeof tags !== 'object') return ''
  return String(tags[key] || tags[`contact:${key}`] || '').trim()
}

function mapElement(el, filtros) {
  const tags = el.tags || {}
  const nome = tag(tags, 'name')
  if (!nome) return null
  const type = el.type === 'way' || el.type === 'relation' || el.type === 'node' ? el.type : 'node'
  const osmId = `${type}/${el.id}`
  const lat = el.lat ?? el.center?.lat ?? null
  const lng = el.lon ?? el.center?.lon ?? null
  const street = tag(tags, 'addr:street')
  const number = tag(tags, 'addr:housenumber')
  const endereco =
    tag(tags, 'addr:full') ||
    [street, number].filter(Boolean).join(', ') ||
    tag(tags, 'addr:place')
  const website = tag(tags, 'website') || tag(tags, 'contact:website') || tag(tags, 'url')
  const telefone = tag(tags, 'phone') || tag(tags, 'contact:phone') || tag(tags, 'mobile')
  const tipos = ['amenity', 'shop', 'office', 'healthcare', 'leisure']
    .map((k) => (tags[k] ? `${k}=${tags[k]}` : ''))
    .filter(Boolean)
  return {
    osmId,
    nome,
    endereco,
    telefone,
    website,
    tipos,
    lat: lat == null ? null : Number(lat),
    lng: lng == null ? null : Number(lng),
    cidade: tag(tags, 'addr:city') || filtros.cidade,
    estado: (tag(tags, 'addr:state') || filtros.estado).toUpperCase(),
    bairro: tag(tags, 'addr:suburb') || filtros.bairro,
    cep: String(tag(tags, 'addr:postcode') || filtros.cep || '').replace(/\D/g, ''),
    source: 'openstreetmap',
    attribution: '© OpenStreetMap contributors',
  }
}

async function overpassQuery(query, attempt = 0) {
  const endpoint = OVERPASS_ENDPOINTS[Math.min(attempt, OVERPASS_ENDPOINTS.length - 1)]
  const { res, data, text } = await fetchFixed(endpoint, {
    method: 'POST',
    timeoutMs: 28000,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if ((res.status === 429 || res.status >= 500) && attempt < 1) {
    await sleep(800)
    return overpassQuery(query, attempt + 1)
  }
  if (!res.ok) {
    const classified = classifyOverpassError(res.status, text.slice(0, 180))
    const err = new Error(classified.hint)
    err.status = res.status
    err.code = classified.code
    throw err
  }
  if (!data || !Array.isArray(data.elements)) {
    const err = new Error('Resposta Overpass inválida.')
    err.status = 502
    err.code = 'error'
    throw err
  }
  return data
}

async function runSearch(filtros, limite) {
  const started = Date.now()
  const bbox = await geocodeBbox(filtros)
  const selectors = buildSelectors(filtros)
  if (selectors.length === 0) {
    const err = new Error('Informe segmento ou palavra-chave para buscar no OpenStreetMap.')
    err.status = 400
    err.code = 'skipped'
    throw err
  }
  const query = buildOverpassQuery(filtros, bbox)
  const data = await overpassQuery(query)
  const seen = new Set()
  const places = []
  for (const el of data.elements || []) {
    const mapped = mapElement(el, filtros)
    if (!mapped || seen.has(mapped.osmId)) continue
    seen.add(mapped.osmId)
    places.push(mapped)
    if (places.length >= limite) break
  }
  return {
    query: [filtros.palavraChave, filtros.segmento, filtros.cidade, filtros.estado].filter(Boolean).join(' '),
    overpassQuery: query,
    bbox,
    places,
    tempoMs: Date.now() - started,
    attribution: '© OpenStreetMap contributors',
  }
}

async function healthCheck() {
  const started = Date.now()
  const query = '[out:json][timeout:8];node(1);out;'
  await overpassQuery(query)
  return { tempoMs: Date.now() - started }
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const action = String(req.query.action || body.action || 'search')
  const empresaId = sanitizeEmpresaId(body.empresaId || req.query.empresaId)

  try {
    if (!empresaId) {
      res.status(400).json({ error: 'empresaId_required', source: 'openstreetmap' })
      return
    }
    await verifyTenant(req, empresaId)

    if (action === 'health') {
      try {
        const health = await healthCheck()
        res.status(200).json({
          ok: true,
          source: 'openstreetmap',
          api: 'Overpass / Nominatim',
          status: 'online',
          message: 'OpenStreetMap / Overpass STATUS: Ativo',
          tempoMs: health.tempoMs,
        })
      } catch (e) {
        const classified = classifyOverpassError(e.status, e.message)
        res.status(200).json({
          ok: false,
          source: 'openstreetmap',
          api: 'Overpass / Nominatim',
          status: classified.code,
          errorCode: e.code || classified.code,
          message: classified.hint,
        })
      }
      return
    }

    const filtros = pickFiltros(body.filtros)
    const limite = Math.min(80, Math.max(1, Number(body.limite) || 40))
    const result = await runSearch(filtros, limite)

    logger.info('overpass search ok', {
      empresaId,
      query: result.query,
      returned: result.places.length,
      tempoMs: result.tempoMs,
    })

    res.status(200).json({
      ok: true,
      source: 'openstreetmap',
      query: result.query,
      returned: result.places.length,
      tempoMs: result.tempoMs,
      attribution: result.attribution,
      places: result.places,
    })
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500
    const classified = classifyOverpassError(status, e.message)
    const code = e.code || classified.code
    logger.warn('overpass search skipped', { message: e.message, status, code })
    res.status(status >= 500 ? 200 : status === 401 || status === 403 ? status : 200).json({
      ok: false,
      error: code,
      errorCode: code,
      source: 'openstreetmap',
      status: code,
      message: classified.hint,
      details: null,
    })
  }
}

module.exports = { handler }
