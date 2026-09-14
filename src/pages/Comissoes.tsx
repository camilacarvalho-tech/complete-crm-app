import { RecordsPage } from '../components/nexus/RecordsPage'
export default function Comissoes() {
  return <RecordsPage storeKey="comissoes" title="Comissões" subtitle="Prevista / recebida a partir de proposta e produção reais." tabs={['todas', 'prevista', 'pendente', 'aprovada', 'recebida', 'cancelada']} fields={[
    { key: 'funcionario', label: 'Funcionário' }, { key: 'propostaId', label: 'Proposta' }, { key: 'produto', label: 'Produto' }, { key: 'banco', label: 'Banco' }, { key: 'valor', label: 'Valor', type: 'number' }, { key: 'status', label: 'Status', options: ['prevista', 'pendente', 'aprovada', 'recebida', 'cancelada'] },
  ]} />
}
