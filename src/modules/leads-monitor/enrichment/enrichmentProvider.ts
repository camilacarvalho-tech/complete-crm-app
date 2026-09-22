import type { EnrichmentInput, EnrichmentProviderStatus, EnrichmentProviderType } from './enrichmentTypes'
import type { EnrichmentResult } from './enrichmentResult'
import { emptyEnrichmentResult } from './enrichmentResult'

export interface EnrichmentProvider {
  id: string
  name: string
  type: EnrichmentProviderType
  status: EnrichmentProviderStatus
  supportedFields: string[]
  lastRunAt?: string | null
  enrichedCount?: number
  noMatchCount?: number
  errorCount?: number
  enrich(input: EnrichmentInput): Promise<EnrichmentResult>
}

export function notConfiguredResult(providerId: string, name: string): EnrichmentResult {
  return emptyEnrichmentResult(
    'NO_PROVIDER',
    `${name} (${providerId}) não está configurada. Nenhum endpoint foi inventado.`
  )
}
