import { RecordsPage } from '../components/nexus/RecordsPage'
import { DOCUMENT_CATEGORIES } from '../types/nexus'

export default function Documentos() {
  return (
    <RecordsPage
      storeKey="documentos"
      title="Central de documentos"
      subtitle="Documentos de clientes e internos permanecem vinculados ao cadastro de origem."
      tabs={['todas', ...DOCUMENT_CATEGORIES]}
      statusField="categoria"
      fields={[
        { key: 'clienteNome', label: 'Cliente' },
        { key: 'categoria', label: 'Categoria', options: [...DOCUMENT_CATEGORIES] },
        { key: 'origem', label: 'Origem' },
        { key: 'funcionario', label: 'Responsável' },
        { key: 'propostaId', label: 'Proposta' },
        { key: 'produto', label: 'Produto' },
      ]}
    />
  )
}
