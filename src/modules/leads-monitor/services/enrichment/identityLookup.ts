import { collectAuthorizedProposals, proposalsForIdentity } from './index'
import type { EnrichmentInput } from '../../enrichment/enrichmentTypes'

export async function lookupIdentity(input: EnrichmentInput) {
  const { proposed, errors, providersUsed } = await collectAuthorizedProposals(input)
  return { proposed: proposalsForIdentity(proposed), errors, providersUsed }
}
