import type { PersonLead } from '../types/personLead'
import type {
  DiscoveredPersonRaw,
  PersonContactStatus,
  PersonDiscoveryStatus,
  PersonSourceHealth,
  PersonSourceKind,
} from './personSourceTypes'

export type PersonSourceQueryResult = {
  id: string
  label: string
  kind: PersonSourceKind
  health: PersonSourceHealth
  status: PersonDiscoveryStatus | 'OK' | 'EMPTY' | 'SKIPPED'
  people: DiscoveredPersonRaw[]
  message: string
}

export type PersonDiscoveryResult = {
  peopleFound: PersonLead[]
  peopleWithContact: PersonLead[]
  peopleWithoutContact: PersonLead[]
  sourceResults: PersonSourceQueryResult[]
  status: PersonDiscoveryStatus
  companiesFound: number
  pessoasEncontradas: number
  pessoasComWhatsapp: number
  pessoasComTelefone: number
  pessoasSemContato: number
}

export function emptyPersonDiscoveryResult(status: PersonDiscoveryStatus = 'NOT_FOUND'): PersonDiscoveryResult {
  return {
    peopleFound: [],
    peopleWithContact: [],
    peopleWithoutContact: [],
    sourceResults: [],
    status,
    companiesFound: 1,
    pessoasEncontradas: 0,
    pessoasComWhatsapp: 0,
    pessoasComTelefone: 0,
    pessoasSemContato: 0,
  }
}

export function contactStatusOf(lead: Pick<PersonLead, 'whatsapp' | 'telefone' | 'email'>): PersonContactStatus {
  if (lead.whatsapp) return 'WHATSAPP'
  if (lead.telefone) return 'PHONE'
  if (lead.email) return 'EMAIL'
  return 'NONE'
}
