export type PersonSourceKind =
  | 'COMPANY_SOURCE'
  | 'PERSON_SOURCE'
  | 'EMPLOYMENT_INTELLIGENCE_SOURCE'
  | 'PERSON_ENRICHMENT_SOURCE'
  | 'OFFICIAL_PUBLIC_SOURCE'

export type PersonDiscoveryStatus =
  | 'FOUND_WITH_CONTACT'
  | 'FOUND_WITHOUT_CONTACT'
  | 'NOT_FOUND'
  | 'NOT_CONFIGURED'
  | 'PERSON_SOURCE_NOT_CONFIGURED'

export type PersonContactStatus = 'WHATSAPP' | 'PHONE' | 'EMAIL' | 'NONE'
export type PersonContactType = 'PERSON' | 'COMPANY' | 'PROFESSIONAL' | 'UNKNOWN'
export type PersonRelationshipStatus = 'VERIFIED' | 'UNVERIFIED' | 'NOT_AVAILABLE'
export type PersonSourceHealth = 'CONFIGURADA' | 'NAO_CONFIGURADA' | 'ERRO' | 'ATIVA'

export type PersonSearchTargetType = 'COMPANY' | 'PERSON' | 'COMPANY_TO_PERSON'

export type PersonDiscoveryInput = {
  empresaId: string
  campaignId?: string
  product?: string
  operation?: string
  city?: string
  state?: string
  companyId: string
  companyName: string
  companyCnpj?: string
  companyPhone?: string
  companyEmail?: string
  targetType: PersonSearchTargetType
  personFieldsRequested?: string[]
  contactFieldsRequested?: string[]
  actor?: { usuarioId?: string; usuarioNome?: string }
}

export type DiscoveredPersonRaw = {
  personName: string
  cpf?: string
  phone?: string
  whatsapp?: string
  email?: string
  jobTitle?: string
  relationToCompany: string
  vinculoVerificado: boolean
  fonteVinculo: string
  source: string
  sourceType: PersonSourceKind
  sourceUrl: string
  contactType: PersonContactType
  collectedAt?: unknown
  confidence?: number
}
