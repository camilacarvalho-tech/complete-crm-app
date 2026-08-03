/**
 * Nexus AI — fachada do CRM (consumidor da API pública FastAPI).
 * Store principal da IA = PostgreSQL no serviço nexus_ai (nunca Firestore).
 */

export type {
  AiAgentId,
  AiAgentDef,
  AiAnexo,
  AiAuditLog,
  AiConfig,
  AiConhecimentoDoc,
  AiConversa,
  AiLog,
  AiMemoriaItem,
  AiMensagem,
  ChatActor,
  LlmProviderId,
  StreamChatInput,
  StreamChatResult,
} from './types'

export { DEFAULT_AI_CONFIG } from './types'
export { AI_AGENTS, getAgent, getActiveAgents } from './agents/registry'
export { listLlmProviders, LlmProviderError } from './llm/provider'
export { SYSTEM_CONTEXT_QUERIES, detectContextIntent, runSystemContextQuery } from './context/systemContext'

import { nexusAiHttp } from './httpClient'
import {
  isNexusAiBackendUp,
  streamChatViaBackend,
  resetBackendProbe,
} from './backendBridge'
import type {
  AiAuditLog,
  AiConfig,
  AiConhecimentoDoc,
  AiConversa,
  AiLog,
  AiMemoriaItem,
  AiMensagem,
  ChatActor,
  StreamChatInput,
  StreamChatResult,
} from './types'
import { DEFAULT_AI_CONFIG } from './types'
import { LlmProviderError } from './llm/provider'
import { AI_AGENTS } from './agents/registry'

function client(empresaId: string, actor?: ChatActor) {
  return {
    empresaId,
    usuarioId: actor?.usuarioId || 'crm-user',
    usuarioNome: actor?.usuarioNome || 'CRM',
  }
}

async function requireBackend() {
  if (!(await isNexusAiBackendUp())) {
    throw new LlmProviderError(
      'Nexus AI API offline. Execute nexus_ai/INICIAR_NEXUS_AI.bat (porta 8090).',
      'api_error'
    )
  }
}

async function runStreamChat(input: StreamChatInput): Promise<StreamChatResult> {
  await requireBackend()
  const via = await streamChatViaBackend(input)
  if (!via) throw new LlmProviderError('Falha na API Nexus AI.', 'api_error')
  return via
}

function mapConversa(c: any): AiConversa {
  const criado = c.criado_em ? new Date(c.criado_em) : new Date()
  return {
    id: c.id,
    titulo: c.titulo,
    usuarioId: c.usuario_id,
    usuarioNome: c.usuario_nome,
    empresaId: c.empresa_id,
    agenteId: c.agente_id || 'assistente_geral',
    qtdMensagens: c.qtd_mensagens || 0,
    data: criado.toLocaleDateString('pt-BR'),
    hora: criado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    criadoEm: c.criado_em,
    atualizadoEm: c.atualizado_em,
    arquivada: false,
  }
}

function mapMensagem(m: any): AiMensagem {
  return {
    id: m.id,
    conversaId: m.conversa_id,
    role: m.role,
    conteudo: m.conteudo,
    anexos: m.anexos || [],
    agenteId: m.agente_id,
    tokens: m.tokens,
    criadoEm: m.criado_em,
  }
}

/** Polling leve no lugar de onSnapshot (API REST). */
function poll<T>(fn: () => Promise<T>, cb: (v: T) => void, ms = 2500) {
  let stopped = false
  const tick = async () => {
    if (stopped) return
    try {
      cb(await fn())
    } catch {
      /* ignore transient */
    }
    if (!stopped) setTimeout(tick, ms)
  }
  tick()
  return () => {
    stopped = true
  }
}

export const NexusAI = {
  version: '1.0.0',
  isBackendUp: isNexusAiBackendUp,
  resetBackendProbe,
  http: nexusAiHttp,

  streamChat: runStreamChat,

  async createConversa(empresaId: string, actor: ChatActor) {
    await requireBackend()
    return mapConversa(await nexusAiHttp.createConversa(client(empresaId, actor)))
  },

  subscribeConversas(empresaId: string, cb: (rows: AiConversa[]) => void) {
    return poll(async () => {
      await requireBackend()
      const rows = await nexusAiHttp.listConversas(client(empresaId))
      return rows.map(mapConversa)
    }, cb)
  },

  subscribeMensagens(empresaId: string, conversaId: string, cb: (rows: AiMensagem[]) => void) {
    return poll(async () => {
      await requireBackend()
      const rows = await nexusAiHttp.listMensagens(client(empresaId), conversaId)
      return rows.map(mapMensagem)
    }, cb, 1500)
  },

  subscribeMemoria(empresaId: string, cb: (rows: AiMemoriaItem[]) => void) {
    return poll(async () => {
      await requireBackend()
      const rows = await nexusAiHttp.listMemoria(client(empresaId))
      return rows.map((m: any) => ({
        id: m.id,
        chave: m.chave,
        valor: m.valor,
        categoria: m.categoria,
        atualizadoEm: m.atualizado_em,
      }))
    }, cb)
  },

  async upsertMemoria(
    empresaId: string,
    item: { chave: string; valor: string; categoria: string; id?: string }
  ) {
    await requireBackend()
    return nexusAiHttp.upsertMemoria(client(empresaId), {
      chave: item.chave,
      valor: item.valor,
      categoria: item.categoria,
    })
  },

  async deleteMemoria(empresaId: string, id: string) {
    await requireBackend()
    return nexusAiHttp.deleteMemoria(client(empresaId), id)
  },

  subscribeConhecimento(empresaId: string, cb: (rows: AiConhecimentoDoc[]) => void) {
    return poll(async () => {
      await requireBackend()
      const rows = await nexusAiHttp.listConhecimento(client(empresaId))
      return rows.map((d: any) => ({
        id: d.id,
        titulo: d.titulo,
        tipo: d.tipo,
        nomeArquivo: d.nome_arquivo,
        tamanho: d.tamanho,
        status: d.status,
        conteudoTexto: d.conteudo_texto,
        criadoEm: d.criado_em,
      }))
    }, cb)
  },

  async uploadConhecimento(empresaId: string, file: File, titulo?: string) {
    await requireBackend()
    return nexusAiHttp.uploadConhecimento(client(empresaId), file, titulo)
  },

  async deleteConhecimento(empresaId: string, id: string) {
    await requireBackend()
    return nexusAiHttp.deleteConhecimento(client(empresaId), id)
  },

  async uploadChatAnexo(_empresaId: string, file: File) {
    // V1 API: anexos via FormData no chat futuro; por ora metadado local
    return {
      nome: file.name,
      tipo: file.type || 'application/octet-stream',
      tamanho: file.size,
    }
  },

  subscribeConfig(empresaId: string, cb: (c: AiConfig) => void) {
    return poll(async () => {
      await requireBackend()
      const c = await nexusAiHttp.getConfig(client(empresaId))
      return {
        ...DEFAULT_AI_CONFIG,
        llmProvider: c.llm_provider || 'openai',
        modelo: c.modelo,
        temperatura: c.temperatura,
        maxTokens: c.max_tokens,
        idioma: c.idioma,
        promptPadrao: c.prompt_padrao,
        agentePadrao: c.agente_padrao || 'assistente_geral',
        streaming: c.streaming,
        openaiApiKey: c.openai_api_key_set ? '••••••••' : '',
      } as AiConfig
    }, cb)
  },

  async saveConfig(empresaId: string, patch: Partial<AiConfig>) {
    await requireBackend()
    const body: Record<string, unknown> = {}
    if (patch.llmProvider) body.llm_provider = patch.llmProvider
    if (patch.modelo) body.modelo = patch.modelo
    if (patch.temperatura != null) body.temperatura = patch.temperatura
    if (patch.maxTokens != null) body.max_tokens = patch.maxTokens
    if (patch.idioma) body.idioma = patch.idioma
    if (patch.promptPadrao) body.prompt_padrao = patch.promptPadrao
    if (patch.agentePadrao) body.agente_padrao = patch.agentePadrao
    if (patch.streaming != null) body.streaming = patch.streaming
    if (patch.openaiApiKey && !patch.openaiApiKey.includes('•')) {
      body.openai_api_key = patch.openaiApiKey
    }
    return nexusAiHttp.saveConfig(client(empresaId), body)
  },

  subscribeLogs(empresaId: string, cb: (rows: AiLog[]) => void) {
    return poll(async () => {
      await requireBackend()
      const rows = await nexusAiHttp.listLogs(client(empresaId))
      return rows.map((r: any) => ({
        id: r.id,
        data: r.criado_em ? new Date(r.criado_em).toLocaleDateString('pt-BR') : '',
        hora: r.criado_em
          ? new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '',
        usuarioId: r.usuario_id,
        usuarioNome: r.usuario_nome,
        empresaId: r.empresa_id,
        agenteId: r.agente_id,
        conversaId: r.conversa_id,
        tempoMs: r.tempo_ms,
        tokens: r.tokens,
        erro: r.erro,
        acao: r.acao,
        criadoEm: r.criado_em,
      }))
    }, cb)
  },

  subscribeAudit(empresaId: string, cb: (rows: AiAuditLog[]) => void) {
    return poll(async () => {
      await requireBackend()
      const rows = await nexusAiHttp.listAudit(client(empresaId))
      return rows.map((r: any) => ({
        id: r.id,
        requestId: r.request_id,
        empresaId: r.empresa_id,
        usuarioId: r.usuario_id,
        usuarioNome: r.usuario_nome,
        authMethod: r.auth_method,
        method: r.method,
        path: r.path,
        statusCode: r.status_code,
        latencyMs: r.latency_ms,
        error: r.error,
        createdAt: r.created_at,
      }))
    }, cb, 3500)
  },

  listAgentsLocal: () => AI_AGENTS,
} as const

export default NexusAI
