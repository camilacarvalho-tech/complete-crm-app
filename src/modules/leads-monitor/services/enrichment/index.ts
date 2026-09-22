/**
 * Camada de serviços de enriquecimento.
 * Reutiliza os providers já registrados — não chama API de componente React.
 */
import type { EnrichmentInput, EnrichmentProposedField } from '../../enrichment/enrichmentTypes'
import { getCallableEnrichmentProviders } from '../../enrichment/enrichmentRegistry'

export { simulateCreditIfConfigured } from './creditSimulation'
export type { CreditSimulationResult } from './creditSimulation'

export async function collectAuthorizedProposals(input: EnrichmentInput): Promise<{
  proposed: EnrichmentProposedField[]
  errors: string[]
  providersUsed: string[]
}> {
  const proposed: EnrichmentProposedField[] = []
  const errors: string[] = []
  const providersUsed: string[] = []
  for (const provider of getCallableEnrichmentProviders()) {
    try {
      const out = await provider.enrich(input)
      providersUsed.push(provider.id)
      if (out.proposed?.length) proposed.push(...out.proposed)
      if (out.errors.length) errors.push(...out.errors)
    } catch {
      errors.push(provider.id)
      providersUsed.push(provider.id)
    }
  }
  return { proposed, errors, providersUsed }
}

const IDENTITY = new Set(['nome', 'cpf', 'dataNascimento', 'email'])
const ADDRESS = new Set(['endereco', 'numero', 'complemento', 'bairro', 'cep', 'cidade', 'estado'])
const PHONE = new Set(['telefone', 'whatsapp'])

export function proposalsForIdentity(items: EnrichmentProposedField[]) {
  return items.filter((i) => IDENTITY.has(i.field))
}
export function proposalsForAddress(items: EnrichmentProposedField[]) {
  return items.filter((i) => ADDRESS.has(i.field))
}
export function proposalsForPhone(items: EnrichmentProposedField[]) {
  return items.filter((i) => PHONE.has(i.field))
}
