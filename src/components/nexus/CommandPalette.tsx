import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNexusStore } from '../../contexts/NexusStore'
import { TextInput } from '../nexus/kit'

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const store = useNexusStore()
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    const out: { type: string; label: string; href: string }[] = []
    store.clientes.items.forEach((c) => {
      const blob = `${c.nome} ${c.cpf} ${c.telefone} ${c.whatsapp} ${c.email}`.toLowerCase()
      if (blob.includes(term)) out.push({ type: 'Cliente', label: String(c.nome || c.id), href: `/clientes?id=${c.id}` })
    })
    store.propostas.items.forEach((p) => {
      if (JSON.stringify(p).toLowerCase().includes(term)) out.push({ type: 'Proposta', label: String(p.produto || p.id), href: '/propostas' })
    })
    store.contratos.items.forEach((p) => {
      if (JSON.stringify(p).toLowerCase().includes(term)) out.push({ type: 'Contrato', label: String(p.numero || p.id), href: '/contratos' })
    })
    store.conversas.items.forEach((p) => {
      if (JSON.stringify(p).toLowerCase().includes(term)) out.push({ type: 'Conversa', label: String(p.titulo || p.id), href: `/whatsapp?conversa=${p.id}` })
    })
    store.agenda.items.forEach((p) => {
      if (JSON.stringify(p).toLowerCase().includes(term)) out.push({ type: 'Tarefa', label: String(p.titulo || p.id), href: '/tarefas' })
    })
    store.produtos.items.forEach((p) => {
      if (JSON.stringify(p).toLowerCase().includes(term)) out.push({ type: 'Produto', label: String(p.nome || p.codigo || p.id), href: '/produtos' })
    })
    return out.slice(0, 20)
  }, [q, store])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" style={{ background: 'color-mix(in srgb, var(--code-sidebar) 55%, transparent)' }} onClick={onClose}>
      <div className="nexus-card w-full max-w-xl p-3" onClick={(e) => e.stopPropagation()}>
        <TextInput autoFocus placeholder="Pesquisar clientes, propostas, conversas…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="mt-2 max-h-80 overflow-y-auto text-sm">
          {q && results.length === 0 && <li className="p-3 text-[color:var(--code-muted)]">Nenhum resultado real para esta busca.</li>}
          {results.map((r, i) => (
            <li key={`${r.href}-${i}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5"
                onClick={() => { nav(r.href); onClose() }}
              >
                <span className="text-[10px] font-bold uppercase text-[color:var(--code-muted)] mr-2">{r.type}</span>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
