import { useMemo, useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { useAuth } from '../contexts/AuthContext'
import { KANBAN_COLUMNS, kanbanColumnFor, operationLabel, productCatalogLabel } from '../catalog/productCatalog'
import { writeAudit } from '../lib/audit'
import { ErrorBanner, LoadingBlock, PageHeader } from '../components/nexus/kit'
import { money } from '../lib/nexusCore'
import type { NexusRecord } from '../types/nexus'

export default function Kanban() {
  const { propostas, digitacoes } = useNexusStore()
  const { usuario } = useAuth()
  const [dragId, setDragId] = useState<string | null>(null)

  const cards = useMemo(() => {
    const fromProp = propostas.items.map((p) => ({ ...p, _fonte: 'propostas' as const }))
    const ids = new Set(fromProp.map((p) => p.id))
    const extra = digitacoes.items.filter((d) => !ids.has(d.id)).map((d) => ({ ...d, _fonte: 'digitacoes' as const }))
    return [...fromProp, ...extra]
  }, [propostas.items, digitacoes.items])

  const grouped = KANBAN_COLUMNS.map((col) => ({
    ...col,
    items: cards.filter((c) => kanbanColumnFor(String(c.status || c.statusProposta || '')) === col.id),
  }))

  async function move(item: NexusRecord & { _fonte: 'propostas' | 'digitacoes' }, status: string) {
    const before = String(item.status || '')
    if (before === status) return
    if (item._fonte === 'propostas') await propostas.update(item.id, { status })
    else await digitacoes.update(item.id, { status })
    await writeAudit({
      empresaId: propostas.empresaId,
      usuarioId: usuario?.id,
      usuarioNome: usuario?.nome,
      modulo: 'kanban',
      acao: 'status.alterado',
      entidade: item._fonte,
      entidadeId: item.id,
      antes: { status: before, cliente: item.clienteNome },
      depois: { status, cliente: item.clienteNome },
    })
  }

  if (propostas.loading) return <LoadingBlock label="Carregando kanban..." />

  return (
    <div className="space-y-3">
      <PageHeader title="Kanban" subtitle="Propostas reais do tenant. Mover o card grava o status no Firestore." />
      <ErrorBanner message={propostas.error} />
      <div className="flex gap-2 overflow-x-auto pb-3 items-start">
        {grouped.map((col) => (
          <section
            key={col.id}
            className="nexus-card w-[200px] shrink-0 p-1.5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const item = cards.find((c) => c.id === dragId)
              if (item) void move(item, col.id)
              setDragId(null)
            }}
          >
            <header className="flex items-center justify-between px-1 py-1">
              <h2 className="text-xs font-semibold">{col.label}</h2>
              <span className="text-[11px]" style={{ color: 'var(--code-muted)' }}>{col.items.length}</span>
            </header>
            <div className="space-y-1 min-h-[72px] max-h-[420px] overflow-y-auto">
              {col.items.map((item) => (
                <article
                  key={item.id}
                  draggable
                  onDragStart={() => setDragId(item.id)}
                  className="rounded-md border px-1.5 py-1 text-[11px] leading-tight cursor-grab"
                  style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}
                >
                  <p className="font-semibold truncate">{String(item.clienteNome || item.clienteId || 'Cliente')}</p>
                  <p style={{ color: 'var(--code-muted)' }}>{productCatalogLabel(String(item.produto || '')) || String(item.produto || '—')}</p>
                  <p>{operationLabel(String(item.operacao || '')) || '—'}</p>
                  <p>{String(item.banco || item.instituicao || '—')}</p>
                  <p>{item.valor != null ? money(Number(item.valor || item.valorLiberado || 0)) : '—'} · parcela {item.parcela != null ? money(Number(item.parcela)) : '—'}</p>
                  <p style={{ color: 'var(--code-muted)' }}>{String(item.responsavel || 'Sem responsável')}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
