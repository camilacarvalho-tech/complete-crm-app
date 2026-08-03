/**
 * Cliente HTTP da Nexus AI (serviço FastAPI independente).
 * CRM apenas consome a API — sem acoplamento ao LLM/DB do serviço.
 */

const DEFAULT_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_NEXUS_AI_URL) ||
  'http://127.0.0.1:8090'

const DEFAULT_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_NEXUS_AI_KEY) ||
  'dev-nexus-ai-key'

export type NexusAiClientOptions = {
  baseUrl?: string
  apiKey?: string
  empresaId: string
  usuarioId?: string
  usuarioNome?: string
}

async function request<T>(
  opts: NexusAiClientOptions,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = (opts.baseUrl || DEFAULT_BASE).replace(/\/$/, '')
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.apiKey || DEFAULT_KEY}`,
    'X-Usuario-Id': opts.usuarioId || 'crm-user',
    'X-Usuario-Nome': opts.usuarioNome || 'CRM',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${base}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Nexus AI ${res.status}: ${text.slice(0, 300)}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const nexusAiHttp = {
  health: (baseUrl?: string) =>
    fetch(`${(baseUrl || DEFAULT_BASE).replace(/\/$/, '')}/health`).then((r) => r.json()),

  listConversas: (opts: NexusAiClientOptions) =>
    request<any[]>(opts, `/v1/${opts.empresaId}/conversas`),

  createConversa: (opts: NexusAiClientOptions) =>
    request<any>(opts, `/v1/${opts.empresaId}/conversas`, { method: 'POST' }),

  listMensagens: (opts: NexusAiClientOptions, conversaId: string) =>
    request<any[]>(opts, `/v1/${opts.empresaId}/conversas/${conversaId}/mensagens`),

  chat: (
    opts: NexusAiClientOptions,
    body: { mensagem: string; conversa_id?: string; regenerar?: boolean; agente_id?: string }
  ) =>
    request<any>(opts, `/v1/${opts.empresaId}/chat`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  chatStream: async (
    opts: NexusAiClientOptions,
    body: { mensagem: string; conversa_id?: string; regenerar?: boolean; agente_id?: string },
    onToken: (chunk: string) => void,
    signal?: AbortSignal
  ) => {
    const base = (opts.baseUrl || DEFAULT_BASE).replace(/\/$/, '')
    const res = await fetch(`${base}/v1/${opts.empresaId}/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey || DEFAULT_KEY}`,
        'Content-Type': 'application/json',
        'X-Usuario-Id': opts.usuarioId || 'crm-user',
        'X-Usuario-Nome': opts.usuarioNome || 'CRM',
      },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok || !res.body) {
      const text = await res.text()
      throw new Error(`Nexus AI stream ${res.status}: ${text.slice(0, 300)}`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResult: any = null
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''
      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data:')) continue
        try {
          const payload = JSON.parse(line.slice(5).trim())
          if (payload.type === 'token' && payload.content) onToken(payload.content)
          if (payload.type === 'done') finalResult = payload.result
        } catch {
          /* ignore */
        }
      }
    }
    return finalResult
  },

  getConfig: (opts: NexusAiClientOptions) =>
    request<any>(opts, `/v1/${opts.empresaId}/config`),

  saveConfig: (opts: NexusAiClientOptions, patch: Record<string, unknown>) =>
    request<any>(opts, `/v1/${opts.empresaId}/config`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  listMemoria: (opts: NexusAiClientOptions) =>
    request<any[]>(opts, `/v1/${opts.empresaId}/memoria`),

  upsertMemoria: (
    opts: NexusAiClientOptions,
    body: { chave: string; valor: string; categoria?: string }
  ) =>
    request<any>(opts, `/v1/${opts.empresaId}/memoria`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteMemoria: (opts: NexusAiClientOptions, id: string) =>
    request<any>(opts, `/v1/${opts.empresaId}/memoria/${id}`, { method: 'DELETE' }),

  listConhecimento: (opts: NexusAiClientOptions) =>
    request<any[]>(opts, `/v1/${opts.empresaId}/conhecimento`),

  uploadConhecimento: async (opts: NexusAiClientOptions, file: File, titulo?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (titulo) fd.append('titulo', titulo)
    return request<any>(opts, `/v1/${opts.empresaId}/conhecimento`, {
      method: 'POST',
      body: fd,
    })
  },

  deleteConhecimento: (opts: NexusAiClientOptions, id: string) =>
    request<any>(opts, `/v1/${opts.empresaId}/conhecimento/${id}`, { method: 'DELETE' }),

  listAgentes: (opts: NexusAiClientOptions) =>
    request<any[]>(opts, `/v1/${opts.empresaId}/agentes`),

  listLogs: (opts: NexusAiClientOptions) =>
    request<any[]>(opts, `/v1/${opts.empresaId}/logs`),

  listAudit: (opts: NexusAiClientOptions) =>
    request<any[]>(opts, `/v1/${opts.empresaId}/audit`),
}

export default nexusAiHttp
