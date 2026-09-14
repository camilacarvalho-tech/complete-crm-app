import { RecordsPage } from '../components/nexus/RecordsPage'
export default function Estoque() {
  return <RecordsPage storeKey="estoque" title="Estoque" subtitle="Opcional. Produtos de crédito não exigem estoque físico." fields={[
    { key: 'produto', label: 'Produto' }, { key: 'tipo', label: 'Tipo', options: ['entrada', 'saida', 'ajuste'] }, { key: 'quantidade', label: 'Qtd', type: 'number' }, { key: 'custo', label: 'Custo' }, { key: 'minimo', label: 'Mínimo' },
  ]} />
}
