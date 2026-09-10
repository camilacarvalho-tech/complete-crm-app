/**
 * Nexus Lead Score — aderência comercial objetiva (0–100).
 * Não afirma intenção de compra.
 */
import { SCORE_THRESHOLDS } from '../constants'
import type { FiltrosPesquisa, LeadScoreResult, LeadTemperatura } from '../types'
import type { NormalizedLead } from '../connectors/types'
import type { LeadClassification } from './classify'
import { digitsOnly } from './normalizeFields'

export function temperaturaFromScore(score: number): LeadTemperatura {
  if (score >= SCORE_THRESHOLDS.muitoQuente) return 'Muito quente'
  if (score >= SCORE_THRESHOLDS.quente) return 'Quente'
  if (score >= SCORE_THRESHOLDS.morno) return 'Morno'
  return 'Frio'
}

export function scoreLead(
  lead: NormalizedLead,
  classification: LeadClassification,
  filtros: FiltrosPesquisa
): LeadScoreResult {
  let score = 20
  const motivos: string[] = []

  const segFiltro = (filtros.segmento || '').toLowerCase()
  const segLead = (lead.segmento || '').toLowerCase()
  const nome = (lead.nome || '').toLowerCase()
  const tipos = ((lead.metadados?.tipos as string[]) || []).join(' ').toLowerCase()
  const kw = (filtros.palavraChave || '').toLowerCase()
  const cnaeFiltro = (filtros.cnae || '').replace(/\D/g, '')
  const cnaeLead = String(lead.dadosEnriquecidos?.cnaePrincipal || '')
  const situacao = String(lead.dadosEnriquecidos?.situacaoCadastral || '').toLowerCase()
  const business = String(lead.metadados?.businessStatus || '').toUpperCase()

  const segmentoHit =
    (segFiltro && (segLead.includes(segFiltro) || nome.includes(segFiltro) || tipos.includes(segFiltro))) ||
    (kw && (nome.includes(kw) || segLead.includes(kw) || tipos.includes(kw)))
  if (segmentoHit) {
    score += 22
    motivos.push('segmento altamente aderente')
  } else if (segFiltro || kw) {
    motivos.push('segmento parcialmente relacionado ou não confirmado')
  }

  if (cnaeFiltro && cnaeLead.includes(cnaeFiltro)) {
    score += 12
    motivos.push('CNAE aderente')
  }

  const cidade = (lead.cidade || '').toLowerCase()
  if (filtros.cidade && cidade.includes(filtros.cidade.toLowerCase())) {
    score += 10
    motivos.push('localização prioritária')
  } else if (filtros.estado && (lead.estado || '').toUpperCase() === filtros.estado.toUpperCase()) {
    score += 6
    motivos.push('UF compatível')
  }

  const ativa =
    situacao.includes('ativa') ||
    business === 'OPERATIONAL' ||
    (!situacao && !business)
  if (situacao.includes('ativa') || business === 'OPERATIONAL') {
    score += 12
    motivos.push('empresa ativa')
  } else if (ativa) {
    score += 4
  }

  const tel = digitsOnly(lead.telefone)
  if (tel.length >= 10) {
    score += 10
    motivos.push('telefone disponível')
  }

  if (lead.website || lead.dominio) {
    score += 10
    motivos.push('website identificado')
  }

  const completo = Boolean(lead.nome && (lead.endereco || lead.cidade) && (lead.telefone || lead.website))
  if (completo) {
    score += 8
    motivos.push('dados comerciais completos')
  }

  const porte = String(lead.dadosEnriquecidos?.porteEmpresa || '').toLowerCase()
  if (porte && /micro|pequeno|demais|medio|médio/.test(porte)) {
    score += 6
    motivos.push('porte/estrutura compatível')
  }

  if (lead.cnpjValidado || lead.dadosEnriquecidos?.cnpjValidado) {
    score += 8
    motivos.push('CNPJ validado em base pública')
  }

  if (lead.connectorId === 'google-places') {
    motivos.push('alta compatibilidade com o Nexus CRM')
  }

  if (classification.origem === 'nexus_ai_llm') {
    score += 2
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const temperatura = temperaturaFromScore(score)

  return {
    score,
    temperatura,
    classificacao: temperatura,
    categoria: classification.categoria,
    motivos: motivos.slice(0, 8),
    origemScore: classification.origem,
  }
}
