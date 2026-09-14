import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { EmptyState, GhostButton, PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { ClienteLink } from '../components/nexus/ClienteLink'
import { labelPt } from '../lib/uiPt'
import { useToast } from '../components/ui/Toast'

const FILTROS = [
  { id: 'minhas', label: 'Minhas tarefas' },
  { id: 'equipe', label: 'Tarefas da equipe' },
  { id: 'atrasadas', label: 'Atrasadas' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'proximas', label: 'Próximas' },
  { id: 'concluidas', label: 'Concluídas' },
]

export default function Tarefas() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { agenda, clientes } = useNexusStore()
  const [filtro, setFiltro] = useState('minhas')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titulo: '', clienteId: '', prioridade: 'normal', data: '', observacao: '', responsavel: usuario?.nome || '' })

  const hoje = new Date().toISOString().slice(0, 10)
  const items = agenda.items.filter((a) => String(a.tipo || 'tarefa') === 'tarefa' || !a.tipo)
  const lista = useMemo(() => items.filter((t) => {
    const data = String(t.data || '').slice(0, 10)
    const st = String(t.status || 'aberto')
    if (filtro === 'minhas' && String(t.responsavel || '') !== usuario?.nome) return false
    if (filtro === 'atrasadas' && !(data && data < hoje && st !== 'concluido')) return false
    if (filtro === 'hoje' && data !== hoje) return false
    if (filtro === 'proximas' && !(data && data > hoje)) return false
    if (filtro === 'concluidas' && st !== 'concluido') return false
    return true
  }), [items, filtro, usuario?.nome, hoje])

  async function salvar() {
    if (!form.titulo.trim()) return toast.error('Informe o título')
    if (saving) return
    setSaving(true)
    try {
      await agenda.create({ ...form, tipo: 'tarefa', status: 'aberto' } as any)
      toast.success('Tarefa criada')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Tarefas" subtitle="Prioridade, prazo e cliente vinculados. Sem dados fictícios." actions={<PrimaryButton onClick={() => setOpen(true)}>Nova tarefa</PrimaryButton>} />
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFiltro(f.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filtro === f.id ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`}>{f.label}</button>
        ))}
      </div>
      {lista.length === 0 ? (
        <EmptyState title="Nenhuma tarefa neste filtro" description="Não há dados para este período." />
      ) : (
        <div className="nexus-card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left">Tarefa</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3">Prioridade</th>
                <th className="p-3">Prazo</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => {
                const cli = clientes.items.find((c) => c.id === t.clienteId)
                return (
                  <tr key={t.id} className="border-b" style={{ borderColor: 'var(--code-border)' }}>
                    <td className="p-3 font-medium">{String(t.titulo)}</td>
                    <td className="p-3">{cli ? <ClienteLink id={cli.id} nome={cli.nome} /> : '—'}</td>
                    <td className="p-3 text-center">{String(t.prioridade || 'normal')}</td>
                    <td className="p-3 text-center">{String(t.data || '—')}</td>
                    <td className="p-3">{String(t.responsavel || '—')}</td>
                    <td className="p-3">{labelPt(String(t.status || 'aberto'))}
                      {String(t.status) !== 'concluido' && <GhostButton className="ml-2" onClick={() => agenda.update(t.id, { status: 'concluido' })}>Concluir</GhostButton>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <NexusModal title="Nova tarefa" onClose={() => !saving && setOpen(false)} onSave={() => void salvar()} saving={saving} closeOnBackdrop={false}>
          <label className="text-xs font-semibold block mb-2">Título<TextInput value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></label>
          <label className="text-xs font-semibold block mb-2">Cliente
            <SelectInput className="w-full" value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Selecione</option>
              {clientes.items.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </SelectInput>
          </label>
          <label className="text-xs font-semibold block mb-2">Prazo<TextInput type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
          <label className="text-xs font-semibold block mb-2">Prioridade
            <SelectInput className="w-full" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </SelectInput>
          </label>
          <label className="text-xs font-semibold block mb-2">Observação<TextInput value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></label>
        </NexusModal>
      )}
    </div>
  )
}
