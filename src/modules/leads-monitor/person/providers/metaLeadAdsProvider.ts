import type { PersonSourceQueryResult } from '../personDiscoveryResult'

/** Meta Lead Ads — sem token/endpoint inventados. */
export async function searchMetaLeadAdsPersons(): Promise<PersonSourceQueryResult> {
  return {
    id: 'meta_lead_ads',
    label: 'Meta Lead Ads',
    kind: 'PERSON_SOURCE',
    health: 'NAO_CONFIGURADA',
    status: 'NOT_CONFIGURED',
    people: [],
    message: 'Meta Lead Ads não está conectado. Sem token/endpoint.',
  }
}

export type MetaLeadAdsFields = {
  metaLeadId?: string
  formId?: string
  pageId?: string
  campaignId?: string
  adSetId?: string
  adId?: string
  createdTime?: string
  origin: 'trafego_pago'
  source: 'meta_lead_ads'
}
