/**
 * OpenStreetMap / Overpass — descoberta padrão (sem Google Billing).
 */
import type { IConnector, ConnectorFetchContext, ConnectorRawRecord, NormalizedLead } from './types'
import { overpassSearch, OverpassConnectorError } from '../services/overpassClient'
import { formatPhoneBr, hostnameFromUrl, normalizeCep, normalizeCompanyName } from '../pipeline/normalizeFields'

export const openStreetMapConnector: IConnector = {
  meta: {
    id: 'openstreetmap',
    label: 'OpenStreetMap / Overpass',
    descricao:
      'Busca estabelecimentos via OpenStreetMap (Nominatim + Overpass no cliente). Fonte padrão, sem billing Google. © OpenStreetMap contributors',
    autorizado: true,
    enabled: true,
    version: '1.0.0',
    versao: '1.0.0',
    apiVersion: 1,
    tiposSuportados: ['empresa'],
    docsUrl: 'https://www.openstreetmap.org/copyright',
  },

  async fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    const limite = Math.min(80, Math.max(1, ctx.limite || 40))
    try {
      const result = await overpassSearch({
        empresaId: ctx.empresaId,
        filtros: ctx.filtros as unknown as Record<string, unknown>,
        limite,
        signal: ctx.signal,
      })
      return result.places.map((place) => ({
        externalId: place.osmId,
        fetchedAt: new Date().toISOString(),
        payload: { ...place, _query: result.query, _tempoMs: result.tempoMs },
      }))
    } catch (e: any) {
      if (e?.name === 'SearchCancelledError') throw e
      const message =
        e?.message ||
        'OpenStreetMap/Overpass indisponível. O Monitor continua com as demais fontes.'
      const code = String(e?.code || 'unavailable')
      throw new OverpassConnectorError(message, code, e?.status)
    }
  },

  normalize(raw: ConnectorRawRecord, ctx: ConnectorFetchContext): NormalizedLead | null {
    const p = raw.payload || {}
    const nome = normalizeCompanyName(String(p.nome || ''))
    if (!nome) return null
    const osmId = String(p.osmId || raw.externalId || '')
    const website = String(p.website || '')
    const dominio = hostnameFromUrl(website)
    const telefone = formatPhoneBr(String(p.telefone || ''))
    const cep = normalizeCep(String(p.cep || ctx.filtros.cep || ''))
    const cidade = String(p.cidade || ctx.filtros.cidade || '')
    const estado = String(p.estado || ctx.filtros.estado || '').toUpperCase()
    const endereco = String(p.endereco || '')
    const tipos = Array.isArray(p.tipos) ? p.tipos.map(String) : []

    return {
      connectorId: 'openstreetmap',
      connectorVersion: '1.0.0',
      connectorApiVersion: 1,
      origemLabel: 'OpenStreetMap / Overpass',
      dedupeKey: osmId ? `place:osm:${osmId}` : '',
      tipo: 'empresa',
      nome,
      telefone: telefone || undefined,
      cidade,
      estado,
      segmento: ctx.filtros.segmento || tipos[0] || '',
      palavraChaveMatch: ctx.filtros.palavraChave || undefined,
      empresaNome: nome,
      website: website || undefined,
      endereco,
      cep: cep || undefined,
      placeId: osmId ? `osm:${osmId}` : undefined,
      dominio: dominio || undefined,
      consentimentoLgpd: true,
      baseLegal: '',
      observacoes: endereco || undefined,
      externalId: osmId || undefined,
      employeeCount: null,
      employeeCountRange: null,
      employeeCountFonte: null,
      employeeCountStatus: 'nao_informada',
      metadados: {
        osmId,
        tipos,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        bairro: p.bairro || ctx.filtros.bairro || '',
        origem: 'openstreetmap',
        source: 'openstreetmap',
        origemDado: 'OSM',
        fonteDado: 'OpenStreetMap / Overpass',
        finalidadeTratamento: 'Prospecção comercial B2B',
        attribution: String(p.attribution || '© OpenStreetMap contributors'),
        contextoProspeccao: ctx.filtros.palavraChave || '',
        employeeCountStatus: 'nao_informada',
      },
    }
  },
}
