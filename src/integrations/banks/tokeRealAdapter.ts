/**
 * TOKE REAL — preparado para API futura.
 * Não inventa endpoint, credencial nem valores de simulação.
 */
import { emptyOffer, publicBankApiUrl, type InstitutionAdapter, type SimulationInput } from './types.ts'

export const tokeRealAdapter: InstitutionAdapter = {
  id: 'toke_real',
  name: 'TOKE REAL',
  isConfigured() {
    return Boolean(publicBankApiUrl('toke_real'))
  },
  async simulate(input: SimulationInput) {
    return emptyOffer(this, input, {
      status: 'Aguardando API',
      message: 'Toke Real preparado. Sem endpoint documentado neste repositório.',
    })
  },
}
