export type ReportId =
  | 'kpis'
  | 'leads_dia'
  | 'origem'
  | 'produtos'
  | 'status'
  | 'cidades'
  | 'evolucao_origem'
  | 'funil'
  | 'conversao_produto'
  | 'equipe'
  | 'marketing'
  | 'roi_campanha'
  | 'leads_campanha'
  | 'finance'
  | 'receita_produto'
  | 'despesas_cat'
  | 'comissao_produto'

export type ReportCategory = 'CRM' | 'MARKETING' | 'ATENDIMENTO' | 'VENDAS' | 'FINANCEIRO' | 'PRODUÇÃO'

export interface ReportDef {
  id: ReportId
  category: ReportCategory
  title: string
  type: 'KPI' | 'PIZZA' | 'DONUT' | 'BARRAS' | 'LINHA' | 'ÁREA' | 'FUNIL' | 'TABELA'
}

export interface DashWidget {
  id: string
  reportId: ReportId
  span: 1 | 2
  title?: string
}

export const REPORT_CATALOG: ReportDef[] = [
  { id: 'kpis', category: 'CRM', title: 'KPIs principais', type: 'KPI' },
  { id: 'leads_dia', category: 'CRM', title: 'Leads recebidos', type: 'ÁREA' },
  { id: 'origem', category: 'CRM', title: 'Leads por origem', type: 'DONUT' },
  { id: 'produtos', category: 'CRM', title: 'Leads por produto', type: 'DONUT' },
  { id: 'status', category: 'CRM', title: 'Status dos leads', type: 'DONUT' },
  { id: 'cidades', category: 'CRM', title: 'Leads por cidade', type: 'BARRAS' },
  { id: 'evolucao_origem', category: 'CRM', title: 'Evolução por origem', type: 'ÁREA' },
  { id: 'funil', category: 'VENDAS', title: 'Funil de vendas', type: 'FUNIL' },
  { id: 'conversao_produto', category: 'VENDAS', title: 'Conversão por produto', type: 'BARRAS' },
  { id: 'equipe', category: 'ATENDIMENTO', title: 'Desempenho da equipe', type: 'TABELA' },
  { id: 'marketing', category: 'MARKETING', title: 'Investimento x resultado', type: 'BARRAS' },
  { id: 'roi_campanha', category: 'MARKETING', title: 'ROI por campanha', type: 'BARRAS' },
  { id: 'leads_campanha', category: 'MARKETING', title: 'Leads por campanha', type: 'DONUT' },
  { id: 'finance', category: 'FINANCEIRO', title: 'Receita x custos', type: 'BARRAS' },
  { id: 'receita_produto', category: 'FINANCEIRO', title: 'Receita por produto', type: 'DONUT' },
  { id: 'despesas_cat', category: 'FINANCEIRO', title: 'Despesas por categoria', type: 'DONUT' },
  { id: 'comissao_produto', category: 'PRODUÇÃO', title: 'Comissões por produto', type: 'DONUT' },
]

export const DEFAULT_WIDGETS: DashWidget[] = [
  { id: 'w-kpis', reportId: 'kpis', span: 2 },
  { id: 'w-dia', reportId: 'leads_dia', span: 1 },
  { id: 'w-origem', reportId: 'origem', span: 1 },
  { id: 'w-prod', reportId: 'produtos', span: 1 },
  { id: 'w-status', reportId: 'status', span: 1 },
  { id: 'w-funil', reportId: 'funil', span: 1 },
  { id: 'w-conv', reportId: 'conversao_produto', span: 1 },
  { id: 'w-mkt', reportId: 'marketing', span: 1 },
  { id: 'w-fin', reportId: 'finance', span: 1 },
  { id: 'w-equipe', reportId: 'equipe', span: 2 },
]

export function layoutStorageKey(empresaId?: string | null, userId?: string) {
  return `nexus-dashboard-layout-v1:${empresaId || 'empresa'}:${userId || 'user'}`
}
