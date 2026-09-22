import { ENRICHABLE_FIELDS } from '../enrichmentTypes'
import type { EnrichmentProvider } from '../enrichmentProvider'
import { notConfiguredResult } from '../enrichmentProvider'

export const licensedPersonProvider: EnrichmentProvider = {
  id: 'licensed_person',
  name: 'API licenciada de pessoas',
  type: 'LICENSED_PROVIDER',
  status: 'NOT_CONFIGURED',
  supportedFields: [...ENRICHABLE_FIELDS],
  async enrich() {
    return notConfiguredResult(this.id, this.name)
  },
}
