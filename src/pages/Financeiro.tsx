import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useNexusStore } from '../contexts/NexusStore'
import { getFiscalProvider } from '../integrations/providers'
import { money } from '../lib/nexusCore'
import { buildDre, groupByCategoria } from '../lib/finance'
import { MetricCard, PageHeader, PrimaryButton } from '../components/nexus/kit'
import { RecordsPage } from '../components/nexus/RecordsPage'
import { useToast } from '../components/ui/Toast'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const TABS = [
  { id: 'visao', path: '/financeiro', label: 'Visão geral' },
  { id: 'caixa', path: '/fluxo-caixa', label: 'Fluxo de caixa' },
  { id: 'pagar', path: '/contas-pagar', label: 'A pagar' },
  { id: 'receber', path: '/contas-receber', label: 'A receber' },
  { id: 'fat', path: '/faturamento', label: 'Faturamento' },
  { id: 'nf', path: '/notas-fiscais', label: 'Notas fiscais' },
  { id: 'dre', path: '/dre', label: 'DRE' },
]

export default function Financeiro() {
  const loc = useLocation()
  const toast = useToast()
  const { transacoes } = useNexusStore()
  const tab = TABS.find((t) => t.path === loc.pathname)?.id || 'visao'

  const receita = transacoes.items.filter((t) => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor || 0), 0)
  const despesa = transacoes.items.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor || 0), 0)
  const receber = transacoes.items.filter((t) => t.tipo === 'receber').reduce((s, t) => s + Number(t.valor || 0), 0)
  const pagar = transacoes.items.filter((t) => t.tipo === 'pagar').reduce((s, t) => s + Number(t.valor || 0), 0)
  const caixa = useMemo(
    () => ({ saldo: receita - despesa, projetado: receita - despesa + receber - pagar }),
    [receita, despesa, receber, pagar]
  )

  async function tentarNf() {
    const r = await getFiscalProvider().emitir({ clienteId: '', documento: '', descricao: 'Serviço', valor: 0 })
    toast.info(r.message)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Financeiro / ERP" subtitle="Fluxo interno da empresa. Emissão fiscal só via FiscalProvider." />
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <a key={t.id} href={t.path} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tab === t.id ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>{t.label}</a>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Receitas" value={money(receita)} />
        <MetricCard label="Despesas" value={money(despesa)} />
        <MetricCard label="A receber" value={money(receber)} />
        <MetricCard label="A pagar" value={money(pagar)} />
        <MetricCard label="Saldo" value={money(caixa.saldo)} />
        <MetricCard label="Saldo projetado" value={money(caixa.projetado)} />
      </div>
      {tab === 'dre' && (
        <div className="nexus-card p-4 text-sm space-y-1">
          {(() => {
            const dre = buildDre(transacoes.items)
            return (
              <>
                <p>Receita bruta {money(dre.receitaBruta)}</p>
                <p>(-) Deduções {money(dre.deducoes)}</p>
                <p>= Receita líquida {money(dre.receitaLiquida)}</p>
                <p>(-) Custos {money(dre.custos)}</p>
                <p>= Resultado bruto {money(dre.bruto)}</p>
                <p>(-) Despesas operacionais {money(dre.op)}</p>
                <p>= Resultado operacional {money(dre.operacional)}</p>
                <p>(+/-) Resultado financeiro {money(dre.financeiroNet)}</p>
                <p className="font-bold">= Resultado líquido {money(dre.liquido)}</p>
              </>
            )
          })()}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="nexus-card p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{ name: 'Período', Receita: receita, Despesas: despesa, Lucro: caixa.saldo }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="Receita" fill="#16a34a" /><Bar dataKey="Despesas" fill="#dc2626" /><Bar dataKey="Lucro" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="nexus-card p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={groupByCategoria(transacoes.items, 'despesa')} dataKey="value" nameKey="name" outerRadius={80}>
                {groupByCategoria(transacoes.items, 'despesa').map((_, i) => <Cell key={i} fill={['#06b6d4', '#7c3aed', '#f97316', '#2563eb'][i % 4]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {tab === 'nf' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          Notas ficam em rascunho até um provedor fiscal autorizado ser conectado.
          <PrimaryButton className="ml-3" onClick={tentarNf}>Tentar transmitir</PrimaryButton>
        </div>
      )}
      <RecordsPage
        storeKey="transacoes"
        title="Lançamentos"
        subtitle="Receber, pagar, receita, despesa, comissão, marketing e transferência."
        tabs={['todas', 'receita', 'despesa', 'receber', 'pagar', 'comissao']}
        statusField="tipo"
        fields={[
          { key: 'descricao', label: 'Descrição' },
          { key: 'tipo', label: 'Tipo', options: ['receita', 'despesa', 'receber', 'pagar', 'transferencia', 'comissao', 'investimento'] },
          { key: 'categoria', label: 'Categoria' },
          { key: 'centroCusto', label: 'Centro de custo' },
          { key: 'valor', label: 'Valor', type: 'number' },
          { key: 'clienteId', label: 'Cliente' },
        ]}
      />
    </div>
  )
}
