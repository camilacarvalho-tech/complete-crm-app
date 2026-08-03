import type { AiAgentDef } from '../types'

/**
 * Registro de agentes Nexus AI.
 * V1: apenas Assistente Geral ativo. Demais preparados (sem reescrita futura).
 */
export const AI_AGENTS: AiAgentDef[] = [
  {
    id: 'assistente_geral',
    nome: 'Assistente Geral',
    descricao: 'Responde perguntas gerais sobre o Nexus e orienta o uso do CRM/ERP.',
    status: 'ativo',
    icone: 'Bot',
    sistemaPrompt:
      'Você é o Assistente Geral da Nexus AI. Ajude com dúvidas da plataforma de forma clara.',
  },
  {
    id: 'comercial',
    nome: 'Comercial (Nexus Sales AI)',
    descricao: 'Pipeline, leads, conversão e propostas. Em breve.',
    status: 'preparado',
    icone: 'TrendingUp',
    sistemaPrompt: 'Agente comercial preparado para V2.',
  },
  {
    id: 'financeiro',
    nome: 'Financeiro (Nexus Finance AI)',
    descricao: 'Fluxo de caixa, DRE, contas. Em breve.',
    status: 'preparado',
    icone: 'DollarSign',
    sistemaPrompt: 'Agente financeiro preparado para V2.',
  },
  {
    id: 'marketing',
    nome: 'Marketing',
    descricao: 'Campanhas, ROI e canais. Em breve.',
    status: 'preparado',
    icone: 'Megaphone',
    sistemaPrompt: 'Agente marketing preparado.',
  },
  {
    id: 'rh',
    nome: 'RH',
    descricao: 'Pessoas, folha e documentos. Em breve.',
    status: 'preparado',
    icone: 'Users',
    sistemaPrompt: 'Agente RH preparado.',
  },
  {
    id: 'estoque',
    nome: 'Estoque',
    descricao: 'Produtos, lotes e rupturas. Em breve.',
    status: 'preparado',
    icone: 'Package',
    sistemaPrompt: 'Agente estoque preparado.',
  },
  {
    id: 'fiscal',
    nome: 'Fiscal',
    descricao: 'Notas, impostos e obrigações. Em breve.',
    status: 'preparado',
    icone: 'Receipt',
    sistemaPrompt: 'Agente fiscal preparado.',
  },
  {
    id: 'juridico',
    nome: 'Jurídico',
    descricao: 'Contratos e conformidade. Em breve.',
    status: 'preparado',
    icone: 'Scale',
    sistemaPrompt: 'Agente jurídico preparado.',
  },
  {
    id: 'prospeccao',
    nome: 'Prospecção',
    descricao: 'Captação inteligente de leads. Em breve.',
    status: 'preparado',
    icone: 'Radar',
    sistemaPrompt: 'Agente de prospecção preparado.',
  },
]

export function getAgent(id: string): AiAgentDef | undefined {
  return AI_AGENTS.find((a) => a.id === id)
}

export function getActiveAgents(): AiAgentDef[] {
  return AI_AGENTS.filter((a) => a.status === 'ativo')
}
