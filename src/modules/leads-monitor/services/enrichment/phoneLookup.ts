import { collectAuthorizedProposals, proposalsForPhone } from './index'
import type { EnrichmentInput } from '../../enrichment/enrichmentTypes'

export async function lookupPhone(input: EnrichmentInput) {
  const { proposed, errors, providersUsed } = await collectAuthorizedProposals(input)
  return { proposed: proposalsForPhone(proposed), errors, providersUsed }
}
