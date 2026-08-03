import type { LLMProvider, LlmStreamParams, LlmStreamResult } from './types'
import { LlmProviderError } from './types'
import type { LlmProviderId } from '../types'

/** Stub tipado — ativar sem reescrever a arquitetura. */
function stubProvider(id: LlmProviderId, label: string): LLMProvider {
  return {
    id,
    label,
    async stream(_params: LlmStreamParams): Promise<LlmStreamResult> {
      throw new LlmProviderError(
        `${label} preparado na arquitetura Nexus AI. Ative nas Configurações em versão futura.`,
        'not_implemented'
      )
    },
  }
}

export const AnthropicProvider = stubProvider('anthropic', 'Anthropic Claude')
export const GeminiProvider = stubProvider('gemini', 'Google Gemini')
export const AzureOpenAiProvider = stubProvider('azure_openai', 'Azure OpenAI')
export const OllamaProvider = stubProvider('ollama', 'Ollama / LM Studio')
