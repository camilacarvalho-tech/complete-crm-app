import { RecordsPage } from '../components/nexus/RecordsPage'
import { PageHeader, PrimaryButton } from '../components/nexus/kit'
import { CONVENIOS_PADRAO } from '../catalog/crmCatalog'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'

export default function BancosConvenios() {
  const { convenios } = useNexusStore()
  const toast = useToast()
  return (
    <div className="space-y-3">
      <PageHeader
        title="Bancos / Convênios"
        subtitle="Cadastro de regras por banco. Cálculos ficam no provider. Convênios/público são cadastráveis pelo administrador."
        actions={
          <PrimaryButton onClick={async () => {
            for (const c of CONVENIOS_PADRAO) {
              if (!convenios.items.some((x) => x.codigo === c.code)) await convenios.create({ codigo: c.code, nome: c.label, ativo: true } as any)
            }
            toast.success('Convênios padrão importados')
          }}>Importar convênios padrão</PrimaryButton>
        }
      />
      <p className="text-xs uppercase font-bold" style={{ color: 'var(--code-muted)' }}>Bancos · Convênios · Produtos · Regras · Compatibilidades · Configurações · Sincronização · Logs — credenciais somente no backend.</p>
      <RecordsPage
        storeKey="convenios"
        title="Convênios / público"
        subtitle="Servidor municipal, forças e governos. Cadastre novos sem limite."
        fields={[
          { key: 'codigo', label: 'Código' },
          { key: 'nome', label: 'Nome' },
          { key: 'status', label: 'Status', options: ['ativo', 'inativo'] },
          { key: 'uf', label: 'UF' },
        ]}
      />
      <RecordsPage
        storeKey="bancos"
        title="Instituições"
        subtitle="Ative um BankProvider real em Configurações quando a credencial existir."
        fields={[
          { key: 'nome', label: 'Nome' },
          { key: 'codigo', label: 'Código' },
          { key: 'status', label: 'Status', options: ['ativo', 'inativo'] },
          { key: 'produtos', label: 'Produtos' },
          { key: 'convenios', label: 'Convênios' },
          { key: 'providerId', label: 'Provider' },
        ]}
      />
    </div>
  )
}
