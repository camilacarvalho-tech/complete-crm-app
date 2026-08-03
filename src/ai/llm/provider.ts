/**
 * Factory LLMProvider — ponto único de resolução do provedor ativo.
 */

import type { AiConfig, LlmProviderId } from '../types'
import type { LLMProvider } from './types'
import { OpenAiProvider } from './openaiProvider'
import {
  AnthropicProvider,
  GeminiProvider,
  AzureOpenAiProvider,
  OllamaProvider,
} from './stubs'

const openai = new OpenAiProvider()

const REGISTRY: Record<LlmProviderId, LLMProvider> = {
  openai,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  azure_openai: AzureOpenAiProvider,
  ollama: OllamaProvider,
}

export function getLlmProvider(providerId?: LlmProviderId | string): LLMProvider {
  const id = (providerId || 'openai') as LlmProviderId
  return REGISTRY[id] || openai
}

export function getLlmProviderFromConfig(config: AiConfig): LLMProvider {
  return getLlmProvider(config.llmProvider)
}

export function listLlmProviders(): { id: LlmProviderId; label: string; ready: boolean }[] {
  return [
    { id: 'openai', label: openai.label, ready: true },
    { id: 'anthropic', label: AnthropicProvider.label, ready: false },
    { id: 'gemini', label: GeminiProvider.label, ready: false },
    { id: 'azure_openai', label: AzureOpenAiProvider.label, ready: false },
    { id: 'ollama', label: OllamaProvider.label, ready: false },
  ]
}

export type { LLMProvider, LlmMessage, LlmStreamParams, LlmStreamResult } from './types'
export { LlmProviderError } from './types'
