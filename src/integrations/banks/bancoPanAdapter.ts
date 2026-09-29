/**
 * BANCO PAN — preparado para API futura.
 * Não inventa endpoint, credencial nem valores de simulação.
 */
import { emptyOffer, publicBankApiUrl, type InstitutionAdapter, type SimulationInput } from './types.ts'

export const bancoPanAdapter: InstitutionAdapter = {
  id: 'banco_pan',
  name: 'BANCO PAN',
  isConfigured() {
    return Boolean(publicBankApiUrl('banco_pan'))
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
