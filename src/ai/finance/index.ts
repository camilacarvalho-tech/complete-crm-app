/**
 * Nexus Finance AI — scaffolding V3 (sem LLM nesta versão).
 * V4.0 implementará análises financeiras e recomendações.
 */

export interface FinanceAIInsight {
  id: string
  tipo: 'fluxo' | 'dre' | 'despesa' | 'receita' | 'estoque'
  titulo: string
  resumo: string
  prioridade: 'baixa' | 'media' | 'alta'
  criadoEm: string
}

export interface CashflowInput {
  empresaId: string
  entradas: number
  saidas: number
  periodo: string
}

/** Stub: retorna array vazio até V4. */
export async function cashflowInsights(_input: CashflowInput): Promise<FinanceAIInsight[]> {
  return []
}

/** Stub: alertas de inadimplência / custo. */
export async function financeAlerts(_empresaId: string): Promise<FinanceAIInsight[]> {
  return []
}
