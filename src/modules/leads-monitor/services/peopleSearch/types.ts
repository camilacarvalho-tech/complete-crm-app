import type { OportunidadeMonitor } from '../../types'
import type {
  CompanyPeopleResearch,
  PeopleManualLink,
  PeopleSourceId,
} from '../../types/peopleResearch'

export interface PeopleSourceContext {
  empresaId: string
  opportunity: OportunidadeMonitor
}

export interface PeopleSourceHit {
  personName: string
  jobTitle: string
  relationToCompany: CompanyPeopleResearch['relationToCompany']
  phone: string
  phoneType: CompanyPeopleResearch['phoneType']
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
  linkedinUrl: string
  instagramUrl: string
  facebookUrl: string
}

export interface PeopleSourceResult {
  sourceId: PeopleSourceId
  label: string
  hits: PeopleSourceHit[]
  manuais?: PeopleManualLink[]
  companyPhone?: string
  companyWhatsapp?: string
  companyWhatsappUrl?: string
  skipped?: boolean
  error?: string
}

export interface PeopleSource {
  id: PeopleSourceId
  label: string
  search(ctx: PeopleSourceContext): Promise<PeopleSourceResult>
}
