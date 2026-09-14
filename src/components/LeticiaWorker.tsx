import { useEffect, useRef } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { getWhatsAppProvider } from '../integrations/providers'
import { runLeticiaFlow, type LeticiaFlow, type LeticiaStep } from '../lib/leticiaEngine'

export function LeticiaWorker() {
  const store = useNexusStore()
  const storeRef = useRef(store)
  storeRef.current = store
  const busy = useRef(false)
  const pendingKey = store.automacaoEventos.items.filter((e) => e.status === 'pendente').map((e) => e.id).join('|')

  useEffect(() => {
    const s = storeRef.current
    const pendentes = s.automacaoEventos.items.filter((e) => e.status === 'pendente')
    const flows = s.automacoes.items.filter((a) => a.status === 'ativa' || a.status === 'teste')
    if (!pendentes.length || !flows.length || busy.current) return
    busy.current = true
    ;(async () => {
      try {
        for (const event of pendentes.slice(0, 5)) {
          for (const flowDoc of flows) {
            const passos = (Array.isArray(flowDoc.passos) ? flowDoc.passos : []) as LeticiaStep[]
            const flow: LeticiaFlow = {
              id: flowDoc.id,
              nome: String(flowDoc.nome || 'Letícia'),
              modoTeste: flowDoc.status === 'teste',
              passos,
            }
            await runLeticiaFlow(flow, { gatilho: String(event.gatilho || ''), record: (event.record as Record<string, unknown>) || {} }, {
              sendWhatsApp: (to, text) => getWhatsAppProvider().sendMessage(to, text),
              createTask: async (title, payload) => { await s.agenda.create({ titulo: title, tipo: 'tarefa', origem: 'leticia', ...(payload || {}) } as any) },
              addTag: async (entityId, tag) => {
                const c = s.clientes.items.find((i) => i.id === entityId)
                if (c) await s.clientes.update(entityId, { tags: [...(c.tags || []), tag] })
              },
              movePipeline: async (entityId, stage) => { if (entityId) await s.clientes.update(entityId, { pipelineStage: stage, pipeline: stage }) },
              notify: async (message) => { await s.notificacoes.create({ titulo: 'Robô Letícia', mensagem: message, lida: false } as any) },
              log: async (entry) => { await s.leticiaRuns.create({ ...entry, origem: 'worker' } as any) },
            })
          }
          await s.automacaoEventos.update(event.id, { status: 'processado' })
        }
      } catch (e) {
        console.warn('[leticia worker]', e)
      } finally {
        busy.current = false
      }
    })()
  }, [pendingKey])

  return null
}
