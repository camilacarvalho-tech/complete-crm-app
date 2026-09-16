/**
 * Cliente da Function leadsMonitorPlacesSearch.
 * Nunca envia nem recebe API key.
 * Google Places é opcional: falhas de billing/quota/credencial não derrubam o Monitor.
 */
import { auth } from '../../../firebase'

export const PLACES_OPTIONAL_SKIP = 'optional_indisponivel' as const
export const PLACES_SKIPPED = 'skipped' as const

const OPTIONAL_UNAVAILABLE_CODES = new Set([
  'needs_credentials',
  'api_key_invalid',
  'billing_ausente',
  'api_nao_habilitada',
  'quota',
  'permissao',
  'timeout',
  'places_error',
  PLACES_OPTIONAL_SKIP,
  PLACES_SKIPPED,
])

function placesSearchUrl(): string | null {
  const fromEnv =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env?.VITE_LEADS_MONITOR_PLACES_URL) ||
    ''
  if (fromEnv) return String(fromEnv).trim()
  const fromSecret =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env?.VITE_LEADS_MONITOR_SAVE_SECRET_URL) ||
    ''
  if (fromSecret) {
    return String(fromSecret).replace(/leadsMonitorSaveSecret\/?$/, 'leadsMonitorPlacesSearch')
  }
  return 'http://127.0.0.1:5001/recomece-cred-oficial/southamerica-east1/leadsMonitorPlacesSearch'
}

export function getPlacesSearchUrl(): string {
  return placesSearchUrl() || ''
}

export class PlacesConnectorError extends Error {
  code: string
  status?: number
  constructor(message: string, code: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function isPlacesOptionalUnavailable(code?: string, status?: number, message?: string): boolean {
  const blob = `${code || ''} ${message || ''}`.toLowerCase()
  if (status === 401 || status === 403 || status === 429 || status === 503) return true
  if (code && OPTIONAL_UNAVAILABLE_CODES.has(code)) return true
  if (/billing|quota|api.?key|not been (used|enabled)|permission|forbidden|resource_exhausted/i.test(blob)) {
    return true
  }
  return false
}

export function mapPlacesSkipCode(code?: string, status?: number, message?: string): string {
  if (isPlacesOptionalUnavailable(code, status, message)) return PLACES_OPTIONAL_SKIP
  return PLACES_SKIPPED
}

function classifyClientPlacesFailure(data: Record<string, unknown>, httpStatus: number): {
  code: string
  message: string
} {
  const errorCode = String(data.errorCode || data.error || '')
  const details = (data.details && typeof data.details === 'object' ? data.details : {}) as {
    googleStatus?: string | null
    message?: string | null
  }
  const message = String(
    data.message || details.message || data.error || `Places HTTP ${httpStatus}`
  )
  const blob = `${errorCode} ${details.googleStatus || ''} ${message}`.toLowerCase()

  let code = errorCode || 'places_error'
  if (httpStatus === 503 || errorCode === 'needs_credentials' || /needs_credentials/.test(blob)) {
    code = 'needs_credentials'
  } else if (httpStatus === 429 || /quota|resource_exhausted/.test(blob)) {
    code = 'quota'
  } else if (/billing/.test(blob)) {
    code = 'billing_ausente'
  } else if (/has not been used|not been enabled|service_disabled/.test(blob)) {
    code = 'api_nao_habilitada'
  } else if (httpStatus === 401 || /api.?key.*(invalid|not valid)|api_key_invalid/.test(blob)) {
    code = 'api_key_invalid'
  } else if (httpStatus === 403 || /permission|forbidden/.test(blob)) {
    code = 'permissao'
  }

  return {
    code: mapPlacesSkipCode(code, httpStatus, message),
    message,
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser
  if (!user) throw new PlacesConnectorError('Sessão expirada — faça login novamente.', 'missing_auth', 401)
  const idToken = await user.getIdToken()
  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  }
}

export async function placesHealth(empresaId: string): Promise<{
  ok: boolean
  status: string
  message: string
  errorCode?: string
  api?: string
  optional?: boolean
}> {
  try {
    const url = `${getPlacesSearchUrl()}?action=health`
    const res = await fetch(url, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ empresaId, action: 'health' }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.ok) {
      return {
        ok: true,
        status: String(data.status || 'ONLINE'),
        message: String(data.message || 'Google Places STATUS: ONLINE'),
        api: data.api || 'Places API (New)',
        optional: true,
      }
    }
    const classified = classifyClientPlacesFailure(data, res.status)
    return {
      ok: false,
      status: classified.code,
      message: classified.message || String(data.message || data.error || ''),
      errorCode: classified.code,
      api: data.api || 'Places API (New)',
      optional: true,
    }
  } catch (e: any) {
    if (e instanceof PlacesConnectorError && e.code === 'missing_auth') {
      return {
        ok: false,
        status: PLACES_SKIPPED,
        errorCode: e.code,
        message: e.message,
        api: 'Places API (New)',
        optional: true,
      }
    }
    return {
      ok: false,
      status: PLACES_OPTIONAL_SKIP,
      errorCode: 'endpoint_incorreto',
      message: e?.message || 'Endpoint da Function inacessível (emulador/URL). Google Places permanece opcional.',
      api: 'Places API (New)',
      optional: true,
    }
  }
}

export interface PlacesCompany {
  placeId: string
  nome: string
  endereco?: string
  telefone?: string
  website?: string
  dominio?: string
  tipos?: string[]
  businessStatus?: string
  lat?: number | null
  lng?: number | null
  googleMapsUri?: string
  cidade?: string
  estado?: string
  bairro?: string
  cep?: string
}

export async function placesSearch(opts: {
  empresaId: string
  filtros: Record<string, unknown>
  limite?: number
}): Promise<{ query: string; places: PlacesCompany[]; returned: number; tempoMs: number }> {
  const res = await fetch(getPlacesSearchUrl(), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      empresaId: opts.empresaId,
      filtros: opts.filtros,
      limite: opts.limite || 100,
      action: 'search',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    const classified = classifyClientPlacesFailure(data, res.status)
    throw new PlacesConnectorError(
      classified.message ||
        'Google Places indisponível (opcional). O Monitor continua com as demais fontes.',
      classified.code,
      res.status
    )
  }
  return {
    query: String(data.query || ''),
    places: Array.isArray(data.places) ? data.places : [],
    returned: Number(data.returned || 0),
    tempoMs: Number(data.tempoMs || 0),
  }
}
