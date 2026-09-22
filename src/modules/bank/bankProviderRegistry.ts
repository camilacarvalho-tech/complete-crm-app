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

const providers = new Map<string, BankProvider>()

export function registerBankProvider(provider: BankProvider) {
  providers.set(provider.id, provider)
}

export function getBankProviders(): BankProvider[] {
  return Array.from(providers.values())
}

export const unconfiguredBankProvider: BankProvider = {
  id: 'bank_generic',
  name: 'API bancária',
  status: 'NOT_CONFIGURED',
  async consult() {
    return {
      status: 'NOT_CONFIGURED',
      matched: false,
      message: 'Nenhum adapter bancário configurado. Sem endpoint/credencial.',
    }
  },
}

registerBankProvider(unconfiguredBankProvider)

export async function consultBank(opts: { conversationId: string; product?: string; bankProviderId?: string }): Promise<BankResult> {
  const p = (opts.bankProviderId && providers.get(opts.bankProviderId)) || unconfiguredBankProvider
  return p.consult({ conversationId: opts.conversationId, product: opts.product })
}
