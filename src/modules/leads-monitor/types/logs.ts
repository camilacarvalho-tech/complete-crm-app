export type LogCanal =
  | 'todos'
  | 'busca'
  | 'enriquecimento'
  | 'classificacao'
  | 'crm'
  | 'sistema'
  | 'aviso'
  | 'erro'
  | 'lgpd'
  | 'esc'
  | 'robo'

export interface LogLinha {
  id: string
  timestamp?: unknown
  hora?: string
  canal: LogCanal
  robotId?: string
  campaignId?: string
  estado?: string
  cidade?: string
  bairro?: string
  cep?: string
  acao: string
  resultado?: string
  status?: string
  mensagem: string
  erro?: string
  duration?: string
}
