import { RecordsPage } from '../components/nexus/RecordsPage'
export default function Contratos() {
  return <RecordsPage storeKey="contratos" title="Contratos" subtitle="Contrato vinculado a cliente/proposta. Sem produção inventada." tabs={['todas', 'rascunho', 'ativo', 'pago', 'cancelado']} fields={[
    { key: 'clienteNome', label: 'Cliente' }, { key: 'clienteId', label: 'ID cliente' }, { key: 'propostaId', label: 'Proposta' }, { key: 'produto', label: 'Produto' }, { key: 'valor', label: 'Valor' }, { key: 'status', label: 'Status', options: ['rascunho', 'gerado', 'enviado', 'assinado', 'ativo', 'pago', 'cancelado', 'concluido'] },
  ]} />
}
