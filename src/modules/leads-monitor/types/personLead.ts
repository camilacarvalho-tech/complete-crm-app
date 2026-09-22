/**
 * Ficha canônica PERSON_LEAD.
 * Reutiliza CompanyPeopleResearch + oportunidade relacionada.
 * Ausente = vazio. Empresa é contexto, não a pessoa.
 */
import type { OperacaoMonitor } from '../types'

export const PERSON_IDENTITY_FIELD_IDS = ['nome', 'cpf'] as const
export const PERSON_CONTACT_FIELD_IDS = ['whatsapp', 'telefone', 'email'] as const
export const PERSON_PROFILE_FIELD_IDS = [
  'cargo',
  'empresa',
  'cnpj',
  'vinculo',
  'endereco',
  'cep',
  'cidade',
  'estado',
] as const

export type PersonFieldRequestId =
  | (typeof PERSON_IDENTITY_FIELD_IDS)[number]
  | (typeof PERSON_CONTACT_FIELD_IDS)[number]
  | (typeof PERSON_PROFILE_FIELD_IDS)[number]

export const PERSON_FIELD_REQUEST_OPTIONS: Array<{ id: PersonFieldRequestId; label: string; group: 'person' | 'contact' }> = [
  { id: 'nome', label: 'Nome', group: 'person' },
  { id: 'cpf', label: 'CPF', group: 'contact' },
  { id: 'whatsapp', label: 'WhatsApp', group: 'contact' },
  { id: 'telefone', label: 'Telefone', group: 'contact' },
  { id: 'email', label: 'Email', group: 'contact' },
  { id: 'cargo', label: 'Cargo', group: 'person' },
  { id: 'empresa', label: 'Empresa', group: 'person' },
  { id: 'cnpj', label: 'CNPJ', group: 'person' },
  { id: 'vinculo', label: 'Vínculo', group: 'person' },
  { id: 'endereco', label: 'Endereço', group: 'person' },
  { id: 'cep', label: 'CEP', group: 'person' },
  { id: 'cidade', label: 'Cidade', group: 'person' },
  { id: 'estado', label: 'Estado', group: 'person' },
]

export type PersonLeadClassification = 'HOT' | 'QUALIFIED' | 'NORMAL' | 'UNQUALIFIED' | ''

export type PersonContextClt = {
  cargo: string
  empresa: string
  cnpj: string
  vinculo: string
  vinculoVerificado: boolean
  fonteVinculo: string
}

export type PersonContextInss = {
  tipoBeneficiario: string
  beneficio: string
  operacao: string
  fonteContexto: string
}

export type PersonContextProduto = {
  produto: string
  operacao: OperacaoMonitor | string
  notas: string
}

export interface PersonLead {
  id: string
  nome: string
  cpf: string
  whatsapp: string
  telefone: string
  email: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cep: string
  cidade: string
  estado: string
  empresaId: string
  empresa: string
  cnpj: string
  cargo: string
  vinculo: string
  vinculoVerificado: boolean
  fonteVinculo: string
  segmento: string
  produto: string
  operacao: string
  campanhaId: string
  campanha: string
  origem: string
  fonte: string
  source: string
  sourceUrl: string
  collectedAt: unknown
  score: number
  classification: PersonLeadClassification
  status: string
  contextoCLT: PersonContextClt | null
  contextoINSS: PersonContextInss | null
  contextoProduto: PersonContextProduto | null
  enrichmentStatus: string
  enrichmentProviders: string[]
  enrichmentFields: string[]
  enrichmentUpdatedAt: unknown
  purpose: string
  legalBasis: string
  consentStatus: string
  optOut: boolean
  blocked: boolean
  deleted: boolean
  corrected: boolean
  telefoneValid: boolean | null
  whatsappValid: boolean | null
  emailValid: boolean | null
  personDiscoveryStatus: string
  contactStatus: string
  relationshipStatus: string
  dataNascimento: string
  originalData?: Record<string, string>
  enrichedData?: Record<string, string>
  enrichmentHistory?: Array<{
    field: string
    oldValue: string
    newValue: string
    source: string
    sourceUrl: string
    collectedAt: string
    confidence: number
  }>
  enrichmentCandidates?: Array<{
    field: string
    value: string
    source: string
    sourceUrl: string
    collectedAt: string
    confidence: number
    reason: string
  }>
  enrichmentSources?: string[]
  enrichmentMetadata?: Array<{
    field: string
    value: string
    source: string
    sourceUrl: string
    collectedAt: string
    confidence: number
  }>
}

export const PERSON_LEAD_EXPORT_COLUMNS = [
  'Nome',
  'CPF',
  'Telefone',
  'WhatsApp',
  'Email',
  'Empresa',
  'CNPJ',
  'Cargo',
  'Vínculo',
  'Endereço',
  'CEP',
  'Cidade',
  'Estado',
  'Produto',
  'Operação',
  'Campanha',
  'Origem',
  'Fonte',
  'Score',
  'Classificação',
  'Status',
  'Data de captura',
] as const
