import { RecordsPage } from '../components/nexus/RecordsPage'
export default function Fornecedores() {
  return <RecordsPage storeKey="fornecedores" title="Fornecedores" subtitle="Cadastro do tenant para contas a pagar." fields={[
    { key: 'razaoSocial', label: 'Razão social' }, { key: 'nomeFantasia', label: 'Nome fantasia' }, { key: 'cnpj', label: 'CNPJ' }, { key: 'telefone', label: 'Telefone' }, { key: 'email', label: 'E-mail' }, { key: 'cidade', label: 'Cidade' },
  ]} />
}
