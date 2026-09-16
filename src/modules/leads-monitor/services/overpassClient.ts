/**
 * Cliente OSM: Nominatim + Overpass direto no browser (sem Cloud Function / sem Billing).
 * URLs fixas. Sem scraping. © OpenStreetMap contributors
 */
import {
  OVERPASS_ENDPOINTS,
  OVERPASS_HEALTH_QUERY,
  OSM_ATTRIBUTION,
  buildNominatimUrl,
  buildOverpassQuery,
  buildSelectors,
  mapOsmElements,
  parseNominatimBbox,
  pickOsmFiltros,
  type OsmBbox,
  type OsmFiltros,
  type OsmMappedPlace,
} from './osmQuery'

export class OverpassConnectorError extends Error {
  code: string
  status?: number
  constructor(message: string, code: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export type OsmPlace = OsmMappedPlace

const BBOX_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const bboxCache = new Map<string, { at: number; value: OsmBbox }>()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function classifyClientError(httpStatus: number | undefined, message: string): { code: string; hint: string } {
  const lower = `${message}`.toLowerCase()
  if (/failed to fetch|networkerror|cors|cross-origin|load failed/i.test(lower)) {
    return { code: 'unavailable', hint: 'OpenStreetMap/Overpass indisponível no navegador (rede ou CORS).' }
  }
  if (httpStatus === 429 || /429|rate limit/.test(lower)) {
    return { code: 'unavailable', hint: 'Overpass/Nominatim rate limit (429).' }
  }
  if ((httpStatus && httpStatus >= 500) || /5\d\d/.test(lower)) {
    return { code: 'unavailable', hint: `Serviço OSM HTTP ${httpStatus || '5xx'}.` }
  }
  if (/timeout|aborted|abort|timed out/i.test(lower)) {
    return { code: 'unavailable', hint: 'Timeout ao consultar OpenStreetMap/Overpass.' }
  }
  if (/cidade|bounding box|palavra-chave|segmento/i.test(lower)) {
    return { code: 'skipped', hint: message }
  }
  return { code: 'unavailable', hint: message || 'OpenStreetMap indisponível.' }
}

function wrapError(e: any, fallback: string): OverpassConnectorError {
  if (e instanceof OverpassConnectorError) return e
  const classified = classifyClientError(e?.status, e?.message || fallback)
  return new OverpassConnectorError(classified.hint, e?.code || classified.code, e?.status)
}

function cacheGet(key: string): OsmBbox | null {
  const row = bboxCache.get(key)
  if (!row) return null
  if (Date.now() - row.at > BBOX_CACHE_TTL_MS) {
    bboxCache.delete(key)
    return null
  }
  return row.value
}

function cacheSet(key: string, value: OsmBbox) {
  if (bboxCache.size > 200) {
    const first = bboxCache.keys().next().value
    if (first) bboxCache.delete(first)
  }
  bboxCache.set(key, { at: Date.now(), value })
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<{ status: number; data: any; text: string }> {
  const allowed =
    url.startsWith('https://nominatim.openstreetmap.org/search?') ||
    OVERPASS_ENDPOINTS.includes(url as (typeof OVERPASS_ENDPOINTS)[number])
  if (!allowed) {
    throw new OverpassConnectorError('endpoint_not_allowed', 'error', 400)
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    const text = await res.text()
    let data: any = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text.slice(0, 200) }
    }
    return { status: res.status, data, text }
  } catch (e: any) {
    throw wrapError(e, e?.message || 'Falha de rede ao consultar OSM.')
  } finally {
    clearTimeout(t)
  }
}

async function geocodeBbox(filtros: OsmFiltros): Promise<OsmBbox> {
  if (!filtros.cidade) {
    throw new OverpassConnectorError('Informe cidade (e UF) para buscar no OpenStreetMap.', 'skipped', 400)
  }
  const cacheKey = [filtros.cep, filtros.bairro, filtros.cidade, filtros.estado].filter(Boolean).join('|').toLowerCase()
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const url = buildNominatimUrl(filtros)
  const { status, data } = await fetchJson(url, { method: 'GET', headers: { Accept: 'application/json' } }, 12000)
  if (status === 429 || status >= 500) {
    throw new OverpassConnectorError(`Nominatim HTTP ${status}`, 'unavailable', status)
  }
  if (status < 200 || status >= 300) {
    throw new OverpassConnectorError(`Nominatim HTTP ${status}`, status === 404 ? 'skipped' : 'unavailable', status)
  }
  const bbox = parseNominatimBbox(data, [filtros.cidade, filtros.estado].join(' '))
  cacheSet(cacheKey, bbox)
  return bbox
}

function canTryFallback(attempt: number): boolean {
  return attempt < OVERPASS_ENDPOINTS.length - 1
}

function isHttpRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

function isTransportRetryable(e: any): boolean {
  if (e instanceof OverpassConnectorError && e.code === 'skipped') return false
  const status = Number(e?.status)
  if (Number.isFinite(status) && status >= 400 && status < 500 && status !== 429) return false
  const msg = `${e?.name || ''} ${e?.message || ''} ${e?.code || ''}`
  return /timeout|aborted|abort|timed out|failed to fetch|networkerror|cors|indisponível|unavailable/i.test(msg)
}

function logOverpass(event: string, detail: Record<string, unknown>) {
  console.info(`[leads-monitor][osm] ${event}`, detail)
}

async function overpassQuery(
  query: string,
  attempt = 0
): Promise<{ elements: unknown[]; endpoint: string; fallbackUsed: boolean }> {
  const endpoint = OVERPASS_ENDPOINTS[Math.min(attempt, OVERPASS_ENDPOINTS.length - 1)]
  const t0 = Date.now()
  const fallbackUsed = attempt > 0
  let failMotivo = ''
  let failStatus: number | undefined

  try {
    logOverpass(attempt === 0 ? 'primario' : 'fallback', { endpoint, attempt })
    const { status, data, text } = await fetchJson(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      },
      28000
    )
    const tempoMs = Date.now() - t0
    if (isHttpRetryable(status)) {
      failMotivo = `HTTP ${status}`
      failStatus = status
    } else if (status < 200 || status >= 300) {
      failMotivo = text.slice(0, 180) || `HTTP ${status}`
      failStatus = status
    } else if (!data || !Array.isArray(data.elements)) {
      failMotivo = 'resposta inválida'
      failStatus = 502
    } else {
      logOverpass('ok', {
        endpoint,
        tempoMs,
        elementos: data.elements.length,
        fallbackAcionado: fallbackUsed,
      })
      return { elements: data.elements, endpoint, fallbackUsed }
    }
  } catch (e: any) {
    failMotivo = e?.message || String(e)
    failStatus = e?.status
    if (e instanceof OverpassConnectorError && e.code === 'skipped') throw e
  }

  const tempoMs = Date.now() - t0
  const retryable =
    isHttpRetryable(Number(failStatus) || 0) ||
    isTransportRetryable({ message: failMotivo, status: failStatus, code: 'unavailable' })
  if (retryable && canTryFallback(attempt)) {
    logOverpass('falha', {
      endpoint,
      motivo: failMotivo,
      tempoMs,
      fallbackAcionado: true,
      fallbackEndpoint: OVERPASS_ENDPOINTS[attempt + 1],
    })
    await sleep(800)
    return overpassQuery(query, attempt + 1)
  }
  logOverpass('falha', { endpoint, motivo: failMotivo, tempoMs, fallbackAcionado: false })
  throw new OverpassConnectorError(
    failMotivo || 'Falha ao consultar Overpass.',
    'unavailable',
    failStatus
  )
}

export async function overpassHealth(_empresaId?: string): Promise<{
  ok: boolean
  status: string
  message: string
  errorCode?: string
}> {
  try {
    await overpassQuery(OVERPASS_HEALTH_QUERY)
    return {
      ok: true,
      status: 'online',
      message: 'OpenStreetMap / Overpass STATUS: Ativo',
    }
  } catch (e: any) {
    const err = wrapError(e, 'OpenStreetMap indisponível')
    return {
      ok: false,
      status: 'unavailable',
      errorCode: err.code,
      message: err.message,
    }
  }
}

export async function overpassSearch(opts: {
  empresaId: string
  filtros: Record<string, unknown>
  limite?: number
}): Promise<{ query: string; places: OsmPlace[]; returned: number; tempoMs: number; attribution?: string }> {
  const started = Date.now()
  try {
    const filtros = pickOsmFiltros(opts.filtros)
    const limite = Math.min(80, Math.max(1, Number(opts.limite) || 40))
    const selectors = buildSelectors(filtros)
    if (selectors.length === 0) {
      throw new OverpassConnectorError(
        'Informe segmento ou palavra-chave para buscar no OpenStreetMap.',
        'skipped',
        400
      )
    }
    const bbox = await geocodeBbox(filtros)
    const ql = buildOverpassQuery(filtros, bbox)
    const data = await overpassQuery(ql)
    const places = mapOsmElements(data.elements || [], filtros, limite)
    const tempoMs = Date.now() - started
    logOverpass('busca', {
      endpoint: data.endpoint,
      fallbackAcionado: data.fallbackUsed,
      tempoMs,
      elementos: (data.elements || []).length,
      mapeados: places.length,
    })
    return {
      query: [filtros.palavraChave, filtros.segmento, filtros.cidade, filtros.estado].filter(Boolean).join(' '),
      places,
      returned: places.length,
      tempoMs,
      attribution: OSM_ATTRIBUTION,
    }
  } catch (e: any) {
    throw wrapError(e, 'OpenStreetMap/Overpass indisponível. O Monitor continua com as demais fontes.')
  }
}
