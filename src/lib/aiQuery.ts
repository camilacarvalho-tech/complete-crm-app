import { periodRange, createdOf, inRange, money, type PeriodKey } from './nexusCore'
import type { NexusCliente, NexusRecord } from '../types/nexus'

export function runNexusQuery(
  question: string,
  data: {
    clientes: NexusCliente[]
    propostas: NexusRecord[]
    digitacoes: NexusRecord[]
    campanhas: NexusRecord[]
    transacoes: NexusRecord[]
    bancos: NexusRecord[]
  }
): { title: string; lines: string[]; action?: string } {
  const q = question.toLowerCase()
  const week = periodRange('7d')
  const stopped = data.clientes.filter((c) => {
    const d = createdOf(c)
    return d ? !inRange(d, week.from, week.to) && ['novo_lead', 'em_atendimento', 'proposta'].includes(String(c.pipelineStage || '')) : false
  })

  if (q.includes('quente') || q.includes('leads estão')) {
    const hot = data.clientes.filter((c) => Number(c.score || 0) >= 70 || c.temperatura === 'quente')
    return { title: 'Leads quentes', lines: hot.slice(0, 20).map((c) => `${c.nome} · score ${c.score || 0} · ${c.origem || c.source || ''}`), action: hot.length ? 'remarketing' : undefined }
  }
  if (q.includes('proposta') && q.includes('parada')) {
    const items = data.propostas.filter((p) => ['enviada', 'em_analise', 'pendente'].includes(String(p.status || '').toLowerCase()))
    return { title: 'Propostas paradas', lines: items.map((p) => `${p.clienteNome || p.clienteId} · ${p.status}`) }
  }
  if (q.includes('banco') && (q.includes('convert') || q.includes('melhor'))) {
    const map = new Map<string, number>()
    data.digitacoes.filter((d) => String(d.status).toLowerCase().includes('aprov') || String(d.status).toLowerCase() === 'pago').forEach((d) => {
      const b = String(d.banco || '—')
      map.set(b, (map.get(b) || 0) + 1)
    })
    const lines = [...map.entries()].sort((a, b) => b[1] - a[1]).map(([b, n]) => `${b}: ${n} produções`)
    return { title: 'Conversão por banco', lines: lines.length ? lines : ['Sem produções aprovadas no período.'] }
  }
  if (q.includes('funcionário') || q.includes('producao') || q.includes('produção')) {
    const map = new Map<string, number>()
    data.clientes.forEach((c) => {
      const n = String(c.responsavel || 'sem responsável')
      map.set(n, (map.get(n) || 0) + 1)
    })
    return { title: 'Volume por funcionário', lines: [...map.entries()].sort((a, b) => b[1] - a[1]).map(([n, qtd]) => `${n}: ${qtd}`) }
  }
  if (q.includes('roi')) {
    const rec = data.transacoes.filter((t) => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor || 0), 0)
    const mkt = data.transacoes.filter((t) => t.categoria === 'marketing').reduce((s, t) => s + Number(t.valor || 0), 0)
    const roi = mkt ? ((rec - mkt) / mkt) * 100 : 0
    return { title: 'ROI', lines: [`Receita ${money(rec)}`, `Investimento marketing ${money(mkt)}`, `ROI ${roi.toFixed(1)}%`] }
  }
  if (q.includes('follow') || q.includes('sem resposta') || q.includes('não responderam') || q.includes('nao responderam')) {
    return {
      title: 'Follow-up sugerido',
      lines: [
        `${stopped.length} clientes/leads sem movimentação recente.`,
        'Sugestão: campanha de reativação no WhatsApp com intervalo de 3 dias.',
      ],
      action: 'campanha',
    }
  }
  if (q.includes('portabilidade')) {
    const items = data.clientes.filter((c) => (c.modalidades || []).includes('Portabilidade') || c.modalidade === 'Portabilidade')
    return { title: 'Portabilidade', lines: items.map((c) => `${c.nome} · ${c.status || c.pipelineStage}`) }
  }
  return {
    title: 'Consulta interna',
    lines: [
      `${data.clientes.length} clientes`,
      `${data.propostas.length} propostas`,
      `${data.digitacoes.length} digitações`,
      `${data.campanhas.length} campanhas`,
      'Tente: "quais leads estão quentes?", "mostre meu ROI", "propostas paradas".',
    ],
  }
}
