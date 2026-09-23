import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { canSeeFinance, money } from '../lib/nexusCore'
import { MetricCard, PageHeader, PrimaryButton, TextArea } from '../components/nexus/kit'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { runFinanceAi, buildDre, groupByCategoria } from '../lib/finance'
import type { NexusRecord } from '../types/nexus'

function answerFinance(question: string, items: NexusRecord[], dre: ReturnType<typeof buildDre>) {
  const q = question.toLowerCase()
  if (!items.length) return { title: 'Nexus AI Financeiro', lines: ['Não encontrei essa informação nos dados disponíveis.'] }
  const mkt = items.filter((t) => String(t.categoria) === 'marketing' || String(t.tipo) === 'investimento').reduce((s, t) => s + Number(t.valor || 0), 0)
  const roi = mkt ? ((dre.receitaBruta - mkt) / mkt) * 100 : null
  if (q.includes('produto') && q.includes('receita')) {
    const groups = groupByCategoria(items, 'receita')
    if (!groups.length) return { title: 'Receita por produto', lines: ['Não encontrei essa informação nos dados disponíveis.'] }
    const top = [...groups].sort((a, b) => b.value - a.value)[0]
    return { title: 'Receita por produto', lines: [`${top.name}: ${money(top.value)}`, ...groups.map((g) => `${g.name}: ${money(g.value)}`)] }
  }
  if (q.includes('roi') || q.includes('invest') || q.includes('tráfego') || q.includes('trafego')) {
    if (!mkt && !q.includes('roi')) return { title: 'Investimento', lines: ['Não encontrei essa informação nos dados disponíveis.'] }
    return { title: 'Investimento e ROI', lines: [`Investimento ${money(mkt)}`, roi == null ? 'ROI indisponível: sem investimento registrado.' : `ROI ${roi.toFixed(1)}%`] }
  }
  if (q.includes('custo')) return { title: 'Custos', lines: [`Custos ${money(dre.custos)}`] }
  if (q.includes('líquid') || q.includes('liquid') || q.includes('resultado')) return { title: 'Resultado líquido', lines: [`Resultado líquido ${money(dre.liquido)}`] }
  if (q.includes('receita')) return { title: 'Receita', lines: [`Receita ${money(dre.receitaBruta)}`] }
  return runFinanceAi(items)
}

const COLORS = ['#06b6d4', '#7c3aed', '#f97316', '#2563eb', '#16a34a', '#eab308']

export default function NexusAIFinanceiro() {
  const { usuario } = useAuth()
  const { transacoes } = useNexusStore()
  const [q, setQ] = useState('Como está o fluxo de caixa?')
  const [out, setOut] = useState(runFinanceAi(transacoes.items))
  const dre = buildDre(transacoes.items)
  const desp = groupByCategoria(transacoes.items, 'despesa')
  const rec = groupByCategoria(transacoes.items, 'receita')

  if (!canSeeFinance(usuario?.perfil)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Nexus AI Financeiro" subtitle="Acesso restrito." />
        <p className="nexus-card p-4">Seu perfil não tem permissão para consultar dados financeiros.</p>
      </div>
    )
  }

  if (!transacoes.items.length) {
    return (
      <div className="space-y-4">
        <PageHeader title="Nexus AI Financeiro" subtitle="Consulta somente lançamentos reais deste tenant." />
        <p className="nexus-card p-4">Não existem lançamentos financeiros suficientes para esta análise.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Nexus AI Financeiro" subtitle="Consulta somente lançamentos reais deste tenant. Não inventa saldo." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Receita bruta" value={money(dre.receitaBruta)} />
        <MetricCard label="Resultado líquido" value={money(dre.liquido)} />
        <MetricCard label="Custos" value={money(dre.custos)} />
        <MetricCard label="Operacional" value={money(dre.operacional)} />
      </div>
      <div className="nexus-card p-4 space-y-2">
        <label className="text-xs font-semibold">Pergunta
          <TextArea rows={3} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <PrimaryButton type="button" onClick={() => setOut(answerFinance(q, transacoes.items, dre))}>Analisar dados reais</PrimaryButton>
        <h2 className="font-bold">{out.title}</h2>
        <ul className="text-sm space-y-1">{out.lines.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="nexus-card p-4">
          <h3 className="text-sm font-semibold mb-2">Despesas por categoria</h3>
          {desp.length === 0 ? <p className="text-sm" style={{ color: 'var(--code-muted)' }}>Não há dados para este período.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={desp} dataKey="value" nameKey="name" outerRadius={80} label>
                  {desp.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="nexus-card p-4">
          <h3 className="text-sm font-semibold mb-2">Receitas por categoria</h3>
          {rec.length === 0 ? <p className="text-sm" style={{ color: 'var(--code-muted)' }}>Não há dados para este período.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={rec} dataKey="value" nameKey="name" outerRadius={80} label>
                  {rec.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
