import type { PersonSourceQueryResult } from '../personDiscoveryResult'

export async function searchPublicOfficialPersons(): Promise<PersonSourceQueryResult> {
  return {
    id: 'official_public_persons',
    label: 'Fonte oficial pública (transparência / dados abertos)',
    kind: 'OFFICIAL_PUBLIC_SOURCE',
    health: 'NAO_CONFIGURADA',
    status: 'NOT_CONFIGURED',
    people: [],
    message: 'Nenhum portal oficial de pessoas identificadas está ligado neste CRM.',
  }
}
