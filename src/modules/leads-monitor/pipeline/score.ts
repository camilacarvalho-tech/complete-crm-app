/**
 * Etapa 5 — Score numérico (após classificação).
 */
import { SCORE_THRESHOLDS } from '../constants'
import type { FiltrosPesquisa, LeadScoreResult, LeadTemperatura } from '../types'
import type { NormalizedLead } from '../connectors/types'
import type { LeadClassification } from './classify'

function temperaturaFromScore(score: number): LeadTemperatura {
  if (score >= SCORE_THRESHOLDS.quente) return 'Quente'
  if (score >= SCORE_THRESHOLDS.morno) return 'Morno'
  return 'Frio'
}

const CATEGORIA_BASE: Record<string, number> = {
  prioridade_maxima: 88,
  alta: 76,
  qualificar: 55,
  baixa: 32,
}

export function scoreLead(
  lead: NormalizedLead,
  classification: LeadClassification,
  filtros: FiltrosPesquisa
): LeadScoreResult {
  let score = CATEGORIA_BASE[classification.categoria] ?? 50
  const motivos: string[] = [
    `Classificação: ${classification.label}`,
    classification.motivo,
  ]

  if (lead.telefone && lead.telefone.replace(/\D/g, '').length >= 10) {
    score += 4
    motivos.push('Telefone válido')
  }
  if (lead.email?.includes('@')) {
    score += 3
    motivos.push('E-mail presente')
  }

  const kw = (filtros.palavraChave || '').toLowerCase()
  if (
    kw &&
    (lead.nome.toLowerCase().includes(kw) ||
      (lead.observacoes || '').toLowerCase().includes(kw) ||
      lead.segmento.toLowerCase().includes(kw))
  ) {
    score += 5
    motivos.push('Match de palavra-chave')
  }

  if (classification.origem === 'nexus_ai_llm') {
    score += 2
    motivos.push('Classificado pela IA')
  }

  score = Math.max(5, Math.min(98, Math.round(score)))

  return {
    score,
    temperatura: temperaturaFromScore(score),
    classificacao: classification.label,
    categoria: classification.categoria,
    motivos: motivos.filter(Boolean).slice(0, 5),
    origemScore: classification.origem,
  }
}
