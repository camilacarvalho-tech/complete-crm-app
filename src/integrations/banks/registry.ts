import { factaAdapter } from './factaAdapter.ts'
import { novoSaqueAdapter } from './novoSaqueAdapter.ts'
import { icredAdapter } from './icredAdapter.ts'
import { emptyOffer, type InstitutionAdapter, type SimulationInput, type SimulationOffer } from './types.ts'

export const INSTITUTION_ADAPTERS: InstitutionAdapter[] = [
  factaAdapter,
  novoSaqueAdapter,
  icredAdapter,
]

export function getInstitutionAdapter(id: string): InstitutionAdapter | undefined {
  return INSTITUTION_ADAPTERS.find((a) => a.id === id || a.name === id)
}

export async function simulateAdapters(
  adapters: InstitutionAdapter[],
  input: SimulationInput
): Promise<SimulationOffer[]> {
  const settled = await Promise.allSettled(adapters.map((a) => a.simulate(input)))
  return settled.map((r, i) => {
    const a = adapters[i]
    if (r.status === 'fulfilled') return r.value
    const reason = r.reason instanceof Error ? r.reason.message : String(r.reason || 'falha')
    return emptyOffer(a, input, { status: 'Erro de API', message: reason.slice(0, 400) })
  })
}

export async function simulateAllInstitutions(input: SimulationInput): Promise<SimulationOffer[]> {
  return simulateAdapters(INSTITUTION_ADAPTERS, input)
}
