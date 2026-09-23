import { periodRange, createdOf, inRange, money, type PeriodKey } from './nexusCore'
import { productCatalogLabel } from '../catalog/productCatalog'
import type { NexusCliente, NexusRecord } from '../types/nexus'

const NOT_FOUND = 'Não encontrei essa informação nos dados disponíveis.'

function linesOr(title: string, lines: string[], action?: string) {
  return { title, lines: lines.length ? lines : [NOT_FOUND], action }
}

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
  const month = periodRange('mes' as PeriodKey)
  const today = periodRange('hoje')
  const propostasHoje = data.propostas.filter((p) => {
    const d = createdOf(p)
    return d ? inRange(d, today.from, today.to) : false
  })
  const doMes = (items: NexusRecord[]) => items.filter((p) => {
    const d = createdOf(p)
    return d ? inRange(d, month.from, month.to) : false
  })

  if ((q.includes('proposta') && q.includes('hoje')) || q.includes('quantas propostas')) {
    return linesOr('Propostas de hoje', [`${propostasHoje.length} propostas criadas hoje.`])
  }
  if (q.includes('document')) {
    const waiting = data.clientes.filter((c) => String(c.pipelineStage || c.status || '').includes('document'))
    return linesOr('Documentação', waiting.map((c) => `${c.nome || 'Cliente'} · ${c.pipelineStage || c.status || ''}`))
  }
  if (q.includes('aprovad')) {
    const items = data.propostas.filter((p) => String(p.status || '').toLowerCase().includes('aprov'))
    return linesOr('Propostas aprovadas', items.map((p) => `${p.clienteNome || p.clienteId || 'Cliente'} · ${p.produto || ''} · ${p.status}`))
  }
  if (q.includes('monitor')) {
    const items = data.clientes.filter((c) => String(c.origem || c.source || '').includes('monitor'))
    return linesOr('Leads do Monitor', items.map((c) => `${c.nome || 'Lead'} · ${c.produto || c.modalidade || ''}`))
  }
  if (q.includes('produto') && (q.includes('proposta') || q.includes('mais'))) {
    const map = new Map<string, number>()
    data.propostas.forEach((p) => {
      const name = productCatalogLabel(String(p.produto || '')) || String(p.produto || 'Sem produto')
      map.set(name, (map.get(name) || 0) + 1)
    })
    const lines = [...map.entries()].sort((a, b) => b[1] - a[1]).map(([n, qtd]) => `${n}: ${qtd}`)
    return linesOr('Propostas por produto', lines)
  }
  if (q.includes('inss')) {
    const items = data.propostas.filter((p) => productCatalogLabel(String(p.produto || '')) === 'INSS' || String(p.produto || '').toUpperCase() === 'INSS')
    return linesOr('Propostas de INSS', items.map((p) => `${p.clienteNome || p.clienteId || 'Cliente'} · ${p.status || ''}`))
  }
  if (q.includes('banco')) {
    const map = new Map<string, number>()
    data.propostas.forEach((p) => {
      const b = String(p.banco || p.instituicao || '')
      if (!b) return
      map.set(b, (map.get(b) || 0) + 1)
    })
    return linesOr('Propostas por banco', [...map.entries()].sort((a, b) => b[1] - a[1]).map(([b, n]) => `${b}: ${n}`))
  }
  if (q.includes('averb')) {
    const items = data.digitacoes.filter((d) => String(d.status || '').toLowerCase().includes('averb'))
    return linesOr('Averbação', items.map((d) => `${d.clienteNome || d.clienteId || 'Cliente'} · ${d.status}`))
  }
  if (q.includes('resultado') || q.includes('vendemos') || q.includes('mês') || q.includes('mes')) {
    const rec = doMes(data.transacoes).filter((t) => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor || 0), 0)
    if (q.includes('clt')) {
      const clt = doMes(data.propostas).filter((p) => productCatalogLabel(String(p.produto || '')) === 'Crédito CLT')
      return linesOr('Crédito CLT', clt.length ? clt.map((p) => `${p.clienteNome || 'Cliente'} · ${money(Number(p.valor || 0))}`) : [NOT_FOUND])
    }
    if (!doMes(data.transacoes).length && !doMes(data.propostas).length) return linesOr('Resultado do mês', [NOT_FOUND])
    return linesOr('Resultado do mês', [`Receita do mês ${money(rec)}`, `${doMes(data.propostas).length} propostas no mês.`])
  }
  if (q.includes('campanha') && q.includes('ativ')) {
    const items = data.campanhas.filter((c) => ['em_execucao', 'ativa', 'ativo'].includes(String(c.status || '').toLowerCase()))
    return linesOr('Campanhas ativas', items.map((c) => String(c.nome || c.id)))
  }
  const week = periodRange('7d')
  const stopped = data.clientes.filter((c) => {
    const d = createdOf(c)
    return d ? !inRange(d, week.from, week.to) && ['novo_lead', 'em_atendimento', 'proposta'].includes(String(c.pipelineStage || '')) : false
  })

  if (q.includes('aguardando') || q.includes('retorno') || q.includes('retom')) {
    const pessoas = data.clientes.filter((c) => /aguard|sem resposta|parado/i.test(`${c.status || ''} ${c.pipelineStage || ''}`))
    const propostasParadas = data.propostas.filter((p) => /aguard|analise|análise|pendent/i.test(String(p.status || '')))
    const lines = [
      ...pessoas.slice(0, 12).map((c) => `${c.nome || 'Cliente'} · ${c.pipelineStage || c.status || 'aguardando'}`),
      ...propostasParadas.slice(0, 8).map((p) => `${p.clienteNome || 'Cliente'} · proposta ${p.status}`),
    ]
    return linesOr('Aguardando retorno', lines, pessoas.length ? 'remarketing' : undefined)
  }
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
  return { title: 'Consulta', lines: [NOT_FOUND] }
}
