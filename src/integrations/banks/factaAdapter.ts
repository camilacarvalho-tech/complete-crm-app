import { emptyOffer, publicBankApiUrl, type InstitutionAdapter, type SimulationInput } from './types.ts'

export const factaAdapter: InstitutionAdapter = {
  id: 'facta',
  name: 'FACTA',
  isConfigured() {
    return Boolean(publicBankApiUrl('facta'))
  },
  async simulate(input: SimulationInput) {
    if (!this.isConfigured()) {
      return emptyOffer(this, input, { message: 'Aguardando API' })
    }
    return emptyOffer(this, input, {
      status: 'Aguardando API',
      message: 'URL visível, mas a chamada real fica no backend. Sem endpoint inventado.',
    })
  },
}
