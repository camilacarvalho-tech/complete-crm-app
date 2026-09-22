/**
 * Catálogo central de produtos do Leads Monitor (Recomece Cred).
 * Estratégias e fontes honestas: COMPANY_SOURCE já existe; PERSON_SOURCE só CSV/webhook
 * quando habilitados; Meta Lead Ads / API licenciada NÃO estão configuradas.
 */
import type { OperacaoMonitor } from '../types'

export type FonteKind = 'COMPANY_SOURCE' | 'PERSON_SOURCE' | 'INTELLIGENCE_SOURCE'

export type PersonSourceStatus = 'ready' | 'optional' | 'not_configured'

export interface ProdutoMonitorDef {
  id: string
  name: string
  operation: OperacaoMonitor
  category: string
  description: string
  searchStrategy: string
  allowedSources: FonteKind[]
  /** Conectores UI já existentes que fazem sentido nesta operação. */
  connectorHints: string[]
  personSourceStatus: PersonSourceStatus
  personSourceNote: string
  requiredFields: string[]
  optionalFields: string[]
  contextKey?: 'benefitContext' | 'employmentContext' | 'propertyContext' | 'vehicleContext' | 'realEstateContext'
  templateCategory?: string
  active: boolean
  suboperacoes?: Array<{ id: string; label: string }>
}

export const PRODUTOS_MONITOR: ProdutoMonitorDef[] = [
  {
    id: 'INSS',
    name: 'INSS',
    operation: 'INSS',
    category: 'consignado',
    description: 'Aposentados, pensionistas e consignado INSS. Open Data do INSS é inteligência, não lista de WhatsApp.',
    searchStrategy: 'INTELLIGENCE_SOURCE (INSS/IBGE) + PERSON_SOURCE autorizada (CSV/webhook/Meta Lead Ads se configurados).',
    allowedSources: ['INTELLIGENCE_SOURCE', 'PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'optional',
    personSourceNote: 'Contato pessoal só entra via CSV autorizado, webhook, Meta Lead Ads ou API licenciada. Nenhuma dessas APIs de pessoa está ligada neste front, salvo CSV/webhook da empresa.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'cpf', 'city', 'state', 'benefitContext'],
    contextKey: 'benefitContext',
    templateCategory: 'INSS',
    active: true,
    suboperacoes: [
      { id: 'Aposentado', label: 'Aposentado' },
      { id: 'Pensionista', label: 'Pensionista' },
      { id: 'Beneficio_recem_concedido', label: 'Benefício recém-concedido' },
      { id: 'Beneficio_mantido', label: 'Benefício mantido' },
      { id: 'Portabilidade', label: 'Portabilidade de consignado' },
      { id: 'Reducao_parcela', label: 'Redução de parcela' },
      { id: 'Nova_margem', label: 'Nova margem' },
      { id: 'Refinanciamento', label: 'Refinanciamento consignado' },
      { id: 'Credito_consignado', label: 'Crédito consignado INSS' },
      { id: 'LOAS_BPC', label: 'LOAS/BPC quando aplicável' },
    ],
  },
  {
    id: 'CREDITO_CLT',
    name: 'Crédito CLT',
    operation: 'CREDITO_CLT',
    category: 'credito',
    description: 'Empresas (OSM/Places) + pessoas só com fonte autorizada de funcionários. Telefone da empresa ≠ telefone do funcionário.',
    searchStrategy: 'COMPANY_SOURCE (OpenStreetMap / Google Places) + PERSON_SOURCE autorizada.',
    allowedSources: ['COMPANY_SOURCE', 'PERSON_SOURCE'],
    connectorHints: ['openstreetmap', 'google_places', 'csv', 'webhook'],
    personSourceStatus: 'optional',
    personSourceNote: 'Pesquisa de pessoas no Monitor usa site público/QSA; não inventa WhatsApp de funcionário. CSV autorizado ou API licenciada são necessários para a base de pessoas.',
    requiredFields: ['name', 'companyName'],
    optionalFields: ['phone', 'whatsapp', 'role', 'city', 'state', 'employmentContext'],
    contextKey: 'employmentContext',
    templateCategory: 'CREDITO_CLT',
    active: true,
  },
  {
    id: 'CREDITO_PESSOAL',
    name: 'Crédito pessoal',
    operation: 'CREDITO_PESSOAL',
    category: 'credito',
    description: 'Pessoa física via captação própria autorizada.',
    searchStrategy: 'PERSON_SOURCE autorizada / captação própria. Sem scraping.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada (Meta Lead Ads / API licenciada). Use CSV autorizado ou webhook.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'cpf', 'address', 'cep', 'city', 'state'],
    templateCategory: 'CREDITO_PESSOAL',
    active: true,
  },
  {
    id: 'CREDITO_CONTA_ENERGIA',
    name: 'Crédito na conta de energia',
    operation: 'CREDITO_CONTA_ENERGIA',
    category: 'credito',
    description: 'Crefaz / crédito na conta de energia quando a operação e a fonte estiverem disponíveis.',
    searchStrategy: 'PERSON_SOURCE autorizada / captação própria.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'cpf', 'city', 'state', 'address', 'cep'],
    templateCategory: 'CREDITO_CONTA_ENERGIA',
    active: true,
  },
  {
    id: 'SAQUE_FGTS',
    name: 'Saque FGTS',
    operation: 'SAQUE_FGTS',
    category: 'credito',
    description: 'Antecipação Saque-Aniversário. Não afirma elegibilidade sem regra/fonte.',
    searchStrategy: 'PERSON_SOURCE autorizada / captação própria.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada. Elegibilidade FGTS não é inferida.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'cpf', 'city', 'state'],
    templateCategory: 'SAQUE_FGTS',
    active: true,
    suboperacoes: [
      { id: 'Antecipacao_saque_aniversario', label: 'Antecipação Saque-Aniversário FGTS' },
      { id: 'Credito_garantia_fgts', label: 'Crédito com garantia de FGTS' },
    ],
  },
  {
    id: 'REFIN_CASA',
    name: 'Refinanciamento de casa',
    operation: 'REFIN_CASA',
    category: 'refinanciamento',
    description: 'Imóvel somente com fonte legítima. Não inventa valor nem situação do financiamento.',
    searchStrategy: 'PERSON_SOURCE autorizada / captação própria.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'email', 'cpf', 'city', 'state', 'address'],
    contextKey: 'propertyContext',
    templateCategory: 'REFIN_CASA',
    active: true,
  },
  {
    id: 'REFIN_CARRO',
    name: 'Refinanciamento de carro',
    operation: 'REFIN_CARRO',
    category: 'refinanciamento',
    description: 'Veículo somente com fonte legítima. Não inventa marca/modelo/ano.',
    searchStrategy: 'PERSON_SOURCE autorizada / captação própria.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'email', 'cpf', 'city', 'state'],
    contextKey: 'vehicleContext',
    templateCategory: 'REFIN_CARRO',
    active: true,
  },
  {
    id: 'CREDITO_IMOBILIARIO',
    name: 'Crédito imobiliário',
    operation: 'CREDITO_IMOBILIARIO',
    category: 'credito',
    description: 'Interesse em financiamento/aquisição informado pela fonte, nunca inventado.',
    searchStrategy: 'PERSON_SOURCE autorizada / captação própria.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'email', 'city', 'state', 'cpf'],
    contextKey: 'realEstateContext',
    templateCategory: 'CREDITO_IMOBILIARIO',
    active: true,
  },
  {
    id: 'PORTABILIDADE_CONSIGNADO',
    name: 'Portabilidade de consignado',
    operation: 'PORTABILIDADE_CONSIGNADO',
    category: 'portabilidade',
    description: 'Não inventa saldo, parcela, margem, banco ou contrato.',
    searchStrategy: 'PERSON_SOURCE autorizada / captação própria.',
    allowedSources: ['PERSON_SOURCE', 'INTELLIGENCE_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'cpf', 'city', 'state'],
    templateCategory: 'PORTABILIDADE_CONSIGNADO',
    active: true,
  },
  {
    id: 'SERVIDOR_SIAPE',
    name: 'Servidor SIAPE',
    operation: 'SERVIDOR_SIAPE',
    category: 'consignado',
    description: 'Servidores federais somente com fonte autorizada.',
    searchStrategy: 'PERSON_SOURCE autorizada + segmentação legítima.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'cpf', 'city', 'state'],
    templateCategory: 'SERVIDOR_SIAPE',
    active: true,
    suboperacoes: [
      { id: 'Consignado', label: 'Crédito consignado' },
      { id: 'Portabilidade', label: 'Portabilidade' },
      { id: 'Refinanciamento', label: 'Refinanciamento' },
      { id: 'Reducao_parcela', label: 'Redução de parcela' },
      { id: 'Nova_margem', label: 'Nova margem' },
    ],
  },
  {
    id: 'SERVIDOR_PREFEITURA',
    name: 'Servidor prefeitura',
    operation: 'SERVIDOR_PREFEITURA',
    category: 'consignado',
    description: 'Servidores municipais somente com fonte autorizada.',
    searchStrategy: 'PERSON_SOURCE autorizada + segmentação legítima.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'cpf', 'city', 'state'],
    templateCategory: 'SERVIDOR_PREFEITURA',
    active: true,
    suboperacoes: [
      { id: 'Consignado', label: 'Crédito consignado' },
      { id: 'Portabilidade', label: 'Portabilidade' },
      { id: 'Refinanciamento', label: 'Refinanciamento' },
      { id: 'Nova_margem', label: 'Nova margem' },
    ],
  },
  {
    id: 'LIMPA_NOME',
    name: 'Limpa nome',
    operation: 'LIMPA_NOME',
    category: 'regularizacao',
    description: 'Não infere dívidas/restrições sem fonte legítima.',
    searchStrategy: 'PERSON_SOURCE autorizada / captação própria.',
    allowedSources: ['PERSON_SOURCE'],
    connectorHints: ['csv', 'webhook'],
    personSourceStatus: 'not_configured',
    personSourceNote: 'Fonte de pessoas não configurada.',
    requiredFields: ['name'],
    optionalFields: ['phone', 'whatsapp', 'cpf', 'city', 'state'],
    templateCategory: 'LIMPA_NOME',
    active: true,
  },
]

export const LIMITES_BUSCA_PRESETS = [100, 500, 1000, 3000, 5000] as const

export function produtoPorOperacao(operacao?: string | null): ProdutoMonitorDef | undefined {
  const op = String(operacao || '').trim()
  if (!op) return undefined
  return (
    PRODUTOS_MONITOR.find((p) => p.operation === op || p.id === op) ||
    (op === 'FGTS' ? PRODUTOS_MONITOR.find((p) => p.id === 'SAQUE_FGTS') : undefined) ||
    (op === 'EMPRESTIMOS' ? PRODUTOS_MONITOR.find((p) => p.id === 'CREDITO_PESSOAL') : undefined) ||
    (op === 'SERVIDOR' ? PRODUTOS_MONITOR.find((p) => p.id === 'SERVIDOR_SIAPE') : undefined)
  )
}

export function produtoLabel(operacao?: string | null): string {
  return produtoPorOperacao(operacao)?.name || String(operacao || '').trim() || '—'
}

export function qualificationFromScore(score: number): 'HOT' | 'QUALIFIED' | 'NORMAL' | 'UNQUALIFIED' {
  if (score >= 80) return 'HOT'
  if (score >= 65) return 'QUALIFIED'
  if (score >= 45) return 'NORMAL'
  return 'UNQUALIFIED'
}
