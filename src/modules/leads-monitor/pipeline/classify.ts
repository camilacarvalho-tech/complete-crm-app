/**
 * Etapa 4 — Classificação pela Nexus AI.
 * Separada do score: define categoria / prioridade qualitativa.
 */
import { isNexusAiBackendUp } from '../../../ai/backendBridge'
import { nexusAiHttp } from '../../../ai/httpClient'
import type { FiltrosPesquisa } from '../types'
import type { NormalizedLead } from '../connectors/types'

export type LeadClassificacaoCategoria =
  | 'prioridade_maxima'
  | 'alta'
  | 'qualificar'
  | 'baixa'

export interface LeadClassification {
  categoria: LeadClassificacaoCategoria
  label: string
  motivo: string
  origem: 'nexus_ai_heuristica' | 'nexus_ai_llm'
}

function classifyHeuristic(lead: NormalizedLead, filtros: FiltrosPesquisa): LeadClassification {
  let pontos = 0
  const motivos: string[] = []

  if (lead.consentimentoLgpd) {
    pontos += 2
    motivos.push('base legal OK')
  }
  if (lead.connectorId === 'formularios_autorizados') {
    pontos += 3
    motivos.push('formulário autorizado')
  } else if (lead.connectorId === 'bases_publicas_empresas') {
    pontos += 1
    motivos.push('base pública')
  }

  const seg = (filtros.segmento || '').toLowerCase()
  if (seg && lead.segmento.toLowerCase().includes(seg)) {
    pontos += 2
    motivos.push('segmento')
  }
  if (filtros.cidade && lead.cidade.toLowerCase().includes(filtros.cidade.toLowerCase())) {
    pontos += 1
    motivos.push('cidade')
  }
  if (filtros.estado && lead.estado.toUpperCase() === filtros.estado.toUpperCase()) {
    pontos += 1
    motivos.push('UF')
  }

  const niche = ['inss', 'credito_clt', 'emprestimo', 'consignado', 'fgts']
  if (niche.some((n) => lead.segmento.includes(n))) pontos += 1

  let categoria: LeadClassificacaoCategoria = 'baixa'
  if (pontos >= 8) categoria = 'prioridade_maxima'
  else if (pontos >= 6) categoria = 'alta'
  else if (pontos >= 3) categoria = 'qualificar'

  const labels: Record<LeadClassificacaoCategoria, string> = {
    prioridade_maxima: `Prioridade máxima · ${lead.segmento || 'geral'}`,
    alta: `Alta prioridade · ${lead.segmento || 'geral'}`,
    qualificar: `Qualificar · ${lead.segmento || 'geral'}`,
    baixa: `Baixa prioridade · ${lead.segmento || 'geral'}`,
  }

  return {
    categoria,
    label: labels[categoria],
    motivo: motivos.slice(0, 3).join(', ') || 'classificação padrão',
    origem: 'nexus_ai_heuristica',
  }
}

function parseCategoria(text: string): LeadClassificacaoCategoria | null {
  const t = text.toLowerCase()
  if (/prioridade[_\s-]?maxima|muito alta|urgent/.test(t)) return 'prioridade_maxima'
  if (/\balta\b/.test(t)) return 'alta'
  if (/qualificar|media|média/.test(t)) return 'qualificar'
  if (/\bbaixa\b/.test(t)) return 'baixa'
  return null
}

/**
 * Classifica o lead. Tenta Nexus AI (LLM); fallback heurístico do módulo AI.
 */
export async function classifyLead(
  lead: NormalizedLead,
  filtros: FiltrosPesquisa,
  empresaId: string,
  opts?: { useLlm?: boolean }
): Promise<LeadClassification> {
  const base = classifyHeuristic(lead, filtros)
  if (opts?.useLlm === false) return base

  try {
    if (!(await isNexusAiBackendUp())) return base

    const prompt = [
      'Você é a classificação do Leads Monitor (IA Recomece Cred).',
      'Classifique o lead em UMA categoria: prioridade_maxima | alta | qualificar | baixa',
      'Responda em 2 linhas:',
      'categoria: ...',
      'motivo: frase curta',
      '',
      `Nome: ${lead.nome}`,
      `Tipo: ${lead.tipo}`,
      `Segmento: ${lead.segmento}`,
      `Cidade/UF: ${lead.cidade}/${lead.estado}`,
      `Conector: ${lead.origemLabel}`,
      `Base legal: ${lead.baseLegal}`,
    ].join('\n')

    const res = await nexusAiHttp.chat(
      { empresaId, usuarioId: 'leads-monitor', usuarioNome: 'Leads Monitor' },
      { mensagem: prompt, agente_id: 'assistente_geral' }
    )

    const texto = String(res?.resposta || res?.mensagem || res?.conteudo || '')
    const cat = parseCategoria(texto)
    if (!cat) return base

    const labels: Record<LeadClassificacaoCategoria, string> = {
      prioridade_maxima: `Prioridade máxima · ${lead.segmento || 'geral'}`,
      alta: `Alta prioridade · ${lead.segmento || 'geral'}`,
      qualificar: `Qualificar · ${lead.segmento || 'geral'}`,
      baixa: `Baixa prioridade · ${lead.segmento || 'geral'}`,
    }

    const motivoMatch = texto.match(/motivo\s*[:=]\s*(.+)/i)

    return {
      categoria: cat,
      label: labels[cat],
      motivo: (motivoMatch?.[1] || '').trim() || base.motivo,
      origem: 'nexus_ai_llm',
    }
  } catch {
    return base
  }
}
