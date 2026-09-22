import { originCode } from '../catalog/crmCatalog.ts'

export type InboundOriginInput = {
  campaignId?: string
  erpCampaignId?: string
  source?: string
  origin?: string
}

export function resolveInboundOrigin(payload: InboundOriginInput): string {
  const raw = String(payload.origin || payload.source || '')
  const mapped = originCode(raw)
  if (mapped === 'disparo_massa' || mapped === 'trafego_pago' || mapped === 'whatsapp' || mapped === 'webhook') {
    return mapped
  }
  if (payload.campaignId || payload.erpCampaignId || /campanha|disparo|nx_erp/i.test(raw)) {
    return 'disparo_massa'
  }
  if (/ads|anuncio|anúncio|trafego|tráfego/i.test(raw)) return 'trafego_pago'
  if (/whatsapp|waba/i.test(raw)) return 'whatsapp'
  return originCode(raw || 'webhook')
}
