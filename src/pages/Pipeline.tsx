import { PIPELINE_STAGES } from '../types/nexus'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { normalizeStage, stageIdFromLegacy, stageLabel } from '../lib/nexusCore'
import { writeAudit } from '../lib/audit'
import { ErrorBanner, LoadingBlock, PageHeader } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'

export default function Pipeline() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { clientes } = useNexusStore()

  async function move(id: string, stageId: string) {
    const before = clientes.items.find((c) => c.id === id)
    try {
      await clientes.update(id, {
        pipelineStage: stageId,
        pipeline: stageLabel(stageId),
        status: stageLabel(stageId),
      })
      await writeAudit({
        empresaId: clientes.empresaId,
        usuarioNome: usuario?.nome,
        modulo: 'pipeline',
        acao: 'mover',
        entidade: 'cliente',
        entidadeId: id,
        antes: before?.pipelineStage,
        depois: stageId,
      })
    } catch (e) {
      toast.error('Não foi possível mover o card', e instanceof Error ? e.message : '')
    }
  }

  if (clientes.loading) return <LoadingBlock />

  return (
    <div className="space-y-3">
      <PageHeader title="Pipeline" subtitle="Kanban único da operação. Arraste o card para registrar o histórico." />
      <ErrorBanner message={clientes.error} />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const cards = clientes.items.filter(
            (c) => normalizeStage(String(c.pipelineStage || stageIdFromLegacy(c.status, c.pipeline))) === stage.id
          )
          return (
            <div
              key={stage.id}
              className="min-w-[240px] w-60 bg-slate-100 dark:bg-slate-800 rounded-xl p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('text/plain')
                if (id) void move(id, stage.id)
              }}
            >
              <div className="flex items-center justify-between px-2 py-2">
                <h2 className="text-xs font-bold uppercase text-slate-500">{stage.label}</h2>
                <span className="text-xs font-semibold">{cards.length}</span>
              </div>
              <div className="space-y-2 min-h-[50vh]">
                {cards.map((c) => (
                  <a
                    key={c.id}
                    href={`/clientes?id=${c.id}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                    className="block bg-white dark:bg-slate-700 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-600"
                  >
                    <p className="text-sm font-semibold">{c.nome}</p>
                    <p className="text-[11px] text-slate-500">{String(c.source || c.origem || '')}</p>
                    <p className="text-[11px] text-slate-500">{c.responsavel || 'sem responsável'}</p>
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
