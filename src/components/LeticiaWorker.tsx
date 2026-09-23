import { useEffect, useRef } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { getWhatsAppProvider } from '../integrations/providers'
import { writeAudit } from '../lib/audit'
import { runLeticiaFlow, type LeticiaFlow, type LeticiaStep } from '../lib/leticiaEngine'
import { loadRobotControl } from '../modules/leads-monitor/services/robotControl'

export function LeticiaWorker() {
  const store = useNexusStore()
  const storeRef = useRef(store)
  storeRef.current = store
  const busy = useRef(false)
  const pendingKey = store.automacaoEventos.items.filter((e) => e.status === 'pendente').map((e) => e.id).join('|')

  useEffect(() => {
    const timer = window.setInterval(() => {
      const s = storeRef.current
      const agora = Date.now()
      const esperas = s.leticiaRuns.items.filter((r) => r.status === 'WAITING' && Number(r.resumeAt || 0) <= agora)
      if (!esperas.length || busy.current) return
      busy.current = true
      void (async () => {
        try {
          for (const run of esperas.slice(0, 3)) {
            if (['HUMAN', 'CANCELLED', 'COMPLETED'].includes(String(run.status))) continue
            const flowDoc = s.automacoes.items.find((a) => a.id === run.flowId)
            if (!flowDoc || flowDoc.status === 'pausada') {
              await s.leticiaRuns.update(run.id, { status: 'CANCELLED' })
              continue
            }
            const record = (run.record as Record<string, unknown>) || {}
            if (record.statusAtendimento === 'HUMANO' || record.clienteRespondeu === true || record.roboPausado === true) {
              await s.leticiaRuns.update(run.id, { status: 'HUMAN' })
              await writeAudit({
                empresaId: s.clientes.empresaId,
                modulo: 'Automação',
                submodulo: String(flowDoc.nome || ''),
                acao: 'FOLLOWUP_CANCELADO',
                descricao: 'Follow-up cancelado',
                origem: 'ROBÔ',
                clienteId: String(run.leadId || ''),
              })
              continue
            }
            await s.leticiaRuns.update(run.id, { status: 'RUNNING' })
            const passos = (Array.isArray(flowDoc.passos) ? flowDoc.passos : []) as LeticiaStep[]
            await runLeticiaFlow(
              { id: flowDoc.id, nome: String(flowDoc.nome || 'Automação'), modoTeste: flowDoc.status === 'teste', passos },
              { gatilho: String(run.gatilho || 'novo_lead'), record },
              {
                sendWhatsApp: (to, text) => getWhatsAppProvider().sendMessage(to, text),
                createTask: async (title, payload) => { await s.agenda.create({ titulo: title, tipo: 'tarefa', origem: 'leticia', ...(payload || {}) } as any) },
                addTag: async () => {},
                movePipeline: async (entityId, stage) => { if (entityId) await s.clientes.update(entityId, { pipelineStage: stage }) },
                notify: async (message) => { await s.notificacoes.create({ titulo: 'Robô', mensagem: message, lida: false } as any) },
                log: async (entry) => { await s.leticiaRuns.create({ ...entry, leadId: run.leadId, flowId: flowDoc.id, origem: 'ROBÔ' } as any) },
              },
              Number(run.nextIndex || 0),
            )
          }
        } finally {
          busy.current = false
        }
      })()
    }, 20000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const s = storeRef.current
    const pendentes = s.automacaoEventos.items.filter((e) => e.status === 'pendente')
    const flows = s.automacoes.items.filter((a) => a.status === 'ativa' || a.status === 'teste')
    if (!pendentes.length || !flows.length || busy.current) return
    busy.current = true
    ;(async () => {
      try {
        const empresaId = s.clientes.empresaId
        const control = empresaId ? await loadRobotControl(empresaId) : null
        const followupPaused = control?.followup === 'paused'
        for (const event of pendentes.slice(0, 5)) {
          const record = { ...((event.record as Record<string, unknown>) || {}) }
          const staff = Boolean(record.autorId)
          if (String(event.gatilho || '') === 'nova_mensagem' && staff) {
            await s.automacaoEventos.update(event.id, { status: 'processado' })
            continue
          }
          let gatilho = String(event.gatilho || '')
          const leadId = String(record.clienteId || record.id || event.entidadeId || '')
          if (gatilho === 'nova_mensagem') {
            gatilho = 'cliente_respondeu'
            record.clienteRespondeu = true
            record.statusAtendimento = 'HUMANO'
            for (const run of s.leticiaRuns.items) {
              if (String(run.leadId || '') === leadId && ['RUNNING', 'WAITING', 'PENDING'].includes(String(run.status || ''))) {
                await s.leticiaRuns.update(run.id, { status: 'HUMAN' })
              }
            }
          }
          for (const flowDoc of flows) {
            const passos = (Array.isArray(flowDoc.passos) ? flowDoc.passos : []) as LeticiaStep[]
            const flow: LeticiaFlow = {
              id: flowDoc.id,
              nome: String(flowDoc.nome || 'Automação'),
              modoTeste: flowDoc.status === 'teste' || flowDoc.modoTeste === true,
              passos,
            }
            const ativo = s.leticiaRuns.items.some((r) => r.flowId === flow.id && String(r.leadId || '') === leadId && ['RUNNING', 'WAITING', 'PENDING', 'HUMAN'].includes(String(r.status || '')))
            if (ativo && gatilho === 'novo_lead') continue
            await runLeticiaFlow(flow, { gatilho, record }, {
              followupPaused,
              sendWhatsApp: (to, text) => getWhatsAppProvider().sendMessage(to, text),
              createTask: async (title, payload) => { await s.agenda.create({ titulo: title, tipo: 'tarefa', origem: 'leticia', ...(payload || {}) } as any) },
              addTag: async (entityId, tag) => {
                const c = s.clientes.items.find((i) => i.id === entityId)
                if (c) await s.clientes.update(entityId, { tags: [...(c.tags || []), tag] })
              },
              movePipeline: async (entityId, stage) => { if (entityId) await s.clientes.update(entityId, { pipelineStage: stage, pipeline: stage }) },
              notify: async (message) => { await s.notificacoes.create({ titulo: 'Robô', mensagem: message, lida: false } as any) },
              log: async (entry) => {
                await s.leticiaRuns.create({ ...entry, leadId, flowId: flow.id, status: entry.status || 'COMPLETED', origem: flow.modoTeste ? 'TESTE' : 'ROBÔ' } as any)
                await writeAudit({
                  empresaId,
                  modulo: 'Automação',
                  submodulo: flow.nome,
                  acao: 'AUTOMACAO_EXECUTADA',
                  descricao: entry.status === 'WAITING'
                    ? 'Automação em espera'
                    : flow.modoTeste ? '[TESTE] Automação executada' : 'Automação executada',
                  origem: 'ROBÔ',
                  entidade: 'cliente',
                  entidadeId: leadId,
                  clienteId: leadId,
                  clienteNome: String(record.nome || record.clienteNome || ''),
                  cpfCliente: String(record.cpf || ''),
                })
              },
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
