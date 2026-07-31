/**
 * Qualificação Nexus AI — ponto de extensão (INexusAiQualifier).
 * Conectores não conhecem o LLM; o worker chama só esta interface.
 */
import type { NormalizedLead } from '../connectors/types'
import type { FiltrosPesquisa, LeadScoreResult } from '../types'
import { classifyLead } from '../pipeline/classify'
import { scoreLead } from '../pipeline/score'

export interface QualifyContext {
  empresaId: string
  filtros: FiltrosPesquisa
  useLlm?: boolean
}

export interface INexusAiQualifier {
  classifyAndScore(lead: NormalizedLead, ctx: QualifyContext): Promise<LeadScoreResult>
}

/** Implementação V1.1 — reutiliza classify + score existentes. */
export const defaultNexusAiQualifier: INexusAiQualifier = {
  async classifyAndScore(lead, ctx) {
    const classification = await classifyLead(lead, ctx.filtros, ctx.empresaId, {
      useLlm: ctx.useLlm !== false,
    })
    return scoreLead(lead, classification, ctx.filtros)
  },
}

let activeQualifier: INexusAiQualifier = defaultNexusAiQualifier

export function setNexusAiQualifier(q: INexusAiQualifier): void {
  activeQualifier = q
}

export function getNexusAiQualifier(): INexusAiQualifier {
  return activeQualifier
}
