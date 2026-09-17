/**
 * Fontes de captura por campanha (pesquisa salva).
 * IBGE não entra aqui — é referência geográfica, não fonte de leads.
 */
export const FONTES_CAPTURA_CAMPANHA = [
  { id: 'openstreetmap', label: 'OpenStreetMap', connectorId: 'openstreetmap' },
  { id: 'google_places', label: 'Google Places', connectorId: 'google-places' },
  { id: 'csv', label: 'CSV', connectorId: 'csv-import' },
  { id: 'webhook', label: 'Webhook', connectorId: 'webhook' },
  { id: 'api_externa', label: 'API externa', connectorId: 'integracao_api' },
] as const

export type FonteCapturaCampanhaId = (typeof FONTES_CAPTURA_CAMPANHA)[number]['id']

const ALIAS_TO_CONNECTOR: Record<string, string> = {
  openstreetmap: 'openstreetmap',
  osm: 'openstreetmap',
  google_places: 'google-places',
  'google-places': 'google-places',
  googleplaces: 'google-places',
  csv: 'csv-import',
  'csv-import': 'csv-import',
  csv_import: 'csv-import',
  webhook: 'webhook',
  api_externa: 'integracao_api',
  integracao_api: 'integracao_api',
  'integracao-api': 'integracao_api',
}

export function canonicalizeConnectorId(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const key = raw.toLowerCase().replace(/\s+/g, '_')
  return ALIAS_TO_CONNECTOR[key] || ALIAS_TO_CONNECTOR[raw] || raw
}

/**
 * Lista vazia / ausente = comportamento legado (todas as runnables).
 * Lista preenchida = somente conectores canônicos correspondentes.
 */
export function filterConnectorsByCampanha<T extends { meta: { id: string } }>(
  connectors: T[],
  fontesHabilitadas?: string[] | null
): T[] {
  const selected = Array.from(
    new Set((fontesHabilitadas || []).map(canonicalizeConnectorId).filter(Boolean))
  )
  if (!selected.length) return connectors
  return connectors.filter((c) => selected.includes(canonicalizeConnectorId(c.meta.id)))
}

export function connectorIdsExecutados<T extends { meta: { id: string } }>(connectors: T[]): string[] {
  return connectors.map((c) => c.meta.id)
}
