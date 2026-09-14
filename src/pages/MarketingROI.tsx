import { useMemo } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { RecordsPage } from '../components/nexus/RecordsPage'
import { MetricCard, PageHeader } from '../components/nexus/kit'
import { money } from '../lib/nexusCore'

export default function MarketingROI() {
  const { transacoes, clientes, propostas } = useNexusStore()
  const receita = transacoes.items.filter((t) => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor || 0), 0)
  const custos = transacoes.items.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor || 0), 0)
  const mkt = transacoes.items.filter((t) => t.categoria === 'marketing').reduce((s, t) => s + Number(t.valor || 0), 0)
  const leads = clientes.items.length
  const conv = propostas.items.filter((p) => String(p.status) === 'aprovada').length
  const metrics = useMemo(() => ({
    roi: mkt ? ((receita - mkt) / mkt) * 100 : 0,
    cac: conv ? mkt / conv : 0,
    cpl: leads ? mkt / leads : 0,
  }), [mkt, receita, conv, leads])

  return (
    <div className="space-y-4">
      <PageHeader title="Marketing ROI" subtitle="Investimento, receita e custos reais do tenant. Sem números fictícios." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Receita" value={money(receita)} />
        <MetricCard label="Custos" value={money(custos)} />
        <MetricCard label="Investimento ads" value={money(mkt)} />
        <MetricCard label="Lucro" value={money(receita - custos)} />
        {mkt ? (
          <>
            <MetricCard label="ROI" value={`${metrics.roi.toFixed(1)}%`} />
            <MetricCard label="CAC" value={money(metrics.cac)} />
            <MetricCard label="CPL" value={money(metrics.cpl)} />
          </>
        ) : (
          <MetricCard label="ROI / CAC / CPL" value="Dados insuficientes" hint="Cadastre investimento de marketing para calcular automaticamente." />
        )}
        <MetricCard label="Leads" value={leads} />
      </div>
      <RecordsPage
        storeKey="transacoes"
        title="Lançamentos de marketing e operação"
        subtitle="Classifique categoria = marketing para entrar no ROI."
        fields={[
          { key: 'descricao', label: 'Descrição' },
          { key: 'tipo', label: 'Tipo', options: ['receita', 'despesa'] },
          { key: 'categoria', label: 'Categoria', options: ['marketing', 'meta_ads', 'google_ads', 'whatsapp', 'sms', 'comissao', 'software', 'infra', 'outros'] },
          { key: 'valor', label: 'Valor', type: 'number' },
          { key: 'canal', label: 'Canal' },
          { key: 'campanhaId', label: 'Campanha' },
        ]}
      />
    </div>
  )
}
