export const UFS_BRASIL = [
  { uf: 'AC', nome: 'ACRE' },
  { uf: 'AL', nome: 'ALAGOAS' },
  { uf: 'AP', nome: 'AMAPÁ' },
  { uf: 'AM', nome: 'AMAZONAS' },
  { uf: 'BA', nome: 'BAHIA' },
  { uf: 'CE', nome: 'CEARÁ' },
  { uf: 'DF', nome: 'DISTRITO FEDERAL' },
  { uf: 'ES', nome: 'ESPÍRITO SANTO' },
  { uf: 'GO', nome: 'GOIÁS' },
  { uf: 'MA', nome: 'MARANHÃO' },
  { uf: 'MT', nome: 'MATO GROSSO' },
  { uf: 'MS', nome: 'MATO GROSSO DO SUL' },
  { uf: 'MG', nome: 'MINAS GERAIS' },
  { uf: 'PA', nome: 'PARÁ' },
  { uf: 'PB', nome: 'PARAÍBA' },
  { uf: 'PR', nome: 'PARANÁ' },
  { uf: 'PE', nome: 'PERNAMBUCO' },
  { uf: 'PI', nome: 'PIAUÍ' },
  { uf: 'RJ', nome: 'RIO DE JANEIRO' },
  { uf: 'RN', nome: 'RIO GRANDE DO NORTE' },
  { uf: 'RS', nome: 'RIO GRANDE DO SUL' },
  { uf: 'RO', nome: 'RONDÔNIA' },
  { uf: 'RR', nome: 'RORAIMA' },
  { uf: 'SC', nome: 'SANTA CATARINA' },
  { uf: 'SP', nome: 'SÃO PAULO' },
  { uf: 'SE', nome: 'SERGIPE' },
  { uf: 'TO', nome: 'TOCANTINS' },
] as const

export const LEAD_ORIGINS = [
  { code: 'trafego_pago', label: 'TRÁFEGO PAGO' },
  { code: 'facebook', label: 'FACEBOOK' },
  { code: 'follow_up', label: 'FOLLOW-UP' },
  { code: 'instagram', label: 'INSTAGRAM' },
  { code: 'whatsapp', label: 'WHATSAPP' },
  { code: 'indicacao', label: 'INDICAÇÃO' },
  { code: 'landing_page', label: 'LANDING PAGE' },
  { code: 'leads_monitor', label: 'LEADS MONITOR' },
  { code: 'site', label: 'SITE' },
  { code: 'organico', label: 'ORGÂNICO' },
  { code: 'google', label: 'GOOGLE' },
  { code: 'campanha', label: 'CAMPANHA' },
  { code: 'api', label: 'API' },
  { code: 'manual', label: 'MANUAL' },
  { code: 'outros', label: 'OUTROS' },
] as const

export const ATTENDANCE_STAGES = [
  { id: 'novo_lead', label: 'NOVO LEAD' },
  { id: 'triagem', label: 'TRIAGEM' },
  { id: 'em_atendimento', label: 'EM ATENDIMENTO' },
  { id: 'aguardando_cliente', label: 'AGUARDANDO CLIENTE' },
  { id: 'qualificado', label: 'QUALIFICADO' },
  { id: 'simulacao', label: 'SIMULAÇÃO' },
  { id: 'proposta', label: 'PROPOSTA' },
  { id: 'documentacao', label: 'DOCUMENTAÇÃO' },
  { id: 'em_analise', label: 'EM ANÁLISE' },
  { id: 'aprovado', label: 'APROVADO' },
  { id: 'contrato', label: 'CONTRATO' },
  { id: 'finalizado', label: 'FINALIZADO' },
  { id: 'perdido', label: 'PERDIDO' },
  { id: 'cancelado', label: 'CANCELADO' },
] as const

export const CONVENIOS_PADRAO = [
  { code: 'servidor_municipal', label: 'SERVIDOR MUNICIPAL' },
  { code: 'servidor_estadual', label: 'SERVIDOR ESTADUAL' },
  { code: 'servidor_federal', label: 'SERVIDOR FEDERAL' },
  { code: 'exercito', label: 'EXÉRCITO' },
  { code: 'marinha', label: 'MARINHA' },
  { code: 'aeronautica', label: 'AERONÁUTICA' },
  { code: 'gov_sp', label: 'GOVERNO DE SÃO PAULO' },
  { code: 'gov_rj', label: 'GOVERNO DO RIO DE JANEIRO' },
  { code: 'gov_mg', label: 'GOVERNO DE MINAS GERAIS' },
  { code: 'gov_pr', label: 'GOVERNO DO PARANÁ' },
  { code: 'gov_rs', label: 'GOVERNO DO RIO GRANDE DO SUL' },
  { code: 'inss', label: 'INSS' },
  { code: 'siape', label: 'SIAPE' },
  { code: 'clt', label: 'CLT' },
] as const

export const INSS_OPERACOES = [
  'PORTABILIDADE',
  'REDUÇÃO DE PARCELA',
  'MARGEM NOVA',
  'REFINANCIAMENTO',
  'SAQUE DE CARTÃO',
  'CARTÃO',
] as const

export const PRODUCT_TREE = [
  { code: 'CLT', nome: 'CRÉDITO CLT', categoria: 'credito', sub: [] as string[] },
  { code: 'FGTS', nome: 'SAQUE FGTS', categoria: 'credito', sub: [] as string[] },
  { code: 'INSS', nome: 'INSS', categoria: 'consignado', sub: [...INSS_OPERACOES] },
  { code: 'GOVERNO', nome: 'GOVERNO', categoria: 'consignado', sub: ['SERVIDOR FEDERAL', 'SIAPE'] },
  { code: 'MUNICIPAL', nome: 'SERVIDOR MUNICIPAL', categoria: 'consignado', sub: [] as string[] },
  { code: 'ESTADUAL', nome: 'SERVIDOR ESTADUAL', categoria: 'consignado', sub: [] as string[] },
  { code: 'REFIN_CARRO', nome: 'REFIN CARRO', categoria: 'refinanciamento', sub: [] as string[] },
  { code: 'CASA', nome: 'CASA', categoria: 'refinanciamento', sub: [] as string[] },
  { code: 'SOLAR', nome: 'PLACA SOLAR', categoria: 'credito', sub: [] as string[] },
] as const

export function productLabel(code?: string): string {
  const found = PRODUCT_TREE.find((p) => p.code === code || p.nome === String(code || '').toUpperCase())
  return found?.nome || String(code || '').toUpperCase() || '—'
}

export function productSubs(code?: string): string[] {
  const found = PRODUCT_TREE.find((p) => p.code === code)
  return found ? [...found.sub] : []
}

export const BANCOS_DIGITACAO = [
  'ITAÚ', 'FACTA', 'SANTANDER', 'CAIXA', 'BRADESCO', 'C6 BANK', 'DAYCOVAL', 'BRB', 'BMG', 'PARIBAS', 'QI SOCIEDADE DE CRÉDITO', 'BMS SOCIEDADE', 'MONEY PLUS SOCIEDADE',
] as const

export function originLabel(code?: string): string {
  const found = LEAD_ORIGINS.find((o) => o.code === code || o.label === String(code || '').toUpperCase())
  return found?.label || String(code || '').toUpperCase() || '—'
}

export function originCode(value?: string): string {
  const v = String(value || '').trim().toLowerCase().replace(/\s+/g, '_')
  const found = LEAD_ORIGINS.find((o) => o.code === v || o.label.toLowerCase().replace(/\s+/g, '_') === v)
  if (found) return found.code
  if (v.includes('meta') || v.includes('ads')) return 'trafego_pago'
  if (v.includes('monitor')) return 'leads_monitor'
  if (v.includes('facebook')) return 'facebook'
  if (v === 'campaign' || v.includes('campanha')) return 'campanha'
  if (v === 'csv') return 'outros'
  return v || 'manual'
}
