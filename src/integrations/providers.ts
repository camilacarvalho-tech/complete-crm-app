export type ProviderStatus = 'not_configured' | 'online' | 'error'

export interface Health {
  status: ProviderStatus
  message: string
}

const NOT_CONFIGURED = (name: string): Health => ({
  status: 'not_configured',
  message: `${name} não configurado. Credenciais ficam no backend/Secret Manager — nunca no frontend.`,
})

export interface BankProvider {
  id: string
  connect(): Promise<Health>
  healthCheck(): Promise<Health>
  syncBanks(): Promise<Health>
  syncProducts(): Promise<Health>
  syncRules(): Promise<Health>
  consultarCpf(input: { cpf: string; bancoCodigo?: string }): Promise<{ ok: false; reason: 'not_configured' | 'error'; message: string }>
  simulate(): Promise<Health>
  submitProposal(): Promise<Health>
  getProposalStatus(): Promise<Health>
}

export const UnconfiguredBankProvider: BankProvider = {
  id: 'unconfigured',
  connect: async () => NOT_CONFIGURED('BankProvider'),
  healthCheck: async () => NOT_CONFIGURED('BankProvider'),
  syncBanks: async () => NOT_CONFIGURED('BankProvider'),
  syncProducts: async () => NOT_CONFIGURED('BankProvider'),
  syncRules: async () => NOT_CONFIGURED('BankProvider'),
  consultarCpf: async () => ({ ok: false, reason: 'not_configured', message: NOT_CONFIGURED('BankProvider').message }),
  simulate: async () => NOT_CONFIGURED('BankProvider'),
  submitProposal: async () => NOT_CONFIGURED('BankProvider'),
  getProposalStatus: async () => NOT_CONFIGURED('BankProvider'),
}

export interface FiscalProvider {
  connect(): Promise<Health>
  healthCheck(): Promise<Health>
  emitir(draft: { clienteId: string; documento: string; descricao: string; valor: number }): Promise<{ ok: false; message: string }>
  cancel(): Promise<Health>
  consult(): Promise<Health>
  getDocument(): Promise<Health>
}

export const UnconfiguredFiscalProvider: FiscalProvider = {
  connect: async () => NOT_CONFIGURED('FiscalProvider'),
  healthCheck: async () => NOT_CONFIGURED('FiscalProvider'),
  emitir: async () => ({ ok: false, message: 'Provedor fiscal não configurado.' }),
  cancel: async () => NOT_CONFIGURED('FiscalProvider'),
  consult: async () => NOT_CONFIGURED('FiscalProvider'),
  getDocument: async () => NOT_CONFIGURED('FiscalProvider'),
}

export interface WhatsAppProvider {
  connect(): Promise<Health>
  healthCheck(): Promise<Health>
  sendMessage(to: string, text: string): Promise<{ ok: boolean; message: string }>
  sendTemplate(): Promise<Health>
  receiveWebhook(): Promise<Health>
}

export const UnconfiguredWhatsAppProvider: WhatsAppProvider = {
  connect: async () => NOT_CONFIGURED('WhatsAppProvider'),
  healthCheck: async () => NOT_CONFIGURED('WhatsApp Cloud API'),
  sendMessage: async () => ({ ok: false, message: 'WhatsApp Provider não configurado.' }),
  sendTemplate: async () => NOT_CONFIGURED('WhatsAppProvider'),
  receiveWebhook: async () => NOT_CONFIGURED('WhatsAppProvider'),
}

export interface ChannelProvider {
  healthCheck(): Promise<Health>
}

const unconfiguredChannel = (name: string): ChannelProvider => ({
  healthCheck: async () => NOT_CONFIGURED(name),
})

export interface VoipProvider {
  ready: boolean
  healthCheck(): Promise<Health>
  dial(phone: string): Promise<{ ok: boolean; message: string }>
}

export const BrowserTelVoipProvider: VoipProvider = {
  ready: false,
  healthCheck: async () => NOT_CONFIGURED('VoIP/SIP'),
  async dial(phone: string) {
    if (!phone) return { ok: false, message: 'Número inválido.' }
    window.open(`tel:${phone.replace(/\D/g, '')}`)
    return { ok: true, message: 'Discador do dispositivo. Integração SIP/WebRTC ainda não configurada.' }
  },
}

export function getBankProvider(): BankProvider {
  return UnconfiguredBankProvider
}
export function getFiscalProvider(): FiscalProvider {
  return UnconfiguredFiscalProvider
}
export function getWhatsAppProvider(): WhatsAppProvider {
  return UnconfiguredWhatsAppProvider
}
export function getVoipProvider(): VoipProvider {
  return BrowserTelVoipProvider
}
export function getInstagramProvider(): ChannelProvider {
  return unconfiguredChannel('InstagramProvider')
}
export function getMessengerProvider(): ChannelProvider {
  return unconfiguredChannel('MessengerProvider')
}
export function getSmsProvider(): ChannelProvider {
  return unconfiguredChannel('SMSProvider')
}
export function getEmailProvider(): ChannelProvider {
  return unconfiguredChannel('EmailProvider')
}

export function getMetaAdsProvider(): ChannelProvider {
  return unconfiguredChannel('Meta Ads')
}
export function getGoogleAdsProvider(): ChannelProvider {
  return unconfiguredChannel('Google Ads')
}

export { getNxErpCampaignAdapter, UnconfiguredNxErpCampaignAdapter } from './nxErpCampaign'
export { personLeadToNxErpContact } from '../modules/leads-monitor/pipeline/personLead'
export { sendLeadToCrm, addLeadToAttendanceQueue } from './crm/erpBridge'

export async function collectProviderHealth() {
  const [bank, fiscal, wa, voip, ig, msg, sms, email, meta, gads] = await Promise.all([
    getBankProvider().healthCheck(),
    getFiscalProvider().healthCheck(),
    getWhatsAppProvider().healthCheck(),
    getVoipProvider().healthCheck(),
    getInstagramProvider().healthCheck(),
    getMessengerProvider().healthCheck(),
    getSmsProvider().healthCheck(),
    getEmailProvider().healthCheck(),
    getMetaAdsProvider().healthCheck(),
    getGoogleAdsProvider().healthCheck(),
  ])
  return { bank, fiscal, whatsapp: wa, voip, instagram: ig, messenger: msg, sms, email, metaAds: meta, googleAds: gads }
}
