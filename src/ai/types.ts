/**
 * Nexus AI V1.0 — Tipos oficiais do serviço (independente de CRM/ERP).
 */

export type AiAgentId =
  | 'assistente_geral'
  | 'comercial'
  | 'financeiro'
  | 'marketing'
  | 'rh'
  | 'estoque'
  | 'fiscal'
  | 'juridico'
  | 'prospeccao'

export type AiAgentStatus = 'ativo' | 'preparado' | 'desativado'

export type LlmProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'azure_openai'
  | 'ollama'

export interface AiAgentDef {
  id: AiAgentId
  nome: string
  descricao: string
  status: AiAgentStatus
  icone: string
  sistemaPrompt: string
}

export interface AiAnexo {
  nome: string
  tipo: string
  url?: string
  storagePath?: string
  tamanho?: number
}

export interface AiMensagem {
  id: string
  conversaId: string
  role: 'user' | 'assistant' | 'system'
  conteudo: string
  anexos?: AiAnexo[]
  agenteId?: AiAgentId
  tokens?: number
  criadoEm?: unknown
  regenerada?: boolean
}

export interface AiConversa {
  id: string
  titulo: string
  usuarioId: string
  usuarioNome: string
  empresaId: string
  agenteId: AiAgentId
  qtdMensagens: number
  data: string
  hora: string
  atualizadoEm?: unknown
  criadoEm?: unknown
  arquivada?: boolean
}

export interface AiMemoriaItem {
  id: string
  chave: string
  valor: string
  categoria: 'empresa' | 'segmento' | 'preferencia' | 'configuracao' | 'outro'
  atualizadoEm?: unknown
}

export interface AiConhecimentoDoc {
  id: string
  titulo: string
  tipo: 'pdf' | 'docx' | 'txt' | 'outro'
  nomeArquivo: string
  tamanho?: number
  storagePath?: string
  url?: string
  /** Texto extraído (TXT na V1) — injetado no prompt */
  conteudoTexto?: string
  status: 'pendente' | 'indexado' | 'erro'
  criadoEm?: unknown
}

export interface AiConfig {
  /** Provedor LLM ativo (V1: openai) */
  llmProvider: LlmProviderId
  modelo: string
  temperatura: number
  maxTokens: number
  idioma: string
  promptPadrao: string
  agentePadrao: AiAgentId
  streaming: boolean
  /** Chave do provedor ativo (OpenAI na V1). Escopo da empresa. */
  openaiApiKey?: string
  anthropicApiKey?: string
  geminiApiKey?: string
  azureApiKey?: string
  azureEndpoint?: string
  ollamaBaseUrl?: string
}

export interface AiLog {
  id: string
  data: string
  hora: string
  usuarioId: string
  usuarioNome: string
  empresaId: string
  agenteId: AiAgentId
  conversaId?: string
  tempoMs?: number
  tokens?: number
  erro?: string
  acao: string
  criadoEm?: unknown
}

export interface AiAuditLog {
  id: string
  requestId: string
  empresaId: string
  usuarioId: string
  usuarioNome: string
  authMethod: string
  method: string
  path: string
  statusCode: number
  latencyMs?: number
  error?: string
  createdAt?: unknown
}

/** Consultas de contexto do sistema (preparadas para V1.1) */
export type SystemContextQueryId =
  | 'leads_hoje'
  | 'vendedor_top_mes'
  | 'contas_vencem_amanha'
  | 'fluxo_caixa_30d'
  | 'clientes_ativos'
  | 'tarefas_hoje'
  | 'campanhas_ativas'
  | 'estoque_baixo'
  | 'receita_mes'
  | 'despesas_mes'

export interface SystemContextQuery {
  id: SystemContextQueryId
  label: string
  exemploPergunta: string
  modulo: 'crm' | 'erp'
  /** false = só arquitetura na V1 */
  implementado: boolean
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  llmProvider: 'openai',
  modelo: 'gpt-4o-mini',
  temperatura: 0.4,
  maxTokens: 2048,
  idioma: 'pt-BR',
  promptPadrao:
    'Você é a Nexus AI, assistente oficial da plataforma Nexus CRM + ERP da CODE Tecnologia Empresarial. Responda em português, de forma clara e profissional. Nunca invente dados de outras empresas. Nunca acesse ou mencione dados de outras empresas.',
  agentePadrao: 'assistente_geral',
  streaming: true,
  openaiApiKey: '',
}

export interface ChatActor {
  usuarioId: string
  usuarioNome: string
}

export interface StreamChatInput {
  empresaId: string
  conversaId?: string
  mensagem: string
  agenteId?: AiAgentId
  anexos?: AiAnexo[]
  actor: ChatActor
  /** Regenerar última resposta do assistant */
  regenerar?: boolean
  onToken: (chunk: string) => void
  signal?: AbortSignal
}

export interface StreamChatResult {
  conversaId: string
  mensagemUserId: string
  mensagemAssistantId: string
  texto: string
  tokens: number
  tempoMs: number
}
