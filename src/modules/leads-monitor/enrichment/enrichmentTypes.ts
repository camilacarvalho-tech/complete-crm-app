export type EnrichmentProviderType =
  | 'AUTHORIZED_API'
  | 'LICENSED_PROVIDER'
  | 'OFFICIAL_PUBLIC_SOURCE'
  | 'AUTHORIZED_IMPORT'

export type EnrichmentProviderStatus = 'ACTIVE' | 'INACTIVE' | 'NOT_CONFIGURED' | 'ERROR'

export type EnrichmentStatus =
  | 'NOT_ENRICHED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'ENRICHED'
  | 'PARTIAL'
  | 'NO_MATCH'
  | 'NO_PROVIDER'
  | 'ERROR'

export type EnrichmentQueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

export type EnrichmentContactType = 'WHATSAPP' | 'PHONE' | 'EMAIL' | 'UNKNOWN'

export const ENRICHABLE_FIELDS = [
  'nome',
  'cpf',
  'telefone',
  'whatsapp',
  'email',
  'endereco',
  'numero',
  'complemento',
  'bairro',
  'cep',
  'cidade',
  'estado',
  'empresa',
  'cnpj',
  'cargo',
  'vinculo',
  'dataNascimento',
] as const

export type EnrichableField = (typeof ENRICHABLE_FIELDS)[number]

export type EnrichmentInput = {
  personLeadId: string
  empresaId: string
  personName: string
  cpf: string
  phone: string
  telefone: string
  whatsapp: string
  email: string
  companyName: string
  companyCnpj: string
  jobTitle: string
  city: string
  state: string
  source: string
  sourceUrl: string
  purpose?: string
  legalBasis?: string
  consentStatus?: string
  optOut?: boolean
  blocked?: boolean
  deleted?: boolean
}

export type EnrichmentProposedField = {
  field: EnrichableField
  value: string
  source: string
  sourceUrl: string
  collectedAt: string
  confidence: number
  contactType?: EnrichmentContactType
  purpose?: string
  legalBasis?: string
  consentStatus?: string
}

export type EnrichmentFieldMeta = {
  field: string
  value: string
  source: string
  sourceUrl: string
  collectedAt: string
  confidence: number
}

export type EnrichmentHistoryEntry = {
  field: string
  oldValue: string
  newValue: string
  source: string
  sourceUrl: string
  collectedAt: string
  confidence: number
}

export type EnrichmentCandidate = EnrichmentFieldMeta & {
  reason: string
}
