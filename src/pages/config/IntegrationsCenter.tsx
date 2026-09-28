import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTenantCollection } from '../../hooks/useTenantCollection'
import { canManageIntegrations } from '../../lib/nexusCore'
import { INSTITUTION_ADAPTERS } from '../../integrations/banks/registry'
import { IntegrationsHub } from '../../integrations/crm/IntegrationsHub'
import { GhostButton, PrimaryButton, SelectInput, TextInput } from '../../components/nexus/kit'
import { useToast } from '../../components/ui/Toast'

type Row = {
  id: string
  tipo: string
  nome?: string
  appId?: string
  phoneNumberId?: string
  wabaId?: string
  businessId?: string
  pagina?: string
  provedor?: string
  apiUrl?: string
  accountId?: string
  sender?: string
  numero?: string
  ramal?: string
  codigo?: string
  endpoint?: string
  ambiente?: string
  clientId?: string
  descricao?: string
  status?: string
}

const STATUS = [
  { id: 'nao_configurado', label: 'Não configurado' },
  { id: 'ativo', label: 'Ativo' },
  { id: 'inativo', label: 'Inativo' },
]

const SEEDS: Array<Partial<Row> & { tipo: string; nome: string }> = [
  { tipo: 'whatsapp', nome: 'Meta WhatsApp Cloud API' },
  { tipo: 'meta', nome: 'Meta' },
  { tipo: 'instagram', nome: 'Instagram' },
  { tipo: 'sms', nome: 'SMS' },
  { tipo: 'voip', nome: 'VoIP' },
]

function statusLabel(value?: string) {
  return STATUS.find((s) => s.id === value)?.label || 'Não configurado'
}

export function IntegrationsCenter() {
  const { usuario } = useAuth()
  const toast = useToast()
  const col = useTenantCollection<Row>('integracoesConfig', [])
  const canEdit = canManageIntegrations(usuario?.perfil)
  const [banco, setBanco] = useState({ nome: '', codigo: '', apiUrl: '', endpoint: '', ambiente: 'homologacao', clientId: '', status: 'nao_configurado' })
  const [outro, setOutro] = useState({ nome: '', apiUrl: '', descricao: '', status: 'nao_configurado' })

  function byTipo(tipo: string) {
    return col.items.find((i) => i.tipo === tipo)
  }

  async function save(tipo: string, nome: string, patch: Partial<Row>) {
    if (!canEdit) return toast.error('Somente administrador ou gestor altera integrações.')
    const clean = { ...patch }
    delete (clean as { token?: string }).token
    const current = byTipo(tipo)
    if (current) await col.update(current.id, clean)
    else await col.create({ tipo, nome, status: 'nao_configurado', ...clean })
    toast.success('Configuração salva. Segredos não são gravados nesta tela.')
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
        Tokens, App Secret e access token da Meta ficam nas variáveis META_* da Function, nunca nesta tela.
        Webhook: https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/metaWhatsAppWebhook?empresaId=SUA_EMPRESA
      </p>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {SEEDS.map((seed) => {
          const row = byTipo(seed.tipo)
          return (
            <IntegrationCard
              key={seed.tipo}
              title={seed.nome}
              status={statusLabel(row?.status)}
              canEdit={canEdit}
              onSave={(patch) => void save(seed.tipo, seed.nome, patch)}
              fields={fieldsFor(seed.tipo)}
            />
          )
        })}
      </div>

      <section className="nexus-card p-3 space-y-2">
        <h3 className="text-sm font-semibold">APIs bancárias</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr>
                <th className="p-2 text-left">Banco</th>
                <th className="p-2 text-left">API</th>
                <th className="p-2 text-left">Ambiente</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Ação</th>
              </tr>
            </thead>
            <tbody>
              {INSTITUTION_ADAPTERS.map((a) => (
                <tr key={a.id} className="border-t" style={{ borderColor: 'var(--code-border)' }}>
                  <td className="p-2">{a.name}</td>
                  <td className="p-2">Adapter</td>
                  <td className="p-2">Backend</td>
                  <td className="p-2">{a.isConfigured() ? 'Ativo' : 'Não configurado'}</td>
                  <td className="p-2" style={{ color: 'var(--code-muted)' }}>Credencial no servidor</td>
                </tr>
              ))}
              {col.items.filter((i) => i.tipo === 'banco').map((b) => (
                <tr key={b.id} className="border-t" style={{ borderColor: 'var(--code-border)' }}>
                  <td className="p-2">{b.nome}</td>
                  <td className="p-2">{b.apiUrl || '—'}</td>
                  <td className="p-2">{b.ambiente || '—'}</td>
                  <td className="p-2">{statusLabel(b.status)}</td>
                  <td className="p-2">
                    {canEdit && (
                      <GhostButton type="button" onClick={() => void col.update(b.id, { status: b.status === 'ativo' ? 'inativo' : 'ativo' })}>
                        {b.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      </GhostButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="grid md:grid-cols-3 gap-2">
            <TextInput placeholder="Nome do banco" value={banco.nome} onChange={(e) => setBanco({ ...banco, nome: e.target.value })} />
            <TextInput placeholder="Código" value={banco.codigo} onChange={(e) => setBanco({ ...banco, codigo: e.target.value })} />
            <TextInput placeholder="API URL" value={banco.apiUrl} onChange={(e) => setBanco({ ...banco, apiUrl: e.target.value })} />
            <TextInput placeholder="Endpoint" value={banco.endpoint} onChange={(e) => setBanco({ ...banco, endpoint: e.target.value })} />
            <SelectInput value={banco.ambiente} onChange={(e) => setBanco({ ...banco, ambiente: e.target.value })}>
              <option value="homologacao">Homologação</option>
              <option value="producao">Produção</option>
            </SelectInput>
            <TextInput placeholder="Client ID" value={banco.clientId} onChange={(e) => setBanco({ ...banco, clientId: e.target.value })} />
            <PrimaryButton onClick={() => void col.create({ tipo: 'banco', ...banco }).then(() => toast.success('Banco adicionado'))}>Adicionar banco</PrimaryButton>
          </div>
        )}
      </section>

      <section className="nexus-card p-3 space-y-2">
        <h3 className="text-sm font-semibold">Outros</h3>
        {col.items.filter((i) => i.tipo === 'outro').map((o) => (
          <p key={o.id} className="text-sm">{o.nome} · {statusLabel(o.status)} · {o.apiUrl}</p>
        ))}
        {canEdit && (
          <div className="grid md:grid-cols-2 gap-2">
            <TextInput placeholder="Nome" value={outro.nome} onChange={(e) => setOutro({ ...outro, nome: e.target.value })} />
            <TextInput placeholder="URL/API" value={outro.apiUrl} onChange={(e) => setOutro({ ...outro, apiUrl: e.target.value })} />
            <TextInput placeholder="Descrição" value={outro.descricao} onChange={(e) => setOutro({ ...outro, descricao: e.target.value })} />
            <PrimaryButton onClick={() => outro.nome && void col.create({ tipo: 'outro', ...outro }).then(() => toast.success('Integração adicionada'))}>Adicionar</PrimaryButton>
          </div>
        )}
      </section>

      <IntegrationsHub empresaId={usuario?.empresaId} />
    </div>
  )
}

function fieldsFor(tipo: string): { key: keyof Row; label: string }[] {
  if (tipo === 'whatsapp') return [
    { key: 'appId', label: 'App ID' },
    { key: 'phoneNumberId', label: 'Phone Number ID' },
    { key: 'wabaId', label: 'WABA ID' },
  ]
  if (tipo === 'meta') return [
    { key: 'appId', label: 'App ID' },
    { key: 'businessId', label: 'Business ID' },
    { key: 'pagina', label: 'Página' },
  ]
  if (tipo === 'instagram') return [{ key: 'accountId', label: 'Account ID' }]
  if (tipo === 'sms') return [
    { key: 'provedor', label: 'Provedor' },
    { key: 'apiUrl', label: 'API URL' },
    { key: 'accountId', label: 'Account ID' },
    { key: 'sender', label: 'Sender' },
  ]
  return [
    { key: 'provedor', label: 'Provedor' },
    { key: 'apiUrl', label: 'API URL' },
    { key: 'accountId', label: 'Account ID' },
    { key: 'numero', label: 'Número' },
    { key: 'ramal', label: 'Ramal' },
  ]
}

function IntegrationCard({
  title,
  status,
  fields,
  canEdit,
  onSave,
}: {
  title: string
  status: string
  fields: { key: keyof Row; label: string }[]
  canEdit: boolean
  onSave: (patch: Partial<Row>) => void
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [st, setSt] = useState('nao_configurado')
  return (
    <div className="nexus-card p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-[11px]">{status}</span>
      </div>
      {fields.map((f) => (
        <label key={String(f.key)} className="block text-[11px]">
          {f.label}
          <TextInput
            disabled={!canEdit}
            value={form[String(f.key)] || ''}
            onChange={(e) => setForm({ ...form, [String(f.key)]: e.target.value })}
          />
        </label>
      ))}
      <SelectInput disabled={!canEdit} value={st} onChange={(e) => setSt(e.target.value)}>
        {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </SelectInput>
      {canEdit && <GhostButton type="button" onClick={() => onSave({ ...form, status: st })}>Salvar</GhostButton>}
    </div>
  )
}
