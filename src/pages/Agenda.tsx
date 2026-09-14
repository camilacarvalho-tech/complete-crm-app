import { useMemo, useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { EmptyState, PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { ClienteLink } from '../components/nexus/ClienteLink'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { labelPt } from '../lib/uiPt'

export default function Agenda() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { agenda, clientes } = useNexusStore()
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('semana')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titulo: '', tipo: 'compromisso', data: '', clienteId: '', observacao: '', responsavel: usuario?.nome || '' })

  const items = useMemo(() => [...agenda.items].sort((a, b) => String(a.data || '').localeCompare(String(b.data || ''))), [agenda.items])

  async function salvar() {
    if (!form.titulo.trim()) return toast.error('Informe o título')
    if (saving) return
    setSaving(true)
    try {
      await agenda.create({ ...form, status: 'aberto' } as any)
      toast.success('Compromisso criado')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Agenda" subtitle="Dia, semana e mês. Compromissos reais do tenant." actions={<PrimaryButton onClick={() => setOpen(true)}>Novo compromisso</PrimaryButton>} />
      <div className="flex gap-2">
        {(['dia', 'semana', 'mes'] as const).map((v) => (
          <button key={v} type="button" className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`} onClick={() => setView(v)}>{v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'}</button>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nenhum compromisso" description="Não há dados para este período." />
      ) : (
        <div className="nexus-card divide-y" style={{ borderColor: 'var(--code-border)' }}>
          {items.map((a) => {
            const cli = clientes.items.find((c) => c.id === a.clienteId)
            return (
              <div key={a.id} className="p-4 grid md:grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="font-semibold">{String(a.titulo)}</p>
                  <p style={{ color: 'var(--code-muted)' }}>{labelPt(String(a.tipo))} · {String(a.data || '—')}</p>
                </div>
                <div>{cli ? <ClienteLink id={cli.id} nome={cli.nome} /> : 'Sem cliente'}</div>
                <div>{cli?.whatsapp || cli?.telefone || '—'}</div>
                <div>{String(a.responsavel || '—')} · {labelPt(String(a.status || 'aberto'))}</div>
                {a.observacao && <p className="md:col-span-4" style={{ color: 'var(--code-muted)' }}>{String(a.observacao)}</p>}
              </div>
            )
          })}
        </div>
      )}
      {open && (
        <NexusModal title="Novo compromisso" onClose={() => !saving && setOpen(false)} onSave={() => void salvar()} saving={saving} closeOnBackdrop={false}>
          <label className="text-xs font-semibold block mb-2">Título<TextInput value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></label>
          <label className="text-xs font-semibold block mb-2">Tipo
            <SelectInput className="w-full" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="compromisso">Compromisso</option>
              <option value="reuniao">Reunião</option>
              <option value="follow-up">Follow-up</option>
              <option value="ligacao">Ligação</option>
              <option value="tarefa">Tarefa</option>
            </SelectInput>
          </label>
          <label className="text-xs font-semibold block mb-2">Data e hora<TextInput type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
          <label className="text-xs font-semibold block mb-2">Cliente
            <SelectInput className="w-full" value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Selecione</option>
              {clientes.items.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </SelectInput>
          </label>
          <label className="text-xs font-semibold block mb-2">Observação<TextInput value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></label>
        </NexusModal>
      )}
    </div>
  )
}
