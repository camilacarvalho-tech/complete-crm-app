/**
 * Abstração LLMProvider — Nexus AI troca de provedor sem mudar a arquitetura.
 * V1: OpenAI. Preparados: Anthropic, Gemini, Azure OpenAI, Ollama.
 */

import type { AiConfig, LlmProviderId } from '../types'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmStreamParams {
  messages: LlmMessage[]
  config: AiConfig
  onToken: (chunk: string) => void
  signal?: AbortSignal
}

export interface LlmStreamResult {
  texto: string
  tokens: number
}

export interface LLMProvider {
  readonly id: LlmProviderId
  readonly label: string
  stream(params: LlmStreamParams): Promise<LlmStreamResult>
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    public code: 'missing_key' | 'not_implemented' | 'api_error' | 'aborted' = 'api_error'
  ) {
    super(message)
    this.name = 'LlmProviderError'
  }
}
