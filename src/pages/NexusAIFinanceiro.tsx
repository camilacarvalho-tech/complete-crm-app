import { useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { runFinanceAi, buildDre, groupByCategoria } from '../lib/finance'
import { money } from '../lib/nexusCore'
import { MetricCard, PageHeader, PrimaryButton, TextArea } from '../components/nexus/kit'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#06b6d4', '#7c3aed', '#f97316', '#2563eb', '#16a34a', '#eab308']

export default function NexusAIFinanceiro() {
  const { transacoes } = useNexusStore()
  const [q, setQ] = useState('Como está o fluxo de caixa?')
  const [out, setOut] = useState(runFinanceAi(transacoes.items))
  const dre = buildDre(transacoes.items)
  const desp = groupByCategoria(transacoes.items, 'despesa')
  const rec = groupByCategoria(transacoes.items, 'receita')

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
        <PrimaryButton type="button" onClick={() => setOut(runFinanceAi(transacoes.items))}>Analisar dados reais</PrimaryButton>
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
