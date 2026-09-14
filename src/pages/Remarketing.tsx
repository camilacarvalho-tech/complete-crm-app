import { useMemo } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { RecordsPage } from '../components/nexus/RecordsPage'
import { MetricCard, PageHeader } from '../components/nexus/kit'
import { periodRange } from '../lib/nexusCore'

export default function Remarketing() {
  const { clientes, remarketing } = useNexusStore()
  const week = periodRange('7d')
  const parados = useMemo(
    () => clientes.items.filter((c) => String(c.pipelineStage || 'novo_lead') !== 'concluido' && String(c.pipelineStage) !== 'perdido'),
    [clientes.items]
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Remarketing" subtitle="Régua automática por etapa. Quem já converteu não deve receber disparo." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Regras" value={remarketing.items.length} />
        <MetricCard label="Elegíveis agora" value={parados.length} hint={`Janela ${week.from.toLocaleDateString('pt-BR')}`} />
      </div>
      <RecordsPage
        storeKey="remarketing"
        title="Regras da régua"
        subtitle="Dia 1 / 3 / 7 / 14 / 21 / 30 e condições de exclusão."
        fields={[
          { key: 'nome', label: 'Nome' },
          { key: 'dia', label: 'Dia', options: ['1', '3', '7', '14', '21', '30'] },
          { key: 'canal', label: 'Canal', options: ['trafego_pago', 'facebook', 'instagram', 'whatsapp', 'indicacao', 'follow_up', 'landing_page', 'site', 'google', 'organico', 'leads_monitor', 'campanha', 'api', 'manual'] },
          { key: 'produto', label: 'Produto' },
          { key: 'origem', label: 'Origem' },
          { key: 'etapa', label: 'Etapa do atendimento' },
          { key: 'excluirConvertidos', label: 'Excluir convertidos', options: ['sim', 'nao'] },
          { key: 'mensagem', label: 'Mensagem' },
          { key: 'status', label: 'Status', options: ['ativa', 'pausada'] },
        ]}
      />
    </div>
  )
}
