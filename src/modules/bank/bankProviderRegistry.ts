import { INSTITUTION_ADAPTERS } from '../../integrations/banks/registry'

export type BankProviderStatus = 'NOT_CONFIGURED' | 'CONNECTED' | 'ERROR'

export type BankResult = {
  status: BankProviderStatus
  matched: boolean
  message: string
  link?: string
  approved?: boolean
}

export interface BankProvider {
  id: string
  name: string
  status: BankProviderStatus
  consult(input: { conversationId: string; product?: string }): Promise<BankResult>
}

export function getBankProviders(): BankProvider[] {
  return INSTITUTION_ADAPTERS.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.isConfigured() ? 'CONNECTED' : 'NOT_CONFIGURED',
    async consult() {
      const sim = await a.simulate({ produto: 'INSS' })
      return {
        status: a.isConfigured() ? 'CONNECTED' : 'NOT_CONFIGURED',
        matched: false,
        message: sim.message,
      }
    },
  }))
}

export async function consultBank(opts: { conversationId: string; product?: string; bankProviderId?: string }): Promise<BankResult> {
  const list = getBankProviders()
  const p = list.find((x) => x.id === opts.bankProviderId) || list[0]
  return p.consult({ conversationId: opts.conversationId, product: opts.product })
}
