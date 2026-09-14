import { money } from './nexusCore'
import type { NexusRecord } from '../types/nexus'

export function buildDre(transacoes: NexusRecord[]) {
  const sum = (pred: (t: NexusRecord) => boolean) =>
    transacoes.filter(pred).reduce((s, t) => s + Number(t.valor || 0), 0)
  const receitaBruta = sum((t) => t.tipo === 'receita')
  const deducoes = sum((t) => t.tipo === 'despesa' && String(t.categoria) === 'deducao')
  const receitaLiquida = receitaBruta - deducoes
  const custos = sum((t) => t.tipo === 'despesa' && String(t.categoria) === 'custo')
  const bruto = receitaLiquida - custos
  const op = sum((t) => t.tipo === 'despesa' && !['custo', 'deducao', 'financeiro'].includes(String(t.categoria || '')))
  const operacional = bruto - op
  const financeiro = sum((t) => String(t.categoria) === 'financeiro') * (1)
  const financeiroNet = transacoes
    .filter((t) => String(t.categoria) === 'financeiro')
    .reduce((s, t) => s + (t.tipo === 'receita' ? Number(t.valor || 0) : -Number(t.valor || 0)), 0)
  const liquido = operacional + financeiroNet
  return { receitaBruta, deducoes, receitaLiquida, custos, bruto, op, operacional, financeiro, financeiroNet, liquido }
}

export function runFinanceAi(transacoes: NexusRecord[]): { title: string; lines: string[] } {
  if (!transacoes.length) {
    return { title: 'Nexus AI Financeiro', lines: ['Não existem lançamentos financeiros suficientes para esta análise.'] }
  }
  const dre = buildDre(transacoes)
  const pagar = transacoes.filter((t) => t.tipo === 'pagar' && String(t.status) !== 'pago')
  const receber = transacoes.filter((t) => t.tipo === 'receber' && String(t.status) !== 'recebido')
  const vencidos = pagar.filter((t) => String(t.status) === 'vencido' || String(t.status) === 'atrasado')
  const byCat = new Map<string, number>()
  transacoes.filter((t) => t.tipo === 'despesa').forEach((t) => {
    const k = String(t.categoria || 'outros')
    byCat.set(k, (byCat.get(k) || 0) + Number(t.valor || 0))
  })
  const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
  const projetado = dre.liquido + receber.reduce((s, t) => s + Number(t.valor || 0), 0) - pagar.reduce((s, t) => s + Number(t.valor || 0), 0)
  const lines = [
    `Receita bruta ${money(dre.receitaBruta)}.`,
    `Resultado líquido ${money(dre.liquido)}.`,
    `Contas a receber ${money(receber.reduce((s, t) => s + Number(t.valor || 0), 0))} (${receber.length} títulos).`,
    `Contas a pagar ${money(pagar.reduce((s, t) => s + Number(t.valor || 0), 0))} (${pagar.length} títulos).`,
    vencidos.length ? `${vencidos.length} contas estão vencidas.` : 'Nenhuma conta marcada como vencida.',
    topCat ? `A categoria ${topCat[0]} representa ${money(topCat[1])} das despesas.` : 'Sem despesas categorizadas.',
    projetado < 0
      ? `O fluxo projetado apresenta risco de déficit (${money(projetado)}).`
      : `Fluxo projetado ${money(projetado)}.`,
  ]
  return { title: 'Análise financeira do tenant', lines }
}

export function groupByCategoria(transacoes: NexusRecord[], tipo: string) {
  const map = new Map<string, number>()
  transacoes.filter((t) => t.tipo === tipo).forEach((t) => {
    const k = String(t.categoria || 'outros')
    map.set(k, (map.get(k) || 0) + Number(t.valor || 0))
  })
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}
