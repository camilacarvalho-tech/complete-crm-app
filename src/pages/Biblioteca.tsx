import { RecordsPage } from '../components/nexus/RecordsPage'

export default function Biblioteca() {
  return (
    <RecordsPage
      storeKey="biblioteca"
      title="Biblioteca"
      subtitle="Central de recursos reutilizáveis: templates, scripts, manuais, prompts e materiais."
      tabs={['todas', 'Campanhas', 'Templates', 'Documentos', 'Scripts', 'Manuais', 'Prompts', 'Contratos']}
      statusField="categoria"
      fields={[
        { key: 'nome', label: 'Nome' },
        { key: 'categoria', label: 'Categoria', options: ['Campanhas', 'Templates', 'Documentos', 'Scripts', 'Manuais', 'Materiais comerciais', 'PDFs', 'Contratos', 'Modelos', 'Prompts'] },
        { key: 'tags', label: 'Tags' },
        { key: 'versao', label: 'Versão' },
        { key: 'permissao', label: 'Permissão', options: ['empresa', 'equipe', 'admin'] },
        { key: 'url', label: 'URL / arquivo' },
      ]}
    />
  )
}
