import type { ProcessRunStatus } from './processRun'

export type RobotKind = 'busca' | 'enriquecimento' | 'classificacao' | 'crm' | 'followup'

export type RobotUiStatus = 'executando' | 'pausado' | 'aguardando' | 'erro' | 'parado'

export interface RobotDefinicao {
  id: RobotKind
  nome: string
  responsabilidade: string
  futuro?: boolean
}

export const ROBOS_MONITOR: RobotDefinicao[] = [
  {
    id: 'busca',
    nome: 'Robô de busca',
    responsabilidade: 'Executa as pesquisas configuradas pelas campanhas e pela busca manual.',
  },
  {
    id: 'enriquecimento',
    nome: 'Robô de enriquecimento',
    responsabilidade: 'Completa dados empresariais somente com fontes permitidas (BrasilAPI, site público, OSM).',
  },
  {
    id: 'classificacao',
    nome: 'Robô de classificação',
    responsabilidade: 'Classifica e pontua leads conforme as regras da campanha. Não inventa dados.',
  },
  {
    id: 'crm',
    nome: 'Robô CRM',
    responsabilidade: 'Envia ao Nexus CRM somente após aprovação humana.',
  },
  {
    id: 'followup',
    nome: 'Robô de follow-up',
    responsabilidade: 'Preparado para o futuro. Sem contato automático sem configuração e base legal.',
    futuro: true,
  },
]

export function robotStatusFromProcess(status?: ProcessRunStatus | null): RobotUiStatus {
  if (status === 'processando') return 'executando'
  if (status === 'pausado') return 'pausado'
  if (status === 'aguardando') return 'aguardando'
  if (status === 'erro' || status === 'concluido_com_erros') return 'erro'
  if (status === 'cancelado' || status === 'concluido') return 'parado'
  return 'aguardando'
}
