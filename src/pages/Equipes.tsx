import { RecordsPage } from '../components/nexus/RecordsPage'
export default function Equipes() {
  return <RecordsPage storeKey="equipes" title="Equipes" subtitle="Times do tenant para atribuição de leads e chat." fields={[
    { key: 'nome', label: 'Nome' }, { key: 'departamento', label: 'Departamento' }, { key: 'lider', label: 'Líder' }, { key: 'status', label: 'Status', options: ['ativa', 'inativa'] },
  ]} />
}
