/**
 * Motor de chat Nexus AI — orquestra config, memória, conhecimento, LLM e logs.
 * Independente da UI do CRM.
 */

import { getAgent } from './agents/registry'
import { detectContextIntent, runSystemContextQuery } from './context/systemContext'
import { getLlmProviderFromConfig, type LlmMessage } from './llm/provider'
import { LlmProviderError } from './llm/types'
import * as store from './store'
import type {
  AiAgentId,
  AiAnexo,
  ChatActor,
  StreamChatInput,
  StreamChatResult,
} from './types'

function tituloFromMessage(texto: string): string {
  const t = texto.replace(/\s+/g, ' ').trim()
  return t.length > 48 ? `${t.slice(0, 48)}…` : t || 'Nova conversa'
}

async function buildSystemPrompt(
  empresaId: string,
  agenteId: AiAgentId,
  promptPadrao: string,
  mensagemUsuario: string
): Promise<string> {
  const agent = getAgent(agenteId)
  const parts: string[] = [
    promptPadrao,
    agent?.sistemaPrompt || '',
    `EmpresaId da sessão (isolamento): ${empresaId}. Nunca use dados de outra empresa.`,
  ]

  try {
    const memoria = await store.listMemoria(empresaId)
    if (memoria.length) {
      parts.push(
        'Memória da empresa:\n' +
          memoria.map((m) => `- [${m.categoria}] ${m.chave}: ${m.valor}`).join('\n')
      )
    }
  } catch {
    /* ignore */
  }

  try {
    const docs = await store.listConhecimento(empresaId)
    const textos = docs
      .filter((d) => d.status === 'indexado' && d.conteudoTexto)
      .slice(0, 5)
      .map((d) => `### ${d.titulo}\n${(d.conteudoTexto || '').slice(0, 6000)}`)
    if (textos.length) {
      parts.push('Base de conhecimento (trechos):\n' + textos.join('\n\n'))
    }
    const outros = docs.filter((d) => d.status === 'pendente').map((d) => d.titulo)
    if (outros.length) {
      parts.push(
        `Documentos armazenados (ainda sem extração de texto na V1): ${outros.join(', ')}`
      )
    }
  } catch {
    /* ignore */
  }

  const intent = detectContextIntent(mensagemUsuario)
  if (intent) {
    const ctx = await runSystemContextQuery(empresaId, intent)
    parts.push(
      `Contexto do Sistema (${intent}): ${ctx.message}. ` +
        `Se a consulta ainda não estiver implementada, explique isso ao usuário sem inventar números.`
    )
  }

  return parts.filter(Boolean).join('\n\n')
}

export async function streamChat(input: StreamChatInput): Promise<StreamChatResult> {
  const { empresaId, actor, onToken, signal } = input
  if (!empresaId) throw new Error('empresaId obrigatório')
  if (!input.mensagem?.trim() && !input.regenerar) {
    throw new Error('Mensagem vazia')
  }

  const config = await store.getConfig(empresaId)
  const agenteId: AiAgentId = input.agenteId || config.agentePadrao

  let conversaId = input.conversaId
  if (!conversaId) {
    const c = await store.createConversa(empresaId, actor, {
      titulo: tituloFromMessage(input.mensagem),
      agenteId,
    })
    conversaId = c.id
  }

  if (input.regenerar) {
    await store.deleteLastAssistantMessage(empresaId, conversaId)
  }

  let mensagemUserId = ''
  if (!input.regenerar) {
    const userMsg = await store.addMensagem(empresaId, conversaId, {
      role: 'user',
      conteudo: input.mensagem,
      anexos: input.anexos,
      agenteId,
    })
    mensagemUserId = userMsg.id

    // Atualiza título na 1ª mensagem útil
    const hist = await store.listMensagens(empresaId, conversaId)
    if (hist.filter((m) => m.role === 'user').length === 1) {
      await store.updateConversa(empresaId, conversaId, {
        titulo: tituloFromMessage(input.mensagem),
      })
    }
  }

  const historico = await store.listMensagens(empresaId, conversaId)
  const system = await buildSystemPrompt(
    empresaId,
    agenteId,
    config.promptPadrao,
    input.mensagem || historico.filter((m) => m.role === 'user').slice(-1)[0]?.conteudo || ''
  )

  const messages: LlmMessage[] = [
    { role: 'system', content: system },
    ...historico
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: formatMsgWithAnexos(m.conteudo, m.anexos),
      })),
  ]

  const provider = getLlmProviderFromConfig(config)
  const t0 = Date.now()
  let texto = ''
  let tokens = 0
  let erro: string | undefined

  try {
    const result = await provider.stream({
      messages,
      config,
      onToken,
      signal,
    })
    texto = result.texto
    tokens = result.tokens
  } catch (e) {
    if (e instanceof LlmProviderError && e.code === 'aborted') {
      throw e
    }
    erro = e instanceof Error ? e.message : String(e)
    texto =
      erro ||
      'Não foi possível gerar a resposta. Verifique a chave OpenAI em Configurações.'
    onToken(texto)
  }

  const tempoMs = Date.now() - t0
  const assistant = await store.addMensagem(empresaId, conversaId, {
    role: 'assistant',
    conteudo: texto,
    agenteId,
    tokens,
    regenerada: Boolean(input.regenerar),
  })

  const msgs = await store.listMensagens(empresaId, conversaId)
  await store.updateConversa(empresaId, conversaId, {
    qtdMensagens: msgs.length,
    agenteId,
  })

  await store.appendLog(empresaId, {
    usuarioId: actor.usuarioId,
    usuarioNome: actor.usuarioNome,
    agenteId,
    conversaId,
    tempoMs,
    tokens,
    erro,
    acao: input.regenerar ? 'regenerar' : 'chat',
  })

  if (erro && !(erro.includes('Chave OpenAI'))) {
    // ainda retorna resultado com texto de erro para a UI
  }

  return {
    conversaId,
    mensagemUserId: mensagemUserId || '',
    mensagemAssistantId: assistant.id,
    texto,
    tokens,
    tempoMs,
  }
}

function formatMsgWithAnexos(conteudo: string, anexos?: AiAnexo[]): string {
  if (!anexos?.length) return conteudo
  const lines = anexos.map((a) => `- Anexo: ${a.nome} (${a.tipo})${a.url ? ` ${a.url}` : ''}`)
  return `${conteudo}\n\nAnexos:\n${lines.join('\n')}`
}
