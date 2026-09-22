import { ENRICHABLE_FIELDS } from '../enrichmentTypes'
import type { EnrichmentProvider } from '../enrichmentProvider'
import { emptyEnrichmentResult } from '../enrichmentResult'

/** Planilha CSV/XLSX autorizada já é origem do PersonLead — não há segunda API. */
export const authorizedImportProvider: EnrichmentProvider = {
  id: 'authorized_import',
  name: 'CSV / planilha autorizada',
  type: 'AUTHORIZED_IMPORT',
  status: 'ACTIVE',
  supportedFields: [...ENRICHABLE_FIELDS],
  async enrich() {
    return emptyEnrichmentResult(
      'NO_MATCH',
      'A planilha já é a origem. Não há API de cruzamento configurada para complementar campos vazios.'
    )
  },
}
