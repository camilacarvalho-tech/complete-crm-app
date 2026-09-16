/**
 * Google Places Connector — busca empresas via Cloud Function (API oficial).
 * A API KEY fica só no backend.
 */
import type { IConnector, ConnectorFetchContext, ConnectorRawRecord, NormalizedLead } from './types'
import {
  mapPlacesSkipCode,
  placesSearch,
  PlacesConnectorError,
} from '../services/placesClient'
import { digitsOnly, formatPhoneBr, hostnameFromUrl, normalizeCep, normalizeCompanyName } from '../pipeline/normalizeFields'

export const googlePlacesConnector: IConnector = {
  meta: {
    id: 'google-places',
    label: 'Google Places',
    descricao:
      'Busca estabelecimentos via Google Places API (oficial, backend). Fonte opcional: billing/quota/credencial ausente não interrompe o Monitor.',
    autorizado: true,
    enabled: true,
    version: '1.1.0',
    versao: '1.1.0',
    apiVersion: 1,
    tiposSuportados: ['empresa'],
  },

  async fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    const limite = Math.min(100, Math.max(1, ctx.limite || 100))
    try {
      const result = await placesSearch({
        empresaId: ctx.empresaId,
        filtros: ctx.filtros as unknown as Record<string, unknown>,
        limite,
      })
      return result.places.map((place) => ({
        externalId: place.placeId,
        fetchedAt: new Date().toISOString(),
        payload: { ...place, _query: result.query, _tempoMs: result.tempoMs },
      }))
    } catch (e: any) {
      const message =
        e?.message ||
        'Google Places indisponível (opcional). O Monitor continua com as demais fontes.'
      const code = mapPlacesSkipCode(e?.code, e?.status, message)
      if (e instanceof PlacesConnectorError) {
        throw new PlacesConnectorError(message, code, e.status)
      }
      throw new PlacesConnectorError(message, code, e?.status)
    }
  },

  normalize(raw: ConnectorRawRecord, ctx: ConnectorFetchContext): NormalizedLead | null {
    const p = raw.payload || {}
    const nome = normalizeCompanyName(String(p.nome || ''))
    if (!nome) return null
    const placeId = String(p.placeId || raw.externalId || '')
    const website = String(p.website || '')
    const dominio = hostnameFromUrl(website) || String(p.dominio || '')
    const telefone = formatPhoneBr(String(p.telefone || ''))
    const cep = normalizeCep(String(p.cep || ctx.filtros.cep || ''))
    const cidade = String(p.cidade || ctx.filtros.cidade || '')
    const estado = String(p.estado || ctx.filtros.estado || '').toUpperCase()
    const endereco = String(p.endereco || '')
    const cnpj = digitsOnly(String(p.cnpj || ''))
    const tipos = Array.isArray(p.tipos) ? p.tipos.map(String) : []

    return {
      connectorId: 'google-places',
      connectorVersion: '1.1.0',
      connectorApiVersion: 1,
      origemLabel: 'Google Places',
      dedupeKey: '',
      tipo: 'empresa',
      nome,
      telefone: telefone || undefined,
      cidade,
      estado,
      segmento: ctx.filtros.segmento || tipos[0] || '',
      palavraChaveMatch: ctx.filtros.palavraChave || undefined,
      empresaNome: nome,
      cnpj: cnpj.length === 14 ? cnpj : undefined,
      website: website || undefined,
      endereco,
      cep: cep || undefined,
      placeId: placeId || undefined,
      dominio: dominio || undefined,
      consentimentoLgpd: true,
      baseLegal: 'Dados comerciais de estabelecimento (Google Places API)',
      observacoes: endereco || undefined,
      externalId: placeId || undefined,
      metadados: {
        placeId,
        tipos,
        businessStatus: p.businessStatus || '',
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        googleMapsUri: p.googleMapsUri || '',
        bairro: p.bairro || ctx.filtros.bairro || '',
        origem: 'google_places',
      },
    }
  },
}
