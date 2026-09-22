import { ENRICHABLE_FIELDS } from '../enrichmentTypes'
import type { EnrichmentProvider } from '../enrichmentProvider'
import { notConfiguredResult } from '../enrichmentProvider'

export const officialPublicProvider: EnrichmentProvider = {
  id: 'official_public_enrichment',
  name: 'Fonte oficial pública',
  type: 'OFFICIAL_PUBLIC_SOURCE',
  status: 'NOT_CONFIGURED',
  supportedFields: ['nome', 'cargo', 'empresa', 'cidade', 'estado', 'email', 'telefone'],
  async enrich() {
    return notConfiguredResult(this.id, this.name)
  },
}
