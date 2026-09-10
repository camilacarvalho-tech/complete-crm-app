/**
 * Google Places (API oficial) — busca de estabelecimentos comerciais.
 * A chave nunca vai para o cliente. Sem scraping.
 */
const admin = require('firebase-admin')
const { logger } = require('firebase-functions')

const PLACES_TEXT = 'https://places.googleapis.com/v1/places:searchText'
const PLACES_NEARBY = 'https://places.googleapis.com/v1/places:searchNearby'
const PLACES_GET = 'https://places.googleapis.com/v1/places/'

const LIST_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.types',
  'places.location',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.addressComponents',
  'nextPageToken',
].join(',')

const DETAIL_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'types',
  'location',
  'googleMapsUri',
  'businessStatus',
  'addressComponents',
].join(',')

const MASTER_EMAILS = new Set(['carvalhoduraocamila@gmail.com', 'laiane26022@gmail.com'])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function placesKey() {
  const maps = String(process.env.GOOGLE_MAPS_API_KEY || '').trim()
  const places = String(process.env.GOOGLE_PLACES_API_KEY || '').trim()
  return maps || places || null
}

function classifyPlacesError(data, httpStatus) {
  const message = String(data?.error?.message || data?.error || data?.message || '')
  const status = String(data?.error?.status || '')
  const lower = `${status} ${message}`.toLowerCase()
  if (!placesKey()) {
    return { code: 'needs_credentials', hint: 'API key ausente no backend (GOOGLE_MAPS_API_KEY).' }
  }
  if (httpStatus === 401 || /api.?key.*(invalid|not valid)/i.test(lower) || /api_key_invalid/.test(lower)) {
    return { code: 'api_key_invalid', hint: 'API key inválida.' }
  }
  if (/billing/i.test(lower) || /billing_not_enabled/.test(lower)) {
    return { code: 'billing_ausente', hint: 'Billing ausente no Google Cloud.' }
  }
  if (/has not been used|api has not been enabled|service_disabled|not been enabled/i.test(lower)) {
    return { code: 'api_nao_habilitada', hint: 'Places API (New) não habilitada no projeto.' }
  }
  if (httpStatus === 429 || /resource_exhausted|quota/i.test(lower)) {
    return { code: 'quota', hint: 'Quota/rate limit da Places API.' }
  }
  if (/permission|forbidden|403/.test(lower) || httpStatus === 403) {
    return { code: 'permissao', hint: 'Permissão insuficiente para a Places API (New).' }
  }
  if (/timeout|aborted|abort/.test(lower)) {
    return { code: 'timeout', hint: 'Timeout ao chamar Google Places.' }
  }
  return { code: 'places_error', hint: message || `HTTP ${httpStatus || 'erro'}` }
}

function stripSecrets(meta) {
  if (!meta || typeof meta !== 'object') return meta
  const out = { ...meta }
  for (const k of Object.keys(out)) {
    if (/key|secret|token|authorization/i.test(k)) delete out[k]
  }
  return out
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

async function googFetch(url, { method, body, fieldMask, timeoutMs, attempt = 0 }) {
  const key = placesKey()
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 20000)
  try {
    const res = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 429 || res.status === 503) {
      if (attempt >= 3) {
        const err = new Error('rate_limit')
        err.status = 429
        err.payload = data
        throw err
      }
      await sleep(400 * Math.pow(2, attempt))
      return googFetch(url, { method, body, fieldMask, timeoutMs, attempt: attempt + 1 })
    }
    if (!res.ok) {
      const classified = classifyPlacesError(data, res.status)
      const err = new Error(classified.hint)
      err.status = res.status
      err.code = classified.code
      err.payload = { status: res.status, googleStatus: data?.error?.status || null, message: data?.error?.message || null }
      throw err
    }
    return data
  } finally {
    clearTimeout(t)
  }
}

function component(components, type) {
  const list = Array.isArray(components) ? components : []
  const hit = list.find((c) => Array.isArray(c.types) && c.types.includes(type))
  return hit?.shortText || hit?.longText || hit?.short_name || hit?.long_name || ''
}

function mapPlace(place) {
  const id = String(place.id || '').replace(/^places\//, '')
  const addressComponents = place.addressComponents || []
  const website = place.websiteUri || ''
  let dominio = ''
  try {
    if (website) dominio = new URL(website).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    dominio = ''
  }
  return {
    placeId: id,
    nome: place.displayName?.text || place.displayName || '',
    endereco: place.formattedAddress || '',
    telefone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
    website,
    dominio,
    tipos: Array.isArray(place.types) ? place.types : [],
    businessStatus: place.businessStatus || '',
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    googleMapsUri: place.googleMapsUri || '',
    cidade: component(addressComponents, 'administrative_area_level_2') || component(addressComponents, 'locality'),
    estado: component(addressComponents, 'administrative_area_level_1'),
    bairro: component(addressComponents, 'sublocality') || component(addressComponents, 'sublocality_level_1'),
    cep: String(component(addressComponents, 'postal_code') || '').replace(/\D/g, ''),
    pais: component(addressComponents, 'country'),
  }
}

function buildQuery(filtros) {
  const f = filtros || {}
  const segmentoLabels = {
    clinicas: 'clínicas',
    inss: 'correspondente bancário',
    credito_clt: 'empresa',
    emprestimo: 'empresa',
    consignado: 'correspondente bancário',
    fgts: 'correspondente bancário',
    cartao: 'empresa',
    empresa_b2b: 'empresa',
    corban: 'correspondente bancário',
  }
  const parts = [
    f.palavraChave,
    f.nomeEmpresa,
    segmentoLabels[f.segmento] || f.segmento,
    f.bairro,
    f.cidade,
    f.estado,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  return parts.join(' ').trim() || 'empresas Brasil'
}

async function searchText(query, pageToken, maxResultCount) {
  const body = {
    textQuery: query,
    languageCode: 'pt-BR',
    regionCode: 'BR',
    maxResultCount: Math.min(20, Math.max(1, maxResultCount || 20)),
  }
  if (pageToken) body.pageToken = pageToken
  return googFetch(PLACES_TEXT, { method: 'POST', body, fieldMask: LIST_MASK, timeoutMs: 20000 })
}

async function nearbyIfPossible(placeSample, filtros, remaining) {
  if (!placeSample?.lat || !placeSample?.lng || remaining <= 0) return []
  const radius = filtros?.bairro || filtros?.cep ? 3000 : 8000
  try {
    const data = await googFetch(PLACES_NEARBY, {
      method: 'POST',
      body: {
        languageCode: 'pt-BR',
        regionCode: 'BR',
        maxResultCount: Math.min(20, remaining),
        includedTypes: ['establishment'],
        locationRestriction: {
          circle: {
            center: { latitude: placeSample.lat, longitude: placeSample.lng },
            radius,
          },
        },
      },
      fieldMask: LIST_MASK,
      timeoutMs: 20000,
    })
    return Array.isArray(data.places) ? data.places : []
  } catch (e) {
    logger.warn('places nearby skipped', { message: e.message })
    return []
  }
}

async function fillDetails(mapped, budget) {
  const missing = mapped.filter((p) => p.placeId && (!p.telefone || !p.website)).slice(0, budget)
  for (const item of missing) {
    try {
      await sleep(250)
      const data = await googFetch(`${PLACES_GET}${encodeURIComponent(item.placeId)}`, {
        method: 'GET',
        fieldMask: DETAIL_MASK,
        timeoutMs: 15000,
      })
      const extra = mapPlace(data)
      if (!item.telefone && extra.telefone) item.telefone = extra.telefone
      if (!item.website && extra.website) {
        item.website = extra.website
        item.dominio = extra.dominio
      }
      if (!item.endereco && extra.endereco) item.endereco = extra.endereco
    } catch (e) {
      logger.warn('place details skipped', { placeId: item.placeId, message: e.message })
    }
  }
  return mapped
}

async function runSearch(filtros, limite) {
  const started = Date.now()
  const max = Math.min(100, Math.max(1, Number(limite) || 100))
  const query = buildQuery(filtros)
  const seen = new Set()
  const places = []
  let pageToken = ''
  let pages = 0
  let errors = []

  while (places.length < max && pages < (max <= 20 ? 1 : 5)) {
    pages += 1
    const data = await searchText(query, pageToken, Math.min(20, max - places.length))
    const batch = Array.isArray(data.places) ? data.places : []
    for (const raw of batch) {
      const mapped = mapPlace(raw)
      if (!mapped.placeId || seen.has(mapped.placeId)) continue
      seen.add(mapped.placeId)
      places.push(mapped)
      if (places.length >= max) break
    }
    pageToken = data.nextPageToken || ''
    if (!pageToken || places.length >= max) break
    await sleep(2100)
  }

  if (places.length < max && max > 10 && places[0]?.lat && places[0]?.lng) {
    const extra = await nearbyIfPossible(places[0], filtros, max - places.length)
    for (const raw of extra) {
      const mapped = mapPlace(raw)
      if (!mapped.placeId || seen.has(mapped.placeId)) continue
      seen.add(mapped.placeId)
      places.push(mapped)
      if (places.length >= max) break
    }
  }

  const missingBoth = places.filter((p) => !p.telefone && !p.website)
  const detailsBudget = Math.min(2, missingBoth.length)
  await fillDetails(missingBoth, detailsBudget)

  return {
    query,
    places,
    pages,
    tempoMs: Date.now() - started,
    errors,
  }
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
  const empresaId = String(body.empresaId || req.query.empresaId || '')

  try {
    if (!empresaId) {
      res.status(400).json({ error: 'empresaId_required' })
      return
    }
    await verifyTenant(req, empresaId)

    const configured = Boolean(placesKey())
    if (action === 'health') {
      if (!configured) {
        res.status(200).json({
          ok: false,
          source: 'google_places',
          api: 'Places API (New)',
          status: 'OFFLINE',
          errorCode: 'needs_credentials',
          message: 'GOOGLE_MAPS_API_KEY não configurada no backend (functions/.env ou Secret Manager).',
        })
        return
      }
      try {
        await googFetch(PLACES_TEXT, {
          method: 'POST',
          body: {
            textQuery: 'clínica São Paulo SP',
            languageCode: 'pt-BR',
            regionCode: 'BR',
            maxResultCount: 1,
          },
          fieldMask: 'places.id',
          timeoutMs: 12000,
        })
        res.status(200).json({
          ok: true,
          source: 'google_places',
          api: 'Places API (New)',
          status: 'ONLINE',
          message: 'Google Places STATUS: ONLINE',
        })
      } catch (e) {
        const classified = classifyPlacesError(e.payload || { error: { message: e.message } }, e.status)
        res.status(200).json({
          ok: false,
          source: 'google_places',
          api: 'Places API (New)',
          status: 'OFFLINE',
          errorCode: e.code || classified.code,
          message: classified.hint,
        })
      }
      return
    }

    if (!configured) {
      res.status(503).json({
        error: 'needs_credentials',
        source: 'google_places',
        message:
          'GOOGLE_MAPS_API_KEY não configurada. Crie a chave no Google Cloud (Places API New), ative faturamento e defina o secret/env da Function. Sem isso a busca real não roda.',
      })
      return
    }

    const filtros = body.filtros && typeof body.filtros === 'object' ? body.filtros : {}
    const limite = Math.min(100, Math.max(1, Number(body.limite) || 100))
    const result = await runSearch(filtros, limite)

    logger.info('places search ok', {
      empresaId,
      query: result.query,
      returned: result.places.length,
      pages: result.pages,
      tempoMs: result.tempoMs,
    })

    res.status(200).json({
      ok: true,
      source: 'google_places',
      query: result.query,
      returned: result.places.length,
      tempoMs: result.tempoMs,
      places: result.places,
    })
  } catch (e) {
    const status = e.status || 500
    logger.error('places search error', { message: e.message, status, code: e.code || null })
    res.status(status).json({
      error: e.message || 'internal',
      source: 'google_places',
      details: stripSecrets(e.payload) || null,
    })
  }
}

module.exports = { handler, placesKey }
