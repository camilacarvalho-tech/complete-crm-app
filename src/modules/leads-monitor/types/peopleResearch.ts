export type PeopleRelationToCompany =
  | 'funcionario'
  | 'ex_funcionario'
  | 'administrador'
  | 'socio'
  | 'gestor'
  | 'profissional_relacionado'
  | 'nao_confirmado'

export type PeoplePhoneType = 'empresa' | 'profissional' | 'autorizado' | 'nao_identificado'

export type PeopleResearchStatus =
  | 'encontrado'
  | 'revisado'
  | 'aprovado'
  | 'ignorado'
  | 'enviado_crm'

export type PeopleRunStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export type PeopleSourceId = 'brasilapi_qsa' | 'company_website' | 'open_web_links'

export interface CompanyPeopleResearch {
  id: string
  empresaId: string
  companyId: string
  opportunityId: string
  companyName: string
  companyCnpj: string
  personName: string
  jobTitle: string
  relationToCompany: PeopleRelationToCompany
  phone: string
  phoneType: PeoplePhoneType
  phoneSource: string
  phoneSourceUrl: string
  whatsapp: string
  whatsappSource: string
  whatsappSourceUrl: string
  whatsappVerified: boolean
  source: PeopleSourceId | string
  sourceUrl: string
  sourceName: string
  confidence: number
  foundAt?: unknown
  status: PeopleResearchStatus
  crmPersonId: string | null
  createdAt?: unknown
  updatedAt?: unknown
  linkedinUrl: string
  instagramUrl: string
  facebookUrl: string
  dedupeKey: string
}

export interface PeopleSourceProgress {
  id: PeopleSourceId | string
  label: string
  status: 'pending' | 'running' | 'ok' | 'error' | 'skipped'
  tempoMs: number
  count: number
  error: string
}

export interface PeopleManualLink {
  platform: string
  label: string
  url: string
}

export interface PeopleRun {
  id: string
  empresaId: string
  opportunityId: string
  companyName: string
  companyCnpj: string
  status: PeopleRunStatus
  etapa: string
  fontes: PeopleSourceProgress[]
  manuais: PeopleManualLink[]
  companyPhone: string
  companyWhatsapp: string
  companyWhatsappUrl: string
  totais: {
    pessoas: number
    confirmadas: number
    naoConfirmadas: number
    fontes: number
    telefones: number
    whatsapps: number
    perfis: number
  }
  tempoMs: number
  lastError: string | null
  startedAt?: unknown
  finishedAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}
