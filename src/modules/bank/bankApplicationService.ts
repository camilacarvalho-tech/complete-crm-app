import { consultBank } from './bankProviderRegistry'
import type { BankResult } from './bankProviderRegistry'

export async function requestBankApplication(opts: {
  conversationId: string
  product?: string
  bankProviderId?: string
}): Promise<BankResult> {
  return consultBank(opts)
}
