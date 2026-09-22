import type { SimulationOffer } from '../../integrations/banks/types.ts'

export type DigitacaoDraft = {
  clienteId: string
  clienteNome: string
  cpf: string
  produto: string
  operacao: string
  banco: string
  contrato: string
  parcela: string
  prazo: string
  taxa: string
  taxaMensal: string
  taxaAnual: string
  valor: string
  valorLiberado: string
  saldoDevedor: string
  margem: string
  troco: string
  documentos: string
  origem: string
  status: string
  protocolo: string
  preenchidoPorRobo: boolean
  contratacaoAutomatica: false
  mensagemSimulacao: string
}

function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return ''
  return String(n)
}

/** Robô de digitação: preenche o que a simulação trouxe. Não contrata. */
export function fillDigitacaoFromOffer(opts: {
  offer: SimulationOffer
  clienteId?: string
  clienteNome?: string
  cpf?: string
  documentIds?: string[]
}): DigitacaoDraft {
  const o = opts.offer
  return {
    clienteId: opts.clienteId || '',
    clienteNome: opts.clienteNome || '',
    cpf: opts.cpf || '',
    produto: o.produto || '',
    operacao: o.operacao || '',
    banco: o.banco || '',
    contrato: o.contrato || '',
    parcela: money(o.parcela),
    prazo: money(o.prazo),
    taxa: money(o.taxaMensal),
    taxaMensal: money(o.taxaMensal),
    taxaAnual: money(o.taxaAnual),
    valor: money(o.valorLiberado),
    valorLiberado: money(o.valorLiberado),
    saldoDevedor: money(o.saldoDevedor),
    margem: money(o.margem),
    troco: money(o.troco),
    documentos: (opts.documentIds || []).join(','),
    origem: o.origem || '',
    status: 'nova',
    protocolo: o.protocolo || '',
    preenchidoPorRobo: true,
    contratacaoAutomatica: false,
    mensagemSimulacao: o.message || o.status,
  }
}

export function proposalFromOffer(opts: {
  offer: SimulationOffer
  clienteId?: string
  clienteNome?: string
  cpf?: string
}): Record<string, unknown> {
  const d = fillDigitacaoFromOffer(opts)
  return {
    clienteId: d.clienteId,
    clienteNome: d.clienteNome,
    cpf: d.cpf,
    produto: d.produto,
    operacao: d.operacao,
    banco: d.banco,
    status: 'em_digitacao',
    valor: d.valorLiberado,
    parcela: d.parcela,
    prazo: d.prazo,
    taxa: d.taxaMensal,
    origem: d.origem,
    protocolo: d.protocolo,
    origemSimulacao: opts.offer.status,
  }
}

export function digitacaoDedupeKey(opts: { clienteId?: string; banco: string; produto: string; operacao: string }) {
  return [opts.clienteId || 'sem-cliente', opts.banco, opts.produto, opts.operacao].join(':').toLowerCase()
}

export function ingestSimulationResult(opts: {
  offer: SimulationOffer
  clienteId?: string
  clienteNome?: string
  cpf?: string
  documentIds?: string[]
  existingDigitacaoKey?: string | null
}): { created: boolean; reused: boolean; proposta: Record<string, unknown>; digitacao: DigitacaoDraft; key: string } {
  const digitacao = fillDigitacaoFromOffer(opts)
  const key = digitacaoDedupeKey({
    clienteId: opts.clienteId,
    banco: digitacao.banco,
    produto: digitacao.produto,
    operacao: digitacao.operacao,
  })
  const reused = Boolean(opts.existingDigitacaoKey && opts.existingDigitacaoKey === key)
  return {
    created: !reused,
    reused,
    proposta: proposalFromOffer(opts),
    digitacao,
    key,
  }
}
