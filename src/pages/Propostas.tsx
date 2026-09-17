import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useNexusStore } from '../contexts/NexusStore'
import { EmptyState, ErrorBanner, LoadingBlock, PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { ClienteLink } from '../components/nexus/ClienteLink'
import { labelPt } from '../lib/uiPt'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'

const STATUS = ['rascunho', 'em_analise', 'enviada', 'aguardando_cliente', 'aprovada', 'reprovada', 'cancelada', 'concluida', 'finalizada']

export default function Propostas() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const clientePref = params.get('cliente') || ''
  const { usuario } = useAuth()
  const toast = useToast()
  const { propostas, clientes } = useNexusStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ clienteId: clientePref, produto: '', banco: '', valor: '', status: 'rascunho', responsavel: usuario?.nome || '' })
  const [saving, setSaving] = useState(false)

  const lista = useMemo(() => propostas.items.filter((p) => {
    const st = String(p.status || '').replace('recusada', 'reprovada')
    if (status && st !== status) return false
    if (q && !JSON.stringify(p).toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [propostas.items, q, status])

  async function salvar() {
    if (saving) return
    setSaving(true)
    try {
      const cli = clientes.items.find((c) => c.id === form.clienteId)
      await propostas.create({
        ...form,
        clienteNome: cli?.nome || '',
        cpf: cli?.cpf || '',
        origemLead: cli?.origemLead || cli?.origem || cli?.source,
        campanha: cli?.campanhaNome || cli?.campanha,
        clienteId: form.clienteId,
        status: form.status === 'recusada' ? 'reprovada' : form.status,
      } as any)
      toast.success('Proposta registrada')
      setOpen(false)
    } catch (e) {
      toast.error('Não foi possível salvar', e instanceof Error ? e.message : '')
    } finally {
      setSaving(false)
    }
  }

  if (propostas.loading) return <LoadingBlock label="Carregando propostas..." />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Propostas"
        subtitle="Propostas do tenant. Clique no cliente para abrir a ficha 360°."
        actions={<PrimaryButton onClick={() => setOpen(true)}>Nova proposta</PrimaryButton>}
      />
      <ErrorBanner message={propostas.error} />
      <div className="flex flex-wrap gap-2">
        <TextInput className="max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar cliente, produto, banco" />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s} value={s}>{labelPt(s)}</option>)}
        </SelectInput>
      </div>

      {lista.length === 0 ? (
        <EmptyState title="Nenhuma proposta neste filtro" description="Não há dados para este período." />
      ) : (
        <div className="nexus-card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Produto</th>
                <th className="p-3 text-left">Responsável</th>
                <th className="p-3 text-left">Banco</th>
                <th className="p-3 text-left">Valor</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-b cursor-pointer" style={{ borderColor: 'var(--code-border)' }} onClick={() => p.clienteId && nav(`/clientes?id=${p.clienteId}`)}>
                  <td className="p-3"><ClienteLink id={p.clienteId} nome={p.clienteNome || p.clienteId} /></td>
                  <td className="p-3">{String(p.produto || '—')}</td>
                  <td className="p-3">{String(p.responsavel || '—')}</td>
                  <td className="p-3">{String(p.banco || '—')}</td>
                  <td className="p-3">{String(p.valor || '—')}</td>
                  <td className="p-3">{labelPt(String(p.status).replace('recusada', 'reprovada'))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <NexusModal title="Nova proposta" onClose={() => !saving && setOpen(false)} onSave={() => void salvar()} saving={saving} closeOnBackdrop={false}>
          <label className="text-xs font-semibold block mb-2">Cliente
            <SelectInput className="w-full" value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Selecione</option>
              {clientes.items.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </SelectInput>
          </label>
          <label className="text-xs font-semibold block mb-2">Produto
            <TextInput value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Banco
            <TextInput value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Valor
            <TextInput type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Status
            <SelectInput className="w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS.map((s) => <option key={s} value={s}>{labelPt(s)}</option>)}
            </SelectInput>
          </label>
          <label className="text-xs font-semibold block mb-2">Responsável
            <TextInput value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </label>
        </NexusModal>
      )}
    </div>
  )
}
