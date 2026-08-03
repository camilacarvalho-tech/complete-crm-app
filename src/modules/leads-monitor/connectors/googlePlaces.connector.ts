/**
 * Conector Google Places API V1.0 — busca real de empresas via Google Places Text Search.
 * Baseado em APIs oficiais Google, sem scraping. Respeita LGPD (dados públicos empresariais).
 */
import type {
  ConnectorFetchContext,
  ConnectorRawRecord,
  IConnector,
  NormalizedLead,
} from './types'

interface GooglePlacesResponse {
  results?: Array<{
    place_id: string
    name: string
    formatted_address?: string
    formatted_phone_number?: string
    international_phone_number?: string
    website?: string
    geometry?: {
      location: {
        lat: number
        lng: number
      }
    }
    types?: string[]
    business_status?: string
  }>
  status?: string
  error_message?: string
}

interface GooglePlacesDetailsResponse {
  result?: {
    place_id: string
    name: string
    formatted_address?: string
    formatted_phone_number?: string
    international_phone_number?: string
    website?: string
    geometry?: {
      location: {
        lat: number
        lng: number
      }
    }
    types?: string[]
    business_status?: string
    opening_hours?: {
      periods?: Array<{
        open?: { day: number; time: string }
        close?: { day: number; time: string }
      }>
    }
  }
  status?: string
  error_message?: string
}

async function fetchGooglePlaces(
  apiKey: string,
  query: string,
  location?: string,
  radius?: number
): Promise<GooglePlacesResponse> {
  const params = new URLSearchParams({
    key: apiKey,
    query: query,
    fields: 'place_id,name,formatted_address,formatted_phone_number,website,geometry,types,business_status',
    language: 'pt-BR',
  })

  if (location) {
    params.append('location', location)
  }
  if (radius) {
    params.append('radius', String(radius))
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function fetchPlaceDetails(
  apiKey: string,
  placeId: string
): Promise<GooglePlacesDetailsResponse> {
  const params = new URLSearchParams({
    key: apiKey,
    place_id: placeId,
    fields: 'place_id,name,formatted_address,formatted_phone_number,website,geometry,types,business_status,opening_hours',
    language: 'pt-BR',
  })

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error(`Google Places Details API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function extractCityFromAddress(address: string): string {
  const parts = address.split(',')
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2].trim()
    return cityPart.split('-')[0].trim()
  }
  return ''
}

function extractStateFromAddress(address: string): string {
  const parts = address.split(',')
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim()
    const stateMatch = lastPart.match(/\b([A-Z]{2})\b/)
    return stateMatch ? stateMatch[1] : ''
  }
  return ''
}

function parseTelefone(telefone?: string): string | undefined {
  if (!telefone) return undefined
  // Remove formatação e mantém apenas dígitos
  const digits = telefone.replace(/\D/g, '')
  if (digits.length >= 10) {
    return digits
  }
  return undefined
}

export const googlePlacesConnector: IConnector = {
  meta: {
    id: 'google_places',
    label: 'Google Places API',
    descricao: 'Busca real de empresas via Google Places Text Search (API oficial)',
    autorizado: true,
    enabled: true,
    version: '1.0.0',
    apiVersion: 1,
    tiposSuportados: ['empresa'],
  },

  async fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    const apiKey = ctx.secrets?.apiKey as string
    if (!apiKey) {
      throw new Error('Google Places API key não configurada')
    }

    const { cidade, estado, segmento, palavraChave, bairro, cnae, nomeEmpresa } = ctx.filtros
    
    // Construir query de busca
    const queryParts: string[] = []
    
    if (nomeEmpresa) {
      queryParts.push(nomeEmpresa)
    }
    
    if (segmento) {
      // Mapear segmentos para termos de busca em português
      const segmentoMap: Record<string, string> = {
        'inss': 'previdência INSS aposentadoria',
        'credito_clt': 'crédito consignado CLT empréstimo',
        'emprestimo': 'empréstimo financeiro crédito',
        'consignado': 'crédito consignado INSS',
        'fgts': 'antecipação FGTS saque',
        'cartao': 'cartão crédito benefício',
        'empresa_b2b': 'empresa negócio comércio',
        'corban': 'correspondente bancário crédito financeiro',
      }
      queryParts.push(segmentoMap[segmento] || segmento)
    }
    
    if (palavraChave) {
      queryParts.push(palavraChave)
    }
    
    if (bairro) {
      queryParts.push(bairro)
    }
    
    if (cidade) {
      queryParts.push(cidade)
    }
    
    if (estado) {
      queryParts.push(estado)
    }

    const query = queryParts.join(' ').trim()
    if (!query) {
      throw new Error('Filtros insuficientes para busca')
    }

    // Localização para busca geográfica (opcional)
    let location: string | undefined
    let radius: number | undefined
    
    if (cidade && estado) {
      // Em produção, usar geocoding para obter lat/lng da cidade
      // Por ora, usamos busca textual
    }

    const limite = ctx.limite ?? 20
    const now = new Date().toISOString()
    
    try {
      const data = await fetchGooglePlaces(apiKey, query, location, radius)
      
      if (data.status === 'ZERO_RESULTS') {
        return [] // Sem resultados, não é erro
      }
      
      if (data.status !== 'OK') {
        throw new Error(`Google Places API: ${data.status} - ${data.error_message || 'Erro desconhecido'}`)
      }

      const results = data.results || []
      
      // Buscar detalhes para cada lugar (inclui telefone completo)
      const enrichedResults = await Promise.all(
        results.slice(0, limite).map(async (place) => {
          try {
            const details = await fetchPlaceDetails(apiKey, place.place_id)
            return details.result || place
          } catch {
            return place // Fallback para dados básicos se details falhar
          }
        })
      )

      return enrichedResults.map((place) => ({
        externalId: `google_places:${place.place_id}`,
        fetchedAt: now,
        payload: {
          placeId: place.place_id,
          nome: place.name,
          endereco: place.formatted_address,
          telefone: place.formatted_phone_number || place.international_phone_number,
          website: place.website,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          tipos: place.types,
          businessStatus: place.business_status,
          query: query,
        },
      }))
    } catch (error: any) {
      if (error.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('Cota da Google Places API excedida. Aguarde renovação.')
      }
      if (error.message?.includes('INVALID_REQUEST')) {
        throw new Error('Chave da API inválida. Verifique as configurações.')
      }
      throw error
    }
  },

  normalize(raw, ctx): NormalizedLead | null {
    const p = raw.payload
    const nome = String(p.nome || '').trim()
    if (!nome) return null

    const telefone = parseTelefone(p.telefone)
    const endereco = String(p.endereco || '')
    const cidade = extractCityFromAddress(endereco) || ctx.filtros.cidade || ''
    const estado = extractStateFromAddress(endereco) || ctx.filtros.estado || ''
    const website = String(p.website || '')
    
    // Dados empresariais públicos - LGPD ok
    const segmento = String(p.tipos?.[0] || ctx.filtros.segmento || 'empresa_b2b')
    
    // Dedupe key: usar placeId quando disponível, senão telefone + nome
    const dedupeKey = p.placeId 
      ? `place:${p.placeId}`
      : telefone
        ? `tel:${telefone}`
        : `nome:${nome.toLowerCase()}:${cidade}`

    return {
      connectorId: this.meta.id,
      connectorVersion: this.meta.version,
      connectorApiVersion: this.meta.apiVersion,
      origemLabel: this.meta.label,
      dedupeKey,
      tipo: 'empresa',
      nome,
      empresaNome: nome,
      telefone,
      email: undefined, // Google Places não fornece email
      cidade,
      estado: estado.toUpperCase(),
      segmento,
      palavraChaveMatch: ctx.filtros.palavraChave || undefined,
      consentimentoLgpd: true,
      baseLegal: 'Dados empresariais de acesso público via Google Places API (LGPD Art. 7º, III)',
      observacoes: [
        website ? `Site: ${website}` : null,
        p.businessStatus ? `Status: ${p.businessStatus}` : null,
        endereco ? `Endereço: ${endereco}` : null,
      ].filter(Boolean).join(' · ') || undefined,
      metadados: {
        placeId: p.placeId,
        website,
        latitude: p.latitude,
        longitude: p.longitude,
        tipos: p.tipos,
        businessStatus: p.businessStatus,
        query: p.query,
      },
      externalId: raw.externalId,
    }
  },
}
