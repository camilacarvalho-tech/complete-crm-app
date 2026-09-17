import type { FiltrosPesquisa, OperacaoMonitor } from '../types'

export type SegmentoMonitorId =
  | 'clinicas'
  | 'supermercados'
  | 'industrias'
  | 'academias'
  | 'pet_shops'
  | 'credito'
  | 'outros'

export interface OpcaoSegmento {
  id: string
  label: string
  keywords?: string[]
  operacao?: OperacaoMonitor
  segmentoPipeline?: string
  funcoes?: OpcaoSegmento[]
}

export interface SegmentoMonitorDef {
  id: SegmentoMonitorId
  label: string
  emoji: string
  descricao: string
  accent: string
  segmentoPipeline: string
  keywords: string[]
  pergunta?: string
  opcoes?: OpcaoSegmento[]
  funcoes?: OpcaoSegmento[]
  livre?: boolean
}

/** Catálogo editável da CODE — não incluir mercados nem empresa_b2b na UI. */
export const SEGMENTOS_MONITOR: SegmentoMonitorDef[] = [
  {
    id: 'clinicas',
    label: 'Clínicas',
    emoji: '🏥',
    descricao: 'Saúde e clínicas',
    accent: '#38bdf8',
    segmentoPipeline: 'clinicas',
    keywords: ['clínica', 'consultório', 'saúde'],
    pergunta: 'Qual área deseja pesquisar?',
    opcoes: [
      { id: 'odontologia', label: 'Odontologia', keywords: ['dentista', 'odontologia', 'clínica odontológica', 'consultório odontológico'], funcoes: [
        { id: 'Dentista', label: 'Dentista' },
        { id: 'Ortodontista', label: 'Ortodontista' },
        { id: 'Implantodontista', label: 'Implantodontista' },
        { id: 'Recepção', label: 'Recepção' },
        { id: 'Administrativo', label: 'Administrativo' },
        { id: 'Gerência', label: 'Gerência' },
        { id: 'Outro', label: 'Outro' },
      ] },
      { id: 'medicina', label: 'Medicina', keywords: ['clínica médica', 'consultório médico'] },
      { id: 'fisioterapia', label: 'Fisioterapia', keywords: ['fisioterapia'] },
      { id: 'psicologia', label: 'Psicologia', keywords: ['psicologia', 'clínica psicológica'] },
      { id: 'nutricao', label: 'Nutrição', keywords: ['nutrição', 'nutricionista'] },
      { id: 'dermatologia', label: 'Dermatologia', keywords: ['dermatologia'] },
      { id: 'cardiologia', label: 'Cardiologia', keywords: ['cardiologia'] },
      { id: 'pediatria', label: 'Pediatria', keywords: ['pediatria'] },
      { id: 'laboratorio', label: 'Laboratório', keywords: ['laboratório', 'análises clínicas'] },
      { id: 'clinica_medica', label: 'Clínica médica', keywords: ['clínica médica'] },
      { id: 'clinica_odonto', label: 'Clínica odontológica', keywords: ['clínica odontológica'] },
      { id: 'consultorio', label: 'Consultório', keywords: ['consultório'] },
      { id: 'outra_clinica', label: 'Outra', keywords: ['clínica'] },
    ],
    funcoes: [
      { id: 'Recepção', label: 'Recepção' },
      { id: 'Administrativo', label: 'Administrativo' },
      { id: 'Gerência', label: 'Gerência' },
      { id: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'supermercados',
    label: 'Supermercados',
    emoji: '🛒',
    descricao: 'Varejo alimentício',
    accent: '#fbbf24',
    segmentoPipeline: 'supermercados',
    keywords: ['supermercado', 'mercado', 'varejo', 'atacado'],
    funcoes: [
      { id: 'Gerente', label: 'Gerente' },
      { id: 'Subgerente', label: 'Subgerente' },
      { id: 'Caixa', label: 'Caixa' },
      { id: 'Repositor', label: 'Repositor' },
      { id: 'Açougueiro', label: 'Açougueiro' },
      { id: 'Estoquista', label: 'Estoquista' },
      { id: 'Conferente', label: 'Conferente' },
      { id: 'Fiscal', label: 'Fiscal' },
      { id: 'Padaria', label: 'Padaria' },
      { id: 'Açougue', label: 'Açougue' },
      { id: 'Hortifruti', label: 'Hortifruti' },
      { id: 'Administrativo', label: 'Administrativo' },
      { id: 'Compras', label: 'Compras' },
      { id: 'RH', label: 'RH' },
      { id: 'Logística', label: 'Logística' },
      { id: 'Atendimento', label: 'Atendimento' },
      { id: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'industrias',
    label: 'Indústrias',
    emoji: '🏭',
    descricao: 'Produção e indústria',
    accent: '#94a3b8',
    segmentoPipeline: 'industrias',
    keywords: ['indústria', 'fábrica', 'produção', 'manufatura'],
    funcoes: [
      { id: 'Produção', label: 'Produção' },
      { id: 'Operador de máquina', label: 'Operador de máquina' },
      { id: 'Auxiliar de produção', label: 'Auxiliar de produção' },
      { id: 'Manutenção', label: 'Manutenção' },
      { id: 'Mecânico', label: 'Mecânico' },
      { id: 'Eletricista', label: 'Eletricista' },
      { id: 'Soldador', label: 'Soldador' },
      { id: 'Almoxarifado', label: 'Almoxarifado' },
      { id: 'Estoque', label: 'Estoque' },
      { id: 'Logística', label: 'Logística' },
      { id: 'Qualidade', label: 'Qualidade' },
      { id: 'Segurança do trabalho', label: 'Segurança do trabalho' },
      { id: 'Engenharia', label: 'Engenharia' },
      { id: 'Administrativo', label: 'Administrativo' },
      { id: 'RH', label: 'RH' },
      { id: 'Compras', label: 'Compras' },
      { id: 'Gerência', label: 'Gerência' },
      { id: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'academias',
    label: 'Academias',
    emoji: '🏋️',
    descricao: 'Fitness e esporte',
    accent: '#fb7185',
    segmentoPipeline: 'academias',
    keywords: ['academia', 'fitness', 'musculação'],
    funcoes: [
      { id: 'Academia', label: 'Academia' },
      { id: 'Personal trainer', label: 'Personal trainer' },
      { id: 'Musculação', label: 'Musculação' },
      { id: 'Pilates', label: 'Pilates' },
      { id: 'Funcional', label: 'Funcional' },
      { id: 'Cross training', label: 'Cross training' },
      { id: 'Fisioterapia', label: 'Fisioterapia' },
      { id: 'Recepção', label: 'Recepção' },
      { id: 'Administrativo', label: 'Administrativo' },
      { id: 'Gerência', label: 'Gerência' },
      { id: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'pet_shops',
    label: 'Pet shops',
    emoji: '🐶',
    descricao: 'Pet e veterinária',
    accent: '#a78bfa',
    segmentoPipeline: 'pet_shops',
    keywords: ['pet shop', 'petshop', 'veterinária'],
    funcoes: [
      { id: 'Pet shop', label: 'Pet shop' },
      { id: 'Clínica veterinária', label: 'Clínica veterinária' },
      { id: 'Veterinário', label: 'Veterinário' },
      { id: 'Banho e tosa', label: 'Banho e tosa' },
      { id: 'Grooming', label: 'Grooming' },
      { id: 'Recepção', label: 'Recepção' },
      { id: 'Administrativo', label: 'Administrativo' },
      { id: 'Gerência', label: 'Gerência' },
      { id: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'credito',
    label: 'Crédito',
    emoji: '💰',
    descricao: 'Produtos financeiros',
    accent: '#f59e0b',
    segmentoPipeline: 'emprestimo',
    keywords: ['crédito', 'empréstimo', 'consignado'],
    pergunta: 'Qual produto deseja prospectar?',
    opcoes: [
      { id: 'INSS', label: 'INSS', operacao: 'INSS', segmentoPipeline: 'inss', keywords: ['INSS', 'aposentadoria'], funcoes: [
        { id: 'Aposentado', label: 'Aposentado' },
        { id: 'Pensionista', label: 'Pensionista' },
        { id: 'Beneficiário', label: 'Beneficiário' },
        { id: 'Portabilidade', label: 'Portabilidade' },
        { id: 'Redução de parcela', label: 'Redução de parcela' },
        { id: 'Nova margem', label: 'Nova margem' },
        { id: 'Refinanciamento INSS', label: 'Refinanciamento' },
        { id: 'Crédito INSS', label: 'Crédito INSS' },
        { id: 'Outra operação INSS', label: 'Outra operação' },
      ] },
      { id: 'CREDITO_CLT', label: 'Crédito CLT', operacao: 'CREDITO_CLT', segmentoPipeline: 'credito_clt', keywords: ['crédito CLT', 'trabalhador CLT'], funcoes: [
        { id: 'Trabalhador CLT', label: 'Trabalhador CLT' },
        { id: 'Empresa empregadora', label: 'Empresa empregadora' },
        { id: 'Prospecção empresarial', label: 'Prospecção empresarial' },
        { id: 'Outro CLT', label: 'Outro' },
      ] },
      { id: 'EMPRESTIMOS', label: 'Crédito pessoal', operacao: 'EMPRESTIMOS', segmentoPipeline: 'emprestimo', keywords: ['crédito pessoal', 'empréstimo'] },
      { id: 'FGTS', label: 'Saque FGTS', operacao: 'FGTS', segmentoPipeline: 'fgts', keywords: ['FGTS', 'saque FGTS'] },
      { id: 'REFIN', label: 'Refinanciamento', operacao: 'EMPRESTIMOS', segmentoPipeline: 'consignado', keywords: ['refinanciamento'] },
      { id: 'CASA', label: 'Crédito imobiliário / Casa', operacao: 'EMPRESTIMOS', segmentoPipeline: 'emprestimo', keywords: ['crédito imobiliário', 'casa'] },
      { id: 'CARRO', label: 'Crédito para veículo / Carro', operacao: 'EMPRESTIMOS', segmentoPipeline: 'emprestimo', keywords: ['veículo', 'carro', 'financiamento'] },
      { id: 'SOLAR', label: 'Energia solar', operacao: 'OUTROS', segmentoPipeline: 'outros', keywords: ['energia solar'] },
      { id: 'SERVIDOR', label: 'Servidor', operacao: 'SERVIDOR', segmentoPipeline: 'consignado', keywords: ['servidor público'], funcoes: [
        { id: 'Federal', label: 'Federal' },
        { id: 'Estadual', label: 'Estadual' },
        { id: 'Municipal', label: 'Municipal' },
        { id: 'SIAPE', label: 'SIAPE' },
        { id: 'Prefeitura', label: 'Prefeitura' },
        { id: 'Outro servidor', label: 'Outro' },
      ] },
      { id: 'OUTROS', label: 'Outros', operacao: 'OUTROS', segmentoPipeline: 'outros', keywords: ['crédito'] },
    ],
  },
  {
    id: 'outros',
    label: 'Outros',
    emoji: '✏️',
    descricao: 'Personalizado',
    accent: '#e2e8f0',
    segmentoPipeline: 'outros',
    keywords: [],
    livre: true,
  },
]

const CREDIT_PIPELINE = new Set(['inss', 'credito_clt', 'emprestimo', 'consignado', 'fgts', 'cartao', 'corban'])

export function cardIdFromFiltros(filtros: Pick<FiltrosPesquisa, 'segmento' | 'operacao'>): SegmentoMonitorId | '' {
  const s = (filtros.segmento || '').toLowerCase()
  if (s === 'mercados') return 'supermercados'
  if (s === 'empresa_b2b') return 'outros'
  if (SEGMENTOS_MONITOR.some((d) => d.id === s || d.segmentoPipeline === s)) {
    const direct = SEGMENTOS_MONITOR.find((d) => d.id === s)
    if (direct) return direct.id
  }
  if (CREDIT_PIPELINE.has(s) || filtros.operacao) return 'credito'
  return (SEGMENTOS_MONITOR.find((d) => d.segmentoPipeline === s)?.id || '') as SegmentoMonitorId | ''
}

export function defDoCard(id: SegmentoMonitorId | ''): SegmentoMonitorDef | undefined {
  return SEGMENTOS_MONITOR.find((d) => d.id === id)
}

export function funcoesDoContexto(def: SegmentoMonitorDef | undefined, contextos: string[]): OpcaoSegmento[] {
  if (!def) return []
  const fromOpcoes = (def.opcoes || [])
    .filter((o) => contextos.includes(o.id))
    .flatMap((o) => o.funcoes || [])
  if (fromOpcoes.length) return fromOpcoes
  return def.funcoes || []
}

export function keywordsSugeridas(def: SegmentoMonitorDef | undefined, contextos: string[]): string {
  if (!def) return ''
  const extra = (def.opcoes || [])
    .filter((o) => contextos.includes(o.id))
    .flatMap((o) => o.keywords || [o.label])
  return Array.from(new Set([...def.keywords, ...extra])).filter(Boolean).join(' ')
}

export function aplicarCardSegmento(filtros: FiltrosPesquisa, cardId: SegmentoMonitorId): FiltrosPesquisa {
  const def = defDoCard(cardId)
  if (!def) return filtros
  return {
    ...filtros,
    segmento: def.segmentoPipeline,
    operacao: '',
    contextosSegmento: [],
    cargos: [],
    produtos: [],
    palavraChave: def.keywords.join(' '),
    segmentoCustomNome: cardId === 'outros' ? filtros.segmentoCustomNome : '',
    segmentoCustomCategoria: cardId === 'outros' ? filtros.segmentoCustomCategoria : '',
    tipoBeneficiario: 'todos',
  }
}

export function aplicarProdutoCredito(filtros: FiltrosPesquisa, produtoId: string, checked: boolean): FiltrosPesquisa {
  const def = defDoCard('credito')
  const opt = def?.opcoes?.find((o) => o.id === produtoId)
  const produtos = filtros.produtos || []
  const nextProdutos = checked ? Array.from(new Set([...produtos, produtoId])) : produtos.filter((p) => p !== produtoId)
  const principal = def?.opcoes?.find((o) => nextProdutos.includes(o.id))
  const contextos = checked ? filtros.contextosSegmento || [] : (filtros.contextosSegmento || []).filter((c) => !(opt?.funcoes || []).some((f) => f.id === c))
  return {
    ...filtros,
    produtos: nextProdutos,
    operacao: (principal?.operacao || '') as OperacaoMonitor | '',
    segmento: principal?.segmentoPipeline || def?.segmentoPipeline || 'emprestimo',
    contextosSegmento: contextos,
    palavraChave: keywordsSugeridas(def, nextProdutos),
  }
}
