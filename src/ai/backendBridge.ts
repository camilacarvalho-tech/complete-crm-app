/**
 * Bridge CRM → API FastAPI Nexus AI.
 * Sem fallback Firestore: a IA vive no serviço SQL.
 */

import { nexusAiHttp } from './httpClient'
import type { StreamChatInput, StreamChatResult, ChatActor } from './types'

let backendOk: boolean | null = null

export async function isNexusAiBackendUp(): Promise<boolean> {
  if (backendOk === true) return true
  try {
    const h = await Promise.race([
      nexusAiHttp.health(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500)),
    ])
    backendOk = Boolean((h as { status?: string })?.status === 'ok')
  } catch {
    backendOk = false
  }
  return Boolean(backendOk)
}

export function resetBackendProbe() {
  backendOk = null
}

function opts(empresaId: string, actor: ChatActor) {
  return {
    empresaId,
    usuarioId: actor.usuarioId,
    usuarioNome: actor.usuarioNome,
  }
}

export async function streamChatViaBackend(
  input: StreamChatInput
): Promise<StreamChatResult | null> {
  const up = await isNexusAiBackendUp()
  if (!up) return null

  const o = opts(input.empresaId, input.actor)
  const body = {
    mensagem: input.mensagem,
    conversa_id: input.conversaId,
    regenerar: input.regenerar,
    agente_id: input.agenteId || 'assistente_geral',
  }

  try {
    const result = await nexusAiHttp.chatStream(o, body, input.onToken, input.signal)
    if (!result) return null
    return {
      conversaId: result.conversa_id,
      mensagemUserId: result.mensagem_user_id || '',
      mensagemAssistantId: result.mensagem_assistant_id,
      texto: result.texto,
      tokens: result.tokens || 0,
      tempoMs: result.tempo_ms || 0,
    }
  } catch (e) {
    backendOk = false
    throw e
  }
}

export { nexusAiHttp }
