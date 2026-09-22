/**
 * Enriquecimento de pessoa — só provider autorizado configurado.
 * Sem URL/credencial: NOT_CONFIGURED. Não inventa dado.
 */
import type { PersonDiscoveryInput } from './personSourceTypes'

export type PersonEnrichmentResult = {
  found: boolean
  name: string
  cpf: string
  phone: string
  whatsapp: string
  email: string
  source: string
  sourceUrl: string
  confidence: number
  enrichmentStatus: 'NOT_CONFIGURED' | 'EMPTY' | 'OK'
}

export async function enrichPerson(_input: PersonDiscoveryInput): Promise<PersonEnrichmentResult> {
  return {
    found: false,
    name: '',
    cpf: '',
    phone: '',
    whatsapp: '',
    email: '',
    source: '',
    sourceUrl: '',
    confidence: 0,
    enrichmentStatus: 'NOT_CONFIGURED',
  }
}
