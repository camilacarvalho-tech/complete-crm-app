import type { EnrichmentCandidate, EnrichmentProposedField, EnrichmentStatus } from './enrichmentTypes'

export type EnrichmentResult = {
  status: EnrichmentStatus
  matched: boolean
  fieldsUpdated: string[]
  fieldsNotFound: string[]
  candidates: EnrichmentCandidate[]
  providersUsed: string[]
  errors: string[]
  proposed?: EnrichmentProposedField[]
  message?: string
}

export function emptyEnrichmentResult(status: EnrichmentStatus, message?: string): EnrichmentResult {
  return {
    status,
    matched: false,
    fieldsUpdated: [],
    fieldsNotFound: [],
    candidates: [],
    providersUsed: [],
    errors: [],
    proposed: [],
    message,
  }
}
