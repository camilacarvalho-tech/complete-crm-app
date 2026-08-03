import type { SystemContextQuery } from '../types'

/**
 * Contexto do Sistema — arquitetura pronta para amanhã (V1.1).
 * Cada query terá implementação em runSystemContextQuery.
 * V1: retorna estrutura + mensagem "preparado".
 */
export const SYSTEM_CONTEXT_QUERIES: SystemContextQuery[] = [
  {
    id: 'leads_hoje',
    label: 'Leads de hoje',
    exemploPergunta: 'Quantos leads entraram hoje?',
    modulo: 'crm',
    implementado: false,
  },
  {
    id: 'vendedor_top_mes',
    label: 'Top vendedor do mês',
    exemploPergunta: 'Qual vendedor fechou mais negócios este mês?',
    modulo: 'crm',
    implementado: false,
  },
  {
    id: 'tarefas_hoje',
    label: 'Tarefas de hoje',
    exemploPergunta: 'Quais tarefas tenho para hoje?',
    modulo: 'crm',
    implementado: false,
  },
  {
    id: 'campanhas_ativas',
    label: 'Campanhas ativas',
    exemploPergunta: 'Quais campanhas estão ativas?',
    modulo: 'crm',
    implementado: false,
  },
  {
    id: 'clientes_ativos',
    label: 'Clientes ativos',
    exemploPergunta: 'Quantos clientes ativos temos?',
    modulo: 'crm',
    implementado: false,
  },
  {
    id: 'contas_vencem_amanha',
    label: 'Contas a vencer amanhã',
    exemploPergunta: 'Quais contas vencem amanhã?',
    modulo: 'erp',
    implementado: false,
  },
  {
    id: 'fluxo_caixa_30d',
    label: 'Fluxo de caixa 30 dias',
    exemploPergunta: 'Mostre o fluxo de caixa dos últimos 30 dias.',
    modulo: 'erp',
    implementado: false,
  },
  {
    id: 'receita_mes',
    label: 'Receita do mês',
    exemploPergunta: 'Qual a receita deste mês?',
    modulo: 'erp',
    implementado: false,
  },
  {
    id: 'despesas_mes',
    label: 'Despesas do mês',
    exemploPergunta: 'Quanto gastamos este mês?',
    modulo: 'erp',
    implementado: false,
  },
  {
    id: 'estoque_baixo',
    label: 'Estoque baixo',
    exemploPergunta: 'Quais produtos estão abaixo do mínimo?',
    modulo: 'erp',
    implementado: false,
  },
]

export interface SystemContextResult {
  queryId: string
  ready: boolean
  message: string
  data?: unknown
}

/**
 * Stub: amanhã conecta Firestore tenant (empresas/{id}/...).
 * Nunca consulta outra empresa — empresaId é obrigatório.
 */
export async function runSystemContextQuery(
  empresaId: string,
  queryId: string
): Promise<SystemContextResult> {
  if (!empresaId) {
    return { queryId, ready: false, message: 'Empresa não identificada (isolamento multiempresa).' }
  }
  const def = SYSTEM_CONTEXT_QUERIES.find((q) => q.id === queryId)
  if (!def) {
    return { queryId, ready: false, message: 'Consulta de contexto desconhecida.' }
  }
  if (!def.implementado) {
    return {
      queryId,
      ready: false,
      message: `Consulta "${def.label}" preparada. Implementação agenda para Nexus AI V1.1 (amanhã). Ex.: "${def.exemploPergunta}"`,
    }
  }
  return { queryId, ready: true, message: 'OK', data: null }
}

/** Detecta intenção simples a partir do texto do usuário (heurística). */
export function detectContextIntent(texto: string): string | null {
  const t = texto.toLowerCase()
  if (t.includes('lead') && (t.includes('hoje') || t.includes('entraram'))) return 'leads_hoje'
  if (t.includes('vendedor') && (t.includes('fechou') || t.includes('mais'))) return 'vendedor_top_mes'
  if (t.includes('vence') || t.includes('vencem')) return 'contas_vencem_amanha'
  if (t.includes('fluxo') && t.includes('caixa')) return 'fluxo_caixa_30d'
  if (t.includes('estoque') && (t.includes('baixo') || t.includes('mínimo') || t.includes('minimo'))) return 'estoque_baixo'
  if (t.includes('campanha')) return 'campanhas_ativas'
  if (t.includes('tarefa') && t.includes('hoje')) return 'tarefas_hoje'
  if (t.includes('receita')) return 'receita_mes'
  if (t.includes('despesa') || t.includes('gast')) return 'despesas_mes'
  return null
}
