/**
 * Provedor OpenAI (V1 ativo) — fetch nativo, sem SDK.
 * Permite streaming SSE / Chat Completions.
 */

import type { LLMProvider, LlmStreamParams, LlmStreamResult } from './types'
import { LlmProviderError } from './types'

export class OpenAiProvider implements LLMProvider {
  readonly id = 'openai' as const
  readonly label = 'OpenAI'

  async stream(params: LlmStreamParams): Promise<LlmStreamResult> {
    const key = (params.config.openaiApiKey || '').trim()
    if (!key) {
      throw new LlmProviderError(
        'Chave OpenAI não configurada. Abra Nexus AI → Configurações e informe a API Key.',
        'missing_key'
      )
    }

    const model = params.config.modelo || 'gpt-4o-mini'
    const body = {
      model,
      temperature: params.config.temperatura,
      max_tokens: params.config.maxTokens,
      messages: params.messages,
      stream: Boolean(params.config.streaming),
    }

    try {
      if (!params.config.streaming) {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...body, stream: false }),
          signal: params.signal,
        })
        if (!resp.ok) {
          const errText = await resp.text()
          throw new LlmProviderError(`OpenAI HTTP ${resp.status}: ${errText.slice(0, 300)}`, 'api_error')
        }
        const data = await resp.json()
        const full = data.choices?.[0]?.message?.content || ''
        const tokens = data.usage?.total_tokens || Math.ceil(full.length / 4)
        if (full) params.onToken(full)
        return { texto: full, tokens }
      }

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          ...body,
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal: params.signal,
      })

      if (!resp.ok) {
        const errText = await resp.text()
        throw new LlmProviderError(`OpenAI HTTP ${resp.status}: ${errText.slice(0, 300)}`, 'api_error')
      }
      if (!resp.body) {
        throw new LlmProviderError('OpenAI: resposta sem body (stream).', 'api_error')
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let full = ''
      let tokens = 0

      while (true) {
        if (params.signal?.aborted) {
          try {
            await reader.cancel()
          } catch {
            /* ignore */
          }
          throw new LlmProviderError('Geração cancelada.', 'aborted')
        }
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload)
            const delta = json.choices?.[0]?.delta?.content || ''
            if (delta) {
              full += delta
              params.onToken(delta)
            }
            if (json.usage?.total_tokens) tokens = json.usage.total_tokens
          } catch {
            /* chunk parcial */
          }
        }
      }

      if (!tokens) tokens = Math.ceil(full.length / 4)
      return { texto: full, tokens }
    } catch (err: unknown) {
      if (params.signal?.aborted) {
        throw new LlmProviderError('Geração cancelada.', 'aborted')
      }
      if (err instanceof LlmProviderError) throw err
      const msg = err instanceof Error ? err.message : String(err)
      throw new LlmProviderError(`OpenAI: ${msg}`, 'api_error')
    }
  }
}
