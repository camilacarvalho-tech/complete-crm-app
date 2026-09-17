import { originCode, originLabel } from '../catalog/crmCatalog'

export type OrigemLeadCode =
  | 'leads_monitor'
  | 'trafego_pago'
  | 'disparo_massa'
  | 'planilha_csv'
  | 'landing_page'
  | 'whatsapp'
  | 'webhook'
  | 'importacao'
  | 'manual'
  | 'outros'

export type HistoricoOrigem = {
  em: string
  origem: string
  origemDetalhe?: string
  campanha?: string
  campanhaId?: string
  fonte?: string
  fonteId?: string
  canal?: string
  plataforma?: string
}

export const ORIGEM_MARCA: Record<string, { cor: string; emoji: string }> = {
  leads_monitor: { cor: '#f97316', emoji: '🟠' },
  trafego_pago: { cor: '#3b82f6', emoji: '🔵' },
  disparo_massa: { cor: '#a855f7', emoji: '🟣' },
  planilha_csv: { cor: '#94a3b8', emoji: '⚪' },
  planilha: { cor: '#94a3b8', emoji: '⚪' },
  landing_page: { cor: '#22c55e', emoji: '🟢' },
  whatsapp: { cor: '#25d366', emoji: '💬' },
  webhook: { cor: '#64748b', emoji: '🔗' },
  importacao: { cor: '#94a3b8', emoji: '📥' },
  manual: { cor: '#64748b', emoji: '✏️' },
  outros: { cor: '#64748b', emoji: '⚪' },
}

export function origemPrincipalDe(cli?: {
  origemLead?: unknown
  origem?: unknown
  source?: unknown
} | null): string {
  return originCode(String(cli?.origemLead || cli?.origem || cli?.source || ''))
}

export function origemMarca(code?: string) {
  const c = originCode(code)
  return ORIGEM_MARCA[c] || { cor: '#64748b', emoji: '⚪' }
}

export function origemTexto(code?: string) {
  return originLabel(originCode(code))
}

export function agoraEntrada(d = new Date()) {
  const dataEntrada = d.toISOString().slice(0, 10)
  const horaEntrada = d.toTimeString().slice(0, 8)
  return { dataEntrada, horaEntrada, timestampIso: d.toISOString() }
}

export function eventoOrigem(opts: {
  origem: string
  origemDetalhe?: string
  campanha?: string
  campanhaId?: string
  fonte?: string
  fonteId?: string
  canal?: string
  plataforma?: string
}): HistoricoOrigem {
  return {
    em: new Date().toISOString(),
    origem: originCode(opts.origem),
    origemDetalhe: opts.origemDetalhe || '',
    campanha: opts.campanha || '',
    campanhaId: opts.campanhaId || '',
    fonte: opts.fonte || '',
    fonteId: opts.fonteId || '',
    canal: opts.canal || '',
    plataforma: opts.plataforma || '',
  }
}

/** Origem principal nunca é sobrescrita; canal (WhatsApp) é independente. */
export function preservarOrigemPrincipal(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const atual = origemPrincipalDe(existing)
  const nova = originCode(String(incoming.origemLead || incoming.origem || incoming.source || ''))
  const hist = [
    ...((Array.isArray(existing.historicoOrigens) ? existing.historicoOrigens : []) as HistoricoOrigem[]),
    ...((Array.isArray(incoming.historicoOrigens) ? incoming.historicoOrigens : []) as HistoricoOrigem[]),
  ]
  const patch: Record<string, unknown> = { historicoOrigens: hist }
  if (!atual && nova) {
    patch.origemLead = nova
    patch.origem = nova
    patch.source = nova
  }
  const canal = String(incoming.canalEntrada || incoming.canal || '')
  if (canal) patch.canalEntrada = canal
  return patch
}
