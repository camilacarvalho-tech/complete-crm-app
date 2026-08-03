/**
 * Nexus Sales AI — scaffolding V3 (sem LLM nesta versão).
 * V4.0 implementará análises e recomendações comerciais.
 */

export interface SalesAIInsight {
  id: string
  tipo: 'pipeline' | 'lead' | 'conversao' | 'campanha'
  titulo: string
  resumo: string
  prioridade: 'baixa' | 'media' | 'alta'
  criadoEm: string
}

export interface AnalyzePipelineInput {
  empresaId: string
  etapas: { nome: string; quantidade: number; valor: number }[]
}

/** Stub: retorna array vazio até V4. */
export async function analyzePipeline(_input: AnalyzePipelineInput): Promise<SalesAIInsight[]> {
  return []
}

/** Stub: recomendações de follow-up. */
export async function suggestFollowUps(_empresaId: string, _clienteIds: string[]): Promise<SalesAIInsight[]> {
  return []
}
