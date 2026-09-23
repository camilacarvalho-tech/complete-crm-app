import { useEffect, useState } from 'react'
import { Bell, Building2, ChevronDown, ChevronUp, HelpCircle, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNexusStore } from '../../contexts/NexusStore'
import { CommandPalette } from '../nexus/CommandPalette'
import { ThemeToggle } from './ThemeToggle'
import { empresaVisivel } from '../../lib/uiPt'
import { useAppearance } from '../../contexts/ThemeContext'

export function AppHeader({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { usuario } = useAuth()
  const { notificacoes } = useNexusStore()
  const nav = useNavigate()
  const [notes, setNotes] = useState(false)
  const { fontPx, setFontPx } = useAppearance()
  const unread = notificacoes.items.filter((n) => !n.lida).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpenSearch])

  return (
    <header className="sticky top-0 z-30 hidden md:flex items-center gap-3 px-4 py-2 border-b relative" style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}>
      <button type="button" onClick={onOpenSearch} className="flex-1 max-w-md flex items-center gap-2 rounded-lg px-3 py-2 text-sm border" style={{ borderColor: 'var(--code-border)', color: 'var(--code-muted)' }}>
        <Search className="w-4 h-4" />
        Pesquisa global
        <kbd className="ml-auto text-[10px] border rounded px-1">Ctrl K</kbd>
      </button>
      <button type="button" className="relative p-2 rounded-lg" onClick={() => setNotes((v) => !v)} aria-label="Notificações" style={{ color: 'var(--code-text)' }}>
        <Bell className="w-4 h-4" />
        {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[color:var(--code-orange)]" />}
      </button>
      {notes && (
        <div className="absolute right-24 top-12 nexus-card p-3 w-72 max-h-80 overflow-y-auto text-sm z-40">
          {notificacoes.items.length === 0 && <p className="text-[color:var(--code-muted)]">Nenhuma notificação.</p>}
          {notificacoes.items.slice(0, 20).map((n) => (
            <p key={n.id} className="border-b py-2" style={{ borderColor: 'var(--code-border)' }}>{String(n.titulo || n.tipo || n.id)}</p>
          ))}
        </div>
      )}
      <div className="inline-flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--code-border)' }} title="Tamanho da letra">
        <button type="button" className="px-1.5 py-1" aria-label="Letra menor" onClick={() => setFontPx(fontPx - 1)}><ChevronDown className="w-3.5 h-3.5" /></button>
        <span className="px-1 text-[11px] font-semibold">A</span>
        <button type="button" className="px-1.5 py-1" aria-label="Letra maior" onClick={() => setFontPx(fontPx + 1)}><ChevronUp className="w-3.5 h-3.5" /></button>
      </div>
      <ThemeToggle />
      <button type="button" className="p-2" aria-label="Ajuda" onClick={() => nav('/diagnostico')} style={{ color: 'var(--code-text)' }}><HelpCircle className="w-4 h-4" /></button>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--code-text)' }}>
        <Building2 className="w-4 h-4" />
        <span className="font-semibold truncate max-w-[160px]">{empresaVisivel(usuario?.empresaNome, usuario?.empresaId)}</span>
      </div>
    </header>
  )
}

export function GlobalSearchHost() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <AppHeader onOpenSearch={() => setOpen(true)} />
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  )
}
