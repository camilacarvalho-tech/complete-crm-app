import { RecordsPage } from '../components/nexus/RecordsPage'
import { PRODUTOS_RECOMECE_EXISTENTES } from '../catalog/produtosRecomece'
import { useNexusStore } from '../contexts/NexusStore'
import { PageHeader, PrimaryButton } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'

export default function Produtos() {
  const { produtos } = useNexusStore()
  const toast = useToast()
  async function importarCatalogo() {
    for (const p of PRODUTOS_RECOMECE_EXISTENTES) {
      const exists = produtos.items.some((i) => i.codigo === p.codigo)
      if (!exists) await produtos.create({ ...p, origem: 'catalogo_existente', ativo: true } as any)
    }
    toast.success('Catálogo existente importado (somente produtos já usados no CRM).')
  }
  return (
    <div className="space-y-3">
      <PageHeader title="Produtos" subtitle="Catálogo orientado a produto. Importa nomes já presentes no sistema." actions={<PrimaryButton onClick={importarCatalogo}>Importar catálogo existente</PrimaryButton>} />
      <RecordsPage storeKey="produtos" title="Itens" subtitle="Ative/inative por tenant. Regras de taxa vêm do BankProvider, não da tela." fields={[
        { key: 'codigo', label: 'Código' },
        { key: 'nome', label: 'Nome' },
        { key: 'categoria', label: 'Categoria' },
        { key: 'ativo', label: 'Ativo', options: ['true', 'false'] },
        { key: 'parent', label: 'Produto pai' },
        { key: 'subproduto', label: 'Subproduto' },
        { key: 'convenios', label: 'Convênios' },
        { key: 'bancos', label: 'Bancos compatíveis' },
        { key: 'documentos', label: 'Documentos' },
        { key: 'requisitos', label: 'Requisitos' },
        { key: 'comissao', label: 'Comissão' },
        { key: 'taxas', label: 'Taxas' },
        { key: 'prazo', label: 'Prazo' },
        { key: 'etapas', label: 'Etapas' },
      ]} />
    </div>
  )
}
