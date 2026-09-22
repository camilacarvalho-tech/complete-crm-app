import { emptyOffer, publicBankApiUrl, type InstitutionAdapter, type SimulationInput } from './types.ts'

export const icredAdapter: InstitutionAdapter = {
  id: 'icred',
  name: 'ICRED',
  isConfigured() {
    return Boolean(publicBankApiUrl('icred'))
  },
  async simulate(input: SimulationInput) {
    if (!this.isConfigured()) {
      return emptyOffer(this, input, { message: 'Aguardando API' })
    }
    return emptyOffer(this, input, {
      status: 'Aguardando API',
      message: 'Aguardando API',
    })
  },
}
