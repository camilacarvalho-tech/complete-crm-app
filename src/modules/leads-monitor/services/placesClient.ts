/**
 * Cliente da Function leadsMonitorPlacesSearch.
 * Nunca envia nem recebe API key.
 */
import { auth } from '../../../firebase'

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
}> {
  try {
    const url = `${getPlacesSearchUrl()}?action=health`
    const res = await fetch(url, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ empresaId, action: 'health' }),
    })
    const data = await res.json().catch(() => ({}))
    return {
      ok: Boolean(data.ok),
      status: String(data.status || (data.ok ? 'ONLINE' : 'OFFLINE')),
      message: String(data.message || data.error || ''),
      errorCode: data.errorCode,
      api: data.api || 'Places API (New)',
    }
  } catch (e: any) {
    return {
      ok: false,
      status: 'OFFLINE',
      errorCode: 'endpoint_incorreto',
      message: e?.message || 'Endpoint da Function inacessível (emulador/URL).',
      api: 'Places API (New)',
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
  if (res.status === 503 || data.error === 'needs_credentials') {
    throw new PlacesConnectorError(
      data.message ||
        'Google Places ainda não está configurado. Defina GOOGLE_MAPS_API_KEY no backend (Functions).',
      'needs_credentials',
      503
    )
  }
  if (!res.ok) {
    throw new PlacesConnectorError(
      data.message || data.error || `Places HTTP ${res.status}`,
      String(data.error || 'places_error'),
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
