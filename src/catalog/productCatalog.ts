/** Catálogo oficial de produtos do Nexus. Fonte única para Dashboard, Digitação, Leads, Chat e IA. */

export type ProductCode =
  | 'INSS'
  | 'CREDITO_PESSOAL'
  | 'CLT'
  | 'FGTS'
  | 'ENERGIA'
  | 'SAQUE_ANIVERSARIO'
  | 'GOV_ESTADOS'
  | 'ESTADUAL'
  | 'MUNICIPAL'
  | 'REFIN_CARRO'
  | 'CASA'
  | 'SOLAR'

export interface CatalogOperation {
  code: string
  label: string
}

export interface CatalogProduct {
  code: ProductCode
  label: string
  categoria: 'credito' | 'consignado' | 'refinanciamento'
  /** Entra no bloco "Leads por produto" / "Conversão por produto" do Dashboard. */
  creditoDashboard: boolean
  operations: CatalogOperation[]
  needsState?: boolean
  needsCity?: boolean
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  {
    code: 'INSS',
    label: 'INSS',
    categoria: 'credito',
    creditoDashboard: true,
    operations: [
      { code: 'PORTABILIDADE', label: 'Portabilidade' },
      { code: 'REFINANCIAMENTO', label: 'Refinanciamento' },
      { code: 'NOVA_MARGEM', label: 'Nova Margem' },
      { code: 'CARTAO_RMC', label: 'Cartão RMC' },
      { code: 'CARTAO_RCC', label: 'Cartão RCC' },
      { code: 'REDUCAO_PARCELA', label: 'Redução de Parcela' },
    ],
  },
  { code: 'CREDITO_PESSOAL', label: 'Crédito Pessoal', categoria: 'credito', creditoDashboard: true, operations: [] },
  { code: 'CLT', label: 'Crédito CLT', categoria: 'credito', creditoDashboard: true, operations: [] },
  { code: 'FGTS', label: 'Saque FGTS', categoria: 'credito', creditoDashboard: true, operations: [] },
  { code: 'ENERGIA', label: 'Crédito na Conta de Energia', categoria: 'credito', creditoDashboard: true, operations: [] },
  {
    code: 'SAQUE_ANIVERSARIO',
    label: 'Saque Aniversário',
    categoria: 'credito',
    creditoDashboard: false,
    operations: [{ code: 'SAQUE_FGTS', label: 'Saque FGTS' }],
  },
  { code: 'GOV_ESTADOS', label: 'Gov dos Estados', categoria: 'consignado', creditoDashboard: false, operations: [], needsState: true },
  { code: 'ESTADUAL', label: 'Servidor Estadual', categoria: 'consignado', creditoDashboard: false, operations: [], needsState: true },
  { code: 'MUNICIPAL', label: 'Servidor Municipal', categoria: 'consignado', creditoDashboard: false, operations: [], needsState: true, needsCity: true },
  {
    code: 'REFIN_CARRO',
    label: 'Refin de Carro',
    categoria: 'refinanciamento',
    creditoDashboard: false,
    operations: [{ code: 'REFINANCIAMENTO', label: 'Refinanciamento' }],
  },
  {
    code: 'CASA',
    label: 'Refin de Casa',
    categoria: 'refinanciamento',
    creditoDashboard: false,
    operations: [{ code: 'REFINANCIAMENTO', label: 'Refinanciamento' }],
  },
  { code: 'SOLAR', label: 'Placa Solar', categoria: 'credito', creditoDashboard: false, operations: [] },
]

export const CREDIT_PRODUCTS = PRODUCT_CATALOG.filter((p) => p.creditoDashboard)

export const DIGITACAO_STATUSES = [
  { id: 'aprovado', label: 'Aprovado' },
  { id: 'nao_aprovado', label: 'Não aprovado' },
  { id: 'em_analise', label: 'Em análise' },
  { id: 'em_andamento', label: 'Em andamento' },
  { id: 'formalizado', label: 'Formalizado' },
  { id: 'nao_formalizado', label: 'Não formalizado' },
  { id: 'averbado', label: 'Averbado' },
  { id: 'nao_averbado', label: 'Não averbado' },
] as const

export const KANBAN_COLUMNS = [
  { id: 'nova', label: 'Novas' },
  { id: 'em_analise', label: 'Em análise' },
  { id: 'documentacao_pendente', label: 'Documentação pendente' },
  { id: 'aprovada', label: 'Aprovadas' },
  { id: 'formalizacao', label: 'Formalização' },
  { id: 'averbada', label: 'Averbadas' },
  { id: 'finalizada', label: 'Finalizadas' },
  { id: 'nao_aprovada', label: 'Não aprovadas' },
] as const

export const REMARKETING_STATUSES = [
  { id: 'novo', label: 'Novo' },
  { id: 'aguardando', label: 'Aguardando' },
  { id: 'pronto_para_disparo', label: 'Pronto para disparo' },
  { id: 'em_execucao', label: 'Em execução' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'respondeu', label: 'Respondeu' },
  { id: 'convertido', label: 'Convertido' },
  { id: 'pausado', label: 'Pausado' },
] as const

export const CANONICAL_ORIGINS = [
  { code: 'leads_monitor', label: 'Leads Monitor' },
  { code: 'trafego_pago', label: 'Tráfego pago' },
  { code: 'disparo_massa', label: 'Disparo em massa' },
  { code: 'planilha_csv', label: 'Planilha CSV' },
  { code: 'landing_page', label: 'Landing page' },
  { code: 'whatsapp', label: 'WhatsApp' },
  { code: 'webhook', label: 'Webhook' },
  { code: 'importacao', label: 'Importação' },
  { code: 'manual', label: 'Manual' },
  { code: 'outros', label: 'Outros' },
] as const

const ALIAS: Record<string, ProductCode> = {
  inss: 'INSS',
  consignado: 'INSS',
  'consignado inss': 'INSS',
  'credito consignado': 'INSS',
  'crédito consignado': 'INSS',
  clt: 'CLT',
  'credito clt': 'CLT',
  'crédito clt': 'CLT',
  fgts: 'FGTS',
  'saque fgts': 'FGTS',
  'credito pessoal': 'CREDITO_PESSOAL',
  'crédito pessoal': 'CREDITO_PESSOAL',
  pessoal: 'CREDITO_PESSOAL',
  energia: 'ENERGIA',
  'conta de energia': 'ENERGIA',
  'credito na conta de energia': 'ENERGIA',
  'crédito na conta de energia': 'ENERGIA',
  'saque aniversario': 'SAQUE_ANIVERSARIO',
  'saque aniversário': 'SAQUE_ANIVERSARIO',
  'gov dos estados': 'GOV_ESTADOS',
  governo: 'GOV_ESTADOS',
  'servidor estadual': 'ESTADUAL',
  estadual: 'ESTADUAL',
  'servidor municipal': 'MUNICIPAL',
  municipal: 'MUNICIPAL',
  'refin carro': 'REFIN_CARRO',
  'refin de carro': 'REFIN_CARRO',
  refin_carro: 'REFIN_CARRO',
  casa: 'CASA',
  'refin casa': 'CASA',
  'refin de casa': 'CASA',
  solar: 'SOLAR',
  'placa solar': 'SOLAR',
}

function norm(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function findProduct(value?: string): CatalogProduct | undefined {
  const raw = String(value || '').trim()
  if (!raw) return undefined
  const byCode = PRODUCT_CATALOG.find((p) => p.code === raw || p.code === raw.toUpperCase())
  if (byCode) return byCode
  const byLabel = PRODUCT_CATALOG.find((p) => norm(p.label) === norm(raw))
  if (byLabel) return byLabel
  const alias = ALIAS[norm(raw)]
  return alias ? PRODUCT_CATALOG.find((p) => p.code === alias) : undefined
}

export function productCatalogLabel(value?: string): string {
  return findProduct(value)?.label || ''
}

export function operationsFor(code?: string): CatalogOperation[] {
  return findProduct(code)?.operations || []
}

export function operationLabel(code?: string): string {
  const raw = String(code || '').trim()
  if (!raw) return ''
  for (const p of PRODUCT_CATALOG) {
    const hit = p.operations.find((o) => o.code === raw || norm(o.label) === norm(raw) || norm(o.code) === norm(raw))
    if (hit) return hit.label
  }
  const legacy: Record<string, string> = {
    portabilidade: 'Portabilidade',
    refinanciamento: 'Refinanciamento',
    'margem nova': 'Nova Margem',
    'nova margem': 'Nova Margem',
    'reducao de parcela': 'Redução de Parcela',
    'redução de parcela': 'Redução de Parcela',
    'saque de cartao': 'Cartão RMC',
    cartao: 'Cartão RMC',
    'cartao rmc': 'Cartão RMC',
    'cartao rcc': 'Cartão RCC',
    'saque fgts': 'Saque FGTS',
  }
  return legacy[norm(raw)] || raw
}

export function digitacaoStatusId(value?: string): (typeof DIGITACAO_STATUSES)[number]['id'] | '' {
  const s = norm(value)
  if (!s) return ''
  if (['aprovado', 'aprovada', 'paga', 'pago'].includes(s)) return 'aprovado'
  if (['nao aprovado', 'nao aprovada', 'reprovado', 'reprovada', 'recusado', 'recusada'].includes(s)) return 'nao_aprovado'
  if (['em analise', 'analise', 'pendencia', 'pendente'].includes(s)) return 'em_analise'
  if (['formalizado', 'formalizada'].includes(s)) return 'formalizado'
  if (['nao formalizado', 'nao formalizada'].includes(s)) return 'nao_formalizado'
  if (['averbado', 'averbada'].includes(s)) return 'averbado'
  if (['nao averbado', 'nao averbada'].includes(s)) return 'nao_averbado'
  if (['em andamento', 'em digitacao', 'enviada', 'enviado', 'nova', 'novo', 'rascunho'].includes(s)) return 'em_andamento'
  return ''
}

export function digitacaoStatusLabel(value?: string): string {
  const id = digitacaoStatusId(value)
  return DIGITACAO_STATUSES.find((s) => s.id === id)?.label || ''
}

export function kanbanColumnFor(status?: string): (typeof KANBAN_COLUMNS)[number]['id'] {
  const id = digitacaoStatusId(status)
  const s = norm(status)
  if (id === 'em_analise' || s === 'pendencia' || s === 'pendente') return 'em_analise'
  if (s.includes('document')) return 'documentacao_pendente'
  if (id === 'aprovado') return 'aprovada'
  if (id === 'formalizado' || s === 'formalizacao') return 'formalizacao'
  if (id === 'averbado') return 'averbada'
  if (s === 'finalizado' || s === 'finalizada' || s === 'paga' || s === 'pago' || s === 'contrato') return 'finalizada'
  if (id === 'nao_aprovado') return 'nao_aprovada'
  if (id === 'nao_formalizado' || id === 'nao_averbado' || id === 'em_andamento') return 'em_analise'
  return 'nova'
}

export function canonicalOrigin(value?: string): (typeof CANONICAL_ORIGINS)[number]['code'] {
  const v = norm(value)
  if (!v) return 'manual'
  if (v.includes('monitor')) return 'leads_monitor'
  if (v.includes('disparo') || v === 'campaign' || v.includes('massa')) return 'disparo_massa'
  if (v.includes('planilha') || v === 'csv' || v.includes('excel')) return 'planilha_csv'
  if (v.includes('import')) return 'importacao'
  if (v.includes('landing') || v.includes('form')) return 'landing_page'
  if (v.includes('whatsapp') || v.includes('wpp')) return 'whatsapp'
  if (v.includes('webhook') || v === 'api') return 'webhook'
  if (
    v.includes('trafego') ||
    v.includes('facebook') ||
    v.includes('instagram') ||
    v.includes('meta') ||
    v.includes('google') ||
    v.includes('ads')
  ) {
    return 'trafego_pago'
  }
  if (v === 'manual' || v.includes('indicacao') || v.includes('organico') || v === 'site') return v === 'manual' || v.includes('indicacao') ? 'manual' : 'outros'
  if (CANONICAL_ORIGINS.some((o) => o.code === v.replace(/\s/g, '_'))) {
    return v.replace(/\s/g, '_') as (typeof CANONICAL_ORIGINS)[number]['code']
  }
  return 'outros'
}

export function canonicalOriginLabel(value?: string): string {
  const code = canonicalOrigin(value)
  return CANONICAL_ORIGINS.find((o) => o.code === code)?.label || 'Outros'
}
