import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNexusStore } from '../../contexts/NexusStore'
import { useAuth } from '../../contexts/AuthContext'
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, PrimaryButton, SelectInput, TextInput } from './kit'
import { NexusModal } from './Modal'
import { useToast } from '../ui/Toast'
import { ClienteLink } from './ClienteLink'
import { labelPt } from '../../lib/uiPt'
import type { NexusRecord } from '../../types/nexus'

function optValue(o: string | { value: string; label: string }) {
  return typeof o === 'string' ? o : o.value
}

function optLabel(o: string | { value: string; label: string }) {
  return typeof o === 'string' ? labelPt(o) : o.label
}

function mostrarCampo(f: { options?: Array<string | { value: string; label: string }> }, raw: unknown) {
  const text = String(raw ?? '').trim()
  if (!text) return '—'
  const hit = f.options?.find((o) => optValue(o) === text)
  if (hit) return optLabel(hit)
  if (/^[a-z0-9_.]+$/.test(text) || text === text.toUpperCase()) return labelPt(text)
  return text
}

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
  compact = false,
  scroll = false,
  editable = false,
}: {
  storeKey: StoreKey
  title: string
  subtitle: string
  fields: { key: string; label: string; type?: string; options?: Array<string | { value: string; label: string }> }[]
  tabs?: string[]
  statusField?: string
  compact?: boolean
  scroll?: boolean
  editable?: boolean
}) {
  const store = useNexusStore()
  const col = store[storeKey]
  const { usuario } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(tabs?.[0] || 'todas')
  const [q, setQ] = useState(params.get('q') || '')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
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
      if (editId) await col.update(editId, form)
      else await col.create({ ...form, criadoPor: usuario?.nome } as Omit<NexusRecord, 'id'>)
      toast.success(editId ? 'Registro atualizado' : 'Registro criado')
      setOpen(false)
      setEditId(null)
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
        <div className={`nexus-card ${scroll ? 'overflow-x-auto' : 'overflow-auto'}`}>
          <table className="text-sm" style={{ width: '100%', minWidth: scroll ? 1100 : undefined }}>
            <thead>
              <tr className="text-left text-slate-500 border-b">
                {(scroll ? fields : fields.slice(0, 6)).map((f) => <th key={f.key} className="p-3">{f.label}</th>)}
                {editable ? <th className="p-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  {(scroll ? fields : fields.slice(0, 6)).map((f) => (
                    <td key={f.key} className="p-3">
                      {f.key === 'clienteNome' || f.key === 'clienteId'
                        ? <ClienteLink id={item.clienteId || item[f.key]} nome={item.clienteNome || item[f.key]} />
                        : mostrarCampo(f, item[f.key])}
                    </td>
                  ))}
                  {editable ? (
                    <td className="p-3">
                      <button type="button" className="text-xs font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => {
                        const next: Record<string, string> = {}
                        fields.forEach((f) => { next[f.key] = String(item[f.key] || '') })
                        setForm(next)
                        setEditId(item.id)
                        setOpen(true)
                      }}>Editar</button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <NexusModal compact={compact} title={editId ? 'Editar' : 'Novo registro'} onClose={() => { if (saving) return; setOpen(false); setEditId(null) }} onSave={() => void onSubmit()} saving={saving} closeOnBackdrop={false}>
          {fields.map((f) => (
            <label key={f.key} className="text-xs font-semibold block mb-2" style={{ color: 'var(--code-muted)' }}>
              {f.label}
              {f.options ? (
                <SelectInput className="w-full" value={form[f.key] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}>
                  <option value="">Selecione</option>
                  {f.options.map((o) => <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}
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
