import { RecordsPage } from '../components/nexus/RecordsPage'
import { PageHeader, PrimaryButton } from '../components/nexus/kit'
import { CONVENIOS_PADRAO } from '../catalog/crmCatalog'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { INSTITUTION_ADAPTERS } from '../integrations/banks/registry'

export default function BancosConvenios() {
  const { convenios } = useNexusStore()
  const toast = useToast()
  return (
    <div className="space-y-3">
      <PageHeader
        title="Bancos / Convênios"
        subtitle="Instituições com adapter: FACTA, NOVO SAQUE, ICRED, TOKE REAL. INSS é produto, não banco."
        actions={
          <PrimaryButton onClick={async () => {
            for (const c of CONVENIOS_PADRAO) {
              if (!convenios.items.some((x) => x.codigo === c.code)) await convenios.create({ codigo: c.code, nome: c.label, ativo: true } as any)
            }
            toast.success('Convênios padrão importados')
          }}>Importar convênios padrão</PrimaryButton>
        }
      />
      <div className="nexus-card p-4 text-sm space-y-2 max-w-xl">
        <p className="font-semibold">APIs das instituições</p>
        {INSTITUTION_ADAPTERS.map((a) => (
          <p key={a.id}>
            {a.name}
            <br />
            <b>{a.isConfigured() ? '● API configurada' : '● API não configurada'}</b>
          </p>
        ))}
      </div>
      <RecordsPage
        storeKey="convenios"
        title="Convênios / público"
        subtitle="Cadastro de convênios. INSS como produto está em Produtos, não nesta lista de instituições."
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
        subtitle="Somente Facta, Novo Saque, ICRED e Toke Real. Credenciais só no backend."
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
