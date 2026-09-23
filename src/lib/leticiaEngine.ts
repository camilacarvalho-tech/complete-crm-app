export type LeticiaStep = {
  tipo: 'trigger' | 'condition' | 'action' | 'delay' | 'else'
  gatilho?: string
  campo?: string
  operador?: 'eq' | 'neq' | 'contains' | 'exists'
  valor?: string
  acao?: string
  payload?: string
  delayMinutos?: number
}

export type LeticiaFlow = {
  id?: string
  nome: string
  status?: string
  modoTeste?: boolean
  passos: LeticiaStep[]
}

export type ProviderResult = { ok: boolean; message: string; skipped?: boolean }

export interface LeticiaDeps {
  sendWhatsApp: (to: string, text: string) => Promise<ProviderResult>
  createTask: (title: string, payload?: Record<string, unknown>) => Promise<void>
  addTag: (entityId: string, tag: string) => Promise<void>
  movePipeline: (entityId: string, stage: string) => Promise<void>
  notify: (message: string) => Promise<void>
  log: (entry: Record<string, unknown>) => Promise<void>
  followupPaused?: boolean
}

function match(record: Record<string, unknown>, step: LeticiaStep): boolean {
  if (step.tipo !== 'condition') return true
  const raw = String(record[step.campo || ''] ?? '')
  const val = step.valor || ''
  if (step.operador === 'exists') return Boolean(raw)
  if (step.operador === 'contains') return raw.toLowerCase().includes(val.toLowerCase())
  if (step.operador === 'neq') return raw !== val
  return raw === val
}

export async function runLeticiaFlow(
  flow: LeticiaFlow,
  event: { gatilho: string; record: Record<string, unknown> },
  deps: LeticiaDeps,
  startIndex = 0,
): Promise<{ executed: string[]; skipped: string[]; waitMinutes?: number; nextIndex?: number }> {
  const executed: string[] = []
  const skipped: string[] = []
  const trigger = flow.passos.find((p) => p.tipo === 'trigger')
  if (trigger?.gatilho && trigger.gatilho !== event.gatilho) {
    skipped.push('gatilho_nao_bate')
    return { executed, skipped }
  }

  let branch = true
  for (let i = startIndex; i < flow.passos.length; i++) {
    const step = flow.passos[i]
    if (step.tipo === 'trigger') continue
    if (step.tipo === 'condition') {
      branch = match(event.record, step)
      executed.push(`condicao:${branch}`)
      continue
    }
    if (step.tipo === 'else') {
      branch = !branch
      continue
    }
    if (!branch) {
      skipped.push(step.acao || step.tipo)
      continue
    }
    if (step.tipo === 'delay') {
      const n = Number(step.delayMinutos || 0)
      const unidade = step.payload || 'minutos'
      const minutos = unidade === 'horas' ? n * 60 : unidade === 'dias' ? n * 1440 : n
      executed.push(`delay:${minutos}`)
      await deps.log({
        flowId: flow.id,
        flowNome: flow.nome,
        gatilho: event.gatilho,
        executed,
        skipped,
        modoTeste: !!flow.modoTeste,
        status: 'WAITING',
        resumeAt: Date.now() + minutos * 60000,
        nextIndex: i + 1,
        record: event.record,
      })
      return { executed, skipped, waitMinutes: minutos, nextIndex: i + 1 }
    }
    if (step.tipo === 'action') {
      const acao = step.acao || ''
      const humano = String(event.record.statusAtendimento || '') === 'HUMANO' || event.record.roboPausado === true || event.record.clienteRespondeu === true
      if (acao === 'enviar_whatsapp' && (humano || deps.followupPaused)) {
        skipped.push(humano ? 'followup_pausado_humano' : 'followup_robo_pausado')
        continue
      }
      if (acao === 'enviar_whatsapp' && flow.modoTeste) {
        executed.push(`[TESTE] Mensagem que seria enviada: ${step.payload || ''}`)
        continue
      }
      if (acao === 'enviar_whatsapp') {
        const r = await deps.sendWhatsApp(String(event.record.whatsapp || event.record.telefone || ''), step.payload || '')
        executed.push(r.skipped ? `whatsapp:${r.message}` : r.ok ? 'whatsapp' : `whatsapp:${r.message}`)
      } else if (acao === 'criar_tarefa' || acao === 'iniciar_followup') {
        await deps.createTask(step.payload || 'Tarefa Letícia', { origem: 'leticia', entidadeId: event.record.id })
        executed.push('tarefa')
      } else if (acao === 'adicionar_tag') {
        await deps.addTag(String(event.record.id || ''), step.payload || 'leticia')
        executed.push('tag')
      } else if (acao === 'mover_pipeline') {
        await deps.movePipeline(String(event.record.id || ''), step.payload || 'em_atendimento')
        executed.push('pipeline')
      } else if (acao === 'notificar') {
        await deps.notify(step.payload || flow.nome)
        executed.push('notify')
      } else if (acao === 'transferir_atendente') {
        await deps.notify(step.payload || 'Transferir para atendente')
        executed.push('transferir')
      } else if (acao === 'adicionar_fila' || acao === 'colocar_fila') {
        await deps.createTask(step.payload || 'Fila de atendimento', { origem: 'leticia', entidadeId: event.record.id })
        executed.push('fila')
      } else if (acao === 'criar_cliente' || acao === 'atualizar_cliente' || acao === 'atribuir_funcionario') {
        await deps.notify(step.payload || acao)
        executed.push(acao)
      } else if (acao === 'encerrar_fluxo') {
        executed.push('fluxo_encerrado')
        break
      } else if (acao === 'alterar_status') {
        await deps.movePipeline(String(event.record.id || ''), step.payload || 'em_atendimento')
        executed.push('status')
      } else if (acao === 'aguardar') {
        executed.push(`aguardar:${step.payload || '0'}`)
      } else if (acao === 'encerrar_atendimento') {
        await deps.movePipeline(String(event.record.id || ''), 'finalizado')
        executed.push('encerrar')
      } else {
        skipped.push(`acao_desconhecida:${acao}`)
      }
    }
  }
  await deps.log({ flowId: flow.id, flowNome: flow.nome, gatilho: event.gatilho, executed, skipped, modoTeste: !!flow.modoTeste })
  return { executed, skipped }
}

export const LETICIA_TRIGGERS = [
  'novo_lead',
  'cliente_respondeu',
  'novo_cliente',
  'nova_mensagem',
  'proposta_criada',
  'proposta_aprovada',
  'proposta_recusada',
  'novo_lancamento_financeiro',
  'conta_vencida',
  'nova_tarefa',
  'mudanca_pipeline',
  'horario_agendado',
]

export const LETICIA_ACTIONS = [
  'criar_cliente',
  'atualizar_cliente',
  'criar_tarefa',
  'colocar_fila',
  'atribuir_funcionario',
  'enviar_whatsapp',
  'aguardar',
  'alterar_status',
  'adicionar_tag',
  'iniciar_followup',
  'encerrar_fluxo',
  'transferir_atendente',
  'encerrar_atendimento',
  'mover_pipeline',
  'notificar',
]

export const LETICIA_ACTION_LABELS: Record<string, string> = {
  criar_cliente: 'Criar cliente',
  atualizar_cliente: 'Atualizar cliente',
  criar_tarefa: 'Criar tarefa',
  colocar_fila: 'Entrar na fila',
  atribuir_funcionario: 'Atribuir funcionário',
  enviar_whatsapp: 'Enviar WhatsApp',
  aguardar: 'Aguardar',
  alterar_status: 'Alterar status',
  adicionar_tag: 'Adicionar etiqueta',
  iniciar_followup: 'Iniciar follow-up',
  encerrar_fluxo: 'Encerrar fluxo',
  transferir_atendente: 'Transferir atendimento',
  encerrar_atendimento: 'Encerrar atendimento',
  mover_pipeline: 'Mover etapa',
  notificar: 'Notificar',
  adicionar_fila: 'Entrar na fila',
}

export const LETICIA_FIELDS = [
  { id: 'nome', label: 'Nome' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'modalidade', label: 'Modalidade' },
  { id: 'produto', label: 'Produto' },
  { id: 'origem', label: 'Origem' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'estado', label: 'Estado' },
  { id: 'segmento', label: 'Segmento' },
  { id: 'status', label: 'Status' },
  { id: 'score', label: 'Score' },
  { id: 'responsavel', label: 'Responsável' },
  { id: 'campanha', label: 'Campanha' },
  { id: 'pipelineStage', label: 'Etapa' },
]
