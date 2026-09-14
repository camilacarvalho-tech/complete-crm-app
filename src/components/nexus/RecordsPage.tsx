import { useState } from 'react'
import { useNexusStore } from '../../contexts/NexusStore'
import { useAuth } from '../../contexts/AuthContext'
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, PrimaryButton, SelectInput, TextInput } from './kit'
import { NexusModal } from './Modal'
import { useToast } from '../ui/Toast'
import { ClienteLink } from './ClienteLink'
import { labelPt } from '../../lib/uiPt'

type StoreKey =
  | 'propostas'
  | 'digitacoes'
  | 'campanhas'
  | 'documentos'
  | 'transacoes'
  | 'ligacoes'
  | 'bancos'
  | 'automacoes'
  | 'remarketing'
  | 'agenda'
  | 'biblioteca'
  | 'usuariosEmpresa'
  | 'produtos'
  | 'estoque'
  | 'fornecedores'
  | 'comissoes'
  | 'contratos'
  | 'equipes'
  | 'convenios'
  | 'viewsSalvas'
  | 'etiquetas'

export function RecordsPage({
  storeKey,
  title,
  subtitle,
  fields,
  tabs,
  statusField = 'status',
}: {
  storeKey: StoreKey
  title: string
  subtitle: string
  fields: { key: string; label: string; type?: string; options?: string[] }[]
  tabs?: string[]
  statusField?: string
}) {
  const store = useNexusStore()
  const col = store[storeKey]
  const { usuario } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState(tabs?.[0] || 'todas')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const items = col.items.filter((item) => {
    if (tabs && tab !== 'todas' && String(item[statusField] || '').toLowerCase() !== tab.toLowerCase()) return false
    if (!q) return true
    return JSON.stringify(item).toLowerCase().includes(q.toLowerCase())
  })

  async function onSubmit() {
    if (saving) return
    setSaving(true)
    try {
      await col.create({ ...form, criadoPor: usuario?.nome } as Omit<NexusRecord, 'id'>)
      toast.success('Registro criado')
      setOpen(false)
      setForm({})
    } catch (err) {
      toast.error('Não foi possível salvar', err instanceof Error ? err.message : '')
    } finally {
      setSaving(false)
    }
  }

  if (col.loading) return <LoadingBlock />

  return (
    <div className="space-y-3">
      <PageHeader title={title} subtitle={subtitle} actions={<PrimaryButton onClick={() => setOpen(true)}>Novo</PrimaryButton>} />
      <ErrorBanner message={col.error} />
      <div className="flex flex-wrap gap-2">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar" className="max-w-sm" />
        {tabs?.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-2 py-1 rounded text-xs ${tab === t ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`}>{labelPt(t)}</button>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nenhum registro" description="Os dados desta tela são os da empresa logada. Nada aqui é inventado." />
      ) : (
        <div className="nexus-card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                {fields.slice(0, 6).map((f) => <th key={f.key} className="p-3">{f.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  {fields.slice(0, 6).map((f) => (
                    <td key={f.key} className="p-3">
                      {f.key === 'clienteNome' || f.key === 'clienteId'
                        ? <ClienteLink id={item.clienteId || item[f.key]} nome={item.clienteNome || item[f.key]} />
                        : String(item[f.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <NexusModal title="Novo registro" onClose={() => !saving && setOpen(false)} onSave={() => void onSubmit()} saving={saving} closeOnBackdrop={false}>
          {fields.map((f) => (
            <label key={f.key} className="text-xs font-semibold block mb-2" style={{ color: 'var(--code-muted)' }}>
              {f.label}
              {f.options ? (
                <SelectInput className="w-full" value={form[f.key] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}>
                  <option value="">Selecione</option>
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </SelectInput>
              ) : (
                <TextInput type={f.type || 'text'} value={form[f.key] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
              )}
            </label>
          ))}
        </NexusModal>
      )}
    </div>
  )
}
