import { collectAuthorizedProposals, proposalsForAddress } from './index'
import type { EnrichmentInput } from '../../enrichment/enrichmentTypes'

export async function lookupAddress(input: EnrichmentInput) {
  const { proposed, errors, providersUsed } = await collectAuthorizedProposals(input)
  return { proposed: proposalsForAddress(proposed), errors, providersUsed }
}
