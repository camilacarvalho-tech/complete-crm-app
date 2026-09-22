/**
 * INSS Open Data = inteligência, não lista de WhatsApp/CPF.
 */
import type { PersonSourceQueryResult } from '../personDiscoveryResult'

export async function searchInssIntelligence(): Promise<PersonSourceQueryResult> {
  return {
    id: 'inss_intelligence',
    label: 'INSS (inteligência / dados oficiais)',
    kind: 'OFFICIAL_PUBLIC_SOURCE',
    health: 'ATIVA',
    status: 'PERSON_SOURCE_NOT_CONFIGURED',
    people: [],
    message:
      'Dados abertos do INSS não fornecem CPF/WhatsApp. Pessoa só entra via PERSON_SOURCE autorizada (CSV/webhook/API).',
  }
}
