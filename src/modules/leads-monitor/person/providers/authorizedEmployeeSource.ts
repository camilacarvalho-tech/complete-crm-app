import type { PersonDiscoveryInput } from '../personSourceTypes'
import type { PersonDiscoveryResult } from '../personDiscoveryResult'
import { emptyPersonDiscoveryResult } from '../personDiscoveryResult'

export interface AuthorizedEmployeeSource {
  searchEmployees(input: PersonDiscoveryInput): Promise<PersonDiscoveryResult>
}

export const authorizedEmployeeSource: AuthorizedEmployeeSource = {
  async searchEmployees() {
    const r = emptyPersonDiscoveryResult('NOT_CONFIGURED')
    r.sourceResults = [
      {
        id: 'authorized_employees',
        label: 'Fonte autorizada de funcionários',
        kind: 'PERSON_SOURCE',
        health: 'NAO_CONFIGURADA',
        status: 'NOT_CONFIGURED',
        people: [],
        message: 'Nenhuma API/fonte de funcionários configurada. Não se usa RAIS/CAGED como lista de pessoas.',
      },
    ]
    return r
  },
}

export async function searchRaisCagedIntelligence(): Promise<{
  id: string
  label: string
  kind: 'EMPLOYMENT_INTELLIGENCE_SOURCE'
  health: 'NAO_CONFIGURADA'
  status: 'NOT_CONFIGURED'
  people: []
  message: string
}> {
  return {
    id: 'rais_caged',
    label: 'RAIS / CAGED (inteligência de emprego)',
    kind: 'EMPLOYMENT_INTELLIGENCE_SOURCE',
    health: 'NAO_CONFIGURADA',
    status: 'NOT_CONFIGURED',
    people: [],
    message: 'Microdado público não identificado não é lista de funcionários com nome/CPF/WhatsApp.',
  }
}
