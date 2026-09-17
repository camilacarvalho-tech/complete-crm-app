import { agoraEntrada, eventoOrigem } from './origemLead'
import { originCode } from '../catalog/crmCatalog'

/** Mapeia payload bruto de anúncio/formulário. Não chama API externa. */
export function mapearIngressoPago(raw: Record<string, unknown>) {
  const { dataEntrada, horaEntrada, timestampIso } = agoraEntrada()
  const origem = originCode(String(raw.origem || raw.source || 'trafego_pago'))
  return {
    origem,
    origemLead: origem,
    origemDetalhe: String(raw.plataforma || raw.platform || raw.utm_source || ''),
    campanha: String(raw.campanha || raw.campaign || raw.utm_campaign || ''),
    campanhaId: String(raw.campaignId || raw.campaign_id || ''),
    fonte: String(raw.fonte || raw.ad || raw.utm_content || ''),
    fonteId: String(raw.adId || raw.ad_id || ''),
    adset_id: String(raw.adSetId || raw.adset_id || ''),
    formId: String(raw.formId || raw.form_id || ''),
    landingPage: String(raw.landingPage || raw.landing_page || ''),
    utm_source: String(raw.utm_source || ''),
    utm_medium: String(raw.utm_medium || ''),
    utm_campaign: String(raw.utm_campaign || ''),
    utm_content: String(raw.utm_content || ''),
    plataforma: String(raw.plataforma || raw.platform || ''),
    dataEntrada,
    horaEntrada,
    timestampIso,
    historicoOrigens: [
      eventoOrigem({
        origem,
        origemDetalhe: String(raw.plataforma || ''),
        campanha: String(raw.campanha || raw.campaign || ''),
        campanhaId: String(raw.campaignId || raw.campaign_id || ''),
        fonte: String(raw.fonte || raw.ad || ''),
        fonteId: String(raw.adId || raw.ad_id || ''),
        plataforma: String(raw.plataforma || raw.platform || ''),
      }),
    ],
  }
}

export function mapearIngressoDisparo(raw: Record<string, unknown>) {
  const { dataEntrada, horaEntrada, timestampIso } = agoraEntrada()
  return {
    origemLead: 'disparo_massa',
    origem: 'disparo_massa',
    origemDetalhe: String(raw.lista || raw.arquivo || ''),
    campanha: String(raw.campanha || ''),
    campanhaId: String(raw.campanhaId || ''),
    fonte: String(raw.template || raw.canal || 'disparo'),
    canal: String(raw.canal || ''),
    template: String(raw.template || ''),
    listaOrigem: String(raw.lista || raw.arquivo || ''),
    responsavel: String(raw.responsavel || ''),
    dataEntrada,
    horaEntrada,
    timestampIso,
    historicoOrigens: [
      eventoOrigem({
        origem: 'disparo_massa',
        origemDetalhe: String(raw.lista || ''),
        campanha: String(raw.campanha || ''),
        fonte: String(raw.template || ''),
        canal: String(raw.canal || ''),
      }),
    ],
  }
}

export function mapearIngressoLanding(raw: Record<string, unknown>) {
  const { dataEntrada, horaEntrada, timestampIso } = agoraEntrada()
  return {
    origemLead: 'landing_page',
    origem: 'landing_page',
    origemDetalhe: String(raw.formulario || raw.form || ''),
    campanha: String(raw.campanha || raw.utm_campaign || ''),
    landingPage: String(raw.landingPage || raw.pagina || ''),
    utm_source: String(raw.utm_source || ''),
    utm_medium: String(raw.utm_medium || ''),
    utm_campaign: String(raw.utm_campaign || ''),
    dataEntrada,
    horaEntrada,
    timestampIso,
    camposOriginais: raw,
    historicoOrigens: [
      eventoOrigem({
        origem: 'landing_page',
        origemDetalhe: String(raw.formulario || raw.form || ''),
        campanha: String(raw.campanha || raw.utm_campaign || ''),
      }),
    ],
  }
}
