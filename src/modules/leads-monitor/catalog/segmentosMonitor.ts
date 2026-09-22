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
  /** Opção histórica — não aparece no card, mas campanhas antigas continuam válidas. */
  hidden?: boolean
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
  /** Cards principais da busca manual: clínicas, crédito, outros. */
  hiddenFromMain?: boolean
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
    pergunta: 'Qual tipo de clínica deseja pesquisar?',
    opcoes: [
      { id: 'clinica_medica', label: 'Clínica médica', keywords: ['clínica médica', 'consultório médico', 'medicina'] },
      { id: 'clinica_odonto', label: 'Clínica odontológica', keywords: ['clínica odontológica', 'dentista', 'odontologia', 'consultório odontológico'] },
      { id: 'clinica_estetica', label: 'Clínica de estética', keywords: ['clínica de estética', 'estética', 'harmonização'] },
      { id: 'clinica_saude', label: 'Clínica de saúde', keywords: ['clínica de saúde', 'saúde'] },
      { id: 'clinica_especializada', label: 'Clínica especializada', keywords: ['clínica especializada', 'especialidade'] },
      { id: 'clinica_veterinaria', label: 'Clínica veterinária', keywords: ['clínica veterinária', 'veterinária', 'veterinario'] },
      { id: 'PET_SHOP', label: 'Pet Shop', keywords: ['pet shop', 'petshop', 'banho e tosa'] },
      { id: 'outra_clinica', label: 'Outro', keywords: ['clínica'] },
      { id: 'odontologia', label: 'Odontologia', keywords: ['dentista', 'odontologia'], hidden: true, funcoes: [
        { id: 'Dentista', label: 'Dentista' },
        { id: 'Ortodontista', label: 'Ortodontista' },
        { id: 'Implantodontista', label: 'Implantodontista' },
        { id: 'Recepção', label: 'Recepção' },
        { id: 'Administrativo', label: 'Administrativo' },
        { id: 'Gerência', label: 'Gerência' },
        { id: 'Outro', label: 'Outro' },
      ] },
      { id: 'medicina', label: 'Medicina', keywords: ['clínica médica'], hidden: true },
      { id: 'fisioterapia', label: 'Fisioterapia', keywords: ['fisioterapia'], hidden: true },
      { id: 'psicologia', label: 'Psicologia', keywords: ['psicologia'], hidden: true },
      { id: 'nutricao', label: 'Nutrição', keywords: ['nutrição'], hidden: true },
      { id: 'dermatologia', label: 'Dermatologia', keywords: ['dermatologia'], hidden: true },
      { id: 'cardiologia', label: 'Cardiologia', keywords: ['cardiologia'], hidden: true },
      { id: 'pediatria', label: 'Pediatria', keywords: ['pediatria'], hidden: true },
      { id: 'laboratorio', label: 'Laboratório', keywords: ['laboratório'], hidden: true },
      { id: 'consultorio', label: 'Consultório', keywords: ['consultório'], hidden: true },
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
    hiddenFromMain: true,
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
    hiddenFromMain: true,
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
    hiddenFromMain: true,
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
    hiddenFromMain: true,
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
        { id: 'Beneficio_recem_concedido', label: 'Benefício recém-concedido' },
        { id: 'Beneficio_mantido', label: 'Benefício mantido' },
        { id: 'Portabilidade', label: 'Portabilidade de consignado' },
        { id: 'Redução de parcela', label: 'Redução de parcela' },
        { id: 'Nova margem', label: 'Nova margem' },
        { id: 'Refinanciamento INSS', label: 'Refinanciamento consignado' },
        { id: 'Crédito INSS', label: 'Crédito consignado INSS' },
        { id: 'LOAS_BPC', label: 'LOAS/BPC' },
      ] },
      { id: 'CREDITO_CLT', label: 'Crédito CLT', operacao: 'CREDITO_CLT', segmentoPipeline: 'credito_clt', keywords: ['crédito CLT', 'trabalhador CLT'], funcoes: [
        { id: 'Trabalhador CLT', label: 'Trabalhador CLT' },
        { id: 'Empresa empregadora', label: 'Empresa empregadora' },
        { id: 'Prospecção empresarial', label: 'Prospecção empresarial' },
        { id: 'Outro CLT', label: 'Outro' },
      ] },
      { id: 'EMPRESTIMOS', label: 'Crédito pessoal', operacao: 'CREDITO_PESSOAL', segmentoPipeline: 'emprestimo', keywords: ['crédito pessoal', 'empréstimo'] },
      { id: 'CREDITO_PESSOAL', label: 'Crédito pessoal', operacao: 'CREDITO_PESSOAL', segmentoPipeline: 'emprestimo', keywords: ['crédito pessoal'] },
      { id: 'CREDITO_CONTA_ENERGIA', label: 'Crédito na conta de energia', operacao: 'CREDITO_CONTA_ENERGIA', segmentoPipeline: 'emprestimo', keywords: ['conta de energia', 'Crefaz'] },
      { id: 'FGTS', label: 'Saque FGTS', operacao: 'SAQUE_FGTS', segmentoPipeline: 'fgts', keywords: ['FGTS', 'saque FGTS'] },
      { id: 'SAQUE_FGTS', label: 'Saque FGTS', operacao: 'SAQUE_FGTS', segmentoPipeline: 'fgts', keywords: ['FGTS'] },
      { id: 'REFIN_CASA', label: 'Refinanciamento de casa', operacao: 'REFIN_CASA', segmentoPipeline: 'emprestimo', keywords: ['refinanciamento imóvel', 'casa'] },
      { id: 'REFIN_CARRO', label: 'Refinanciamento de carro', operacao: 'REFIN_CARRO', segmentoPipeline: 'emprestimo', keywords: ['refinanciamento veículo', 'carro'] },
      { id: 'CREDITO_IMOBILIARIO', label: 'Crédito imobiliário', operacao: 'CREDITO_IMOBILIARIO', segmentoPipeline: 'emprestimo', keywords: ['crédito imobiliário'] },
      { id: 'SERVIDOR_SIAPE', label: 'Servidor SIAPE', operacao: 'SERVIDOR_SIAPE', segmentoPipeline: 'consignado', keywords: ['SIAPE', 'servidor federal'] },
      { id: 'SERVIDOR_PREFEITURA', label: 'Servidor prefeitura', operacao: 'SERVIDOR_PREFEITURA', segmentoPipeline: 'consignado', keywords: ['servidor municipal', 'prefeitura'] },
      { id: 'LIMPA_NOME', label: 'Limpa nome', operacao: 'LIMPA_NOME', segmentoPipeline: 'outros', keywords: ['limpa nome', 'regularização'] },
      { id: 'REFIN', label: 'Refinanciamento', operacao: 'EMPRESTIMOS', segmentoPipeline: 'consignado', keywords: ['refinanciamento'] },
      { id: 'CASA', label: 'Crédito imobiliário / Casa', operacao: 'CREDITO_IMOBILIARIO', segmentoPipeline: 'emprestimo', keywords: ['crédito imobiliário', 'casa'] },
      { id: 'CARRO', label: 'Crédito para veículo / Carro', operacao: 'REFIN_CARRO', segmentoPipeline: 'emprestimo', keywords: ['veículo', 'carro', 'financiamento'] },
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

/** Agrupamento visual dos produtos de crédito. Não cria IDs novos. */
export const GRUPOS_PRODUTO_CREDITO: Array<{ label: string; opcaoIds: string[] }> = [
  { label: 'INSS', opcaoIds: ['INSS'] },
  { label: 'CRÉDITO', opcaoIds: ['CREDITO_CLT', 'EMPRESTIMOS', 'CREDITO_PESSOAL', 'CREDITO_CONTA_ENERGIA', 'SOLAR', 'OUTROS'] },
  { label: 'FGTS', opcaoIds: ['FGTS', 'SAQUE_FGTS'] },
  { label: 'REFINANCIAMENTO', opcaoIds: ['REFIN_CASA', 'REFIN_CARRO', 'REFIN', 'CARRO'] },
  { label: 'IMOBILIÁRIO', opcaoIds: ['CREDITO_IMOBILIARIO', 'CASA'] },
  { label: 'SERVIDORES', opcaoIds: ['SERVIDOR_SIAPE', 'SERVIDOR_PREFEITURA', 'SERVIDOR'] },
  { label: 'LIMPA NOME', opcaoIds: ['LIMPA_NOME'] },
]

const CREDIT_PIPELINE = new Set([
  'inss',
  'credito_clt',
  'emprestimo',
  'consignado',
  'fgts',
  'cartao',
  'corban',
  'refinanciamento',
  'imobiliario',
])

export const SEGMENTOS_PRINCIPAIS: SegmentoMonitorId[] = ['clinicas', 'credito', 'outros']

export function segmentosDaBuscaManual(): SegmentoMonitorDef[] {
  return SEGMENTOS_MONITOR.filter((s) => !s.hiddenFromMain)
}

export function cardIdFromFiltros(filtros: Pick<FiltrosPesquisa, 'segmento' | 'operacao'>): SegmentoMonitorId | '' {
  const s = (filtros.segmento || '').toLowerCase()
  if (s === 'pet_shops' || s === 'clinicas') return 'clinicas'
  if (s === 'mercados') return 'supermercados'
  if (s === 'empresa_b2b') return 'outros'
  if (SEGMENTOS_MONITOR.some((d) => d.id === s || d.segmentoPipeline === s)) {
    const direct = SEGMENTOS_MONITOR.find((d) => d.id === s)
    if (direct?.hiddenFromMain && direct.id === 'pet_shops') return 'clinicas'
    if (direct && !direct.hiddenFromMain) return direct.id
    if (direct?.id === 'supermercados' || direct?.id === 'industrias' || direct?.id === 'academias') return direct.id
  }
  if (s === 'consignado' || filtros.operacao === 'INSS' || filtros.operacao === 'PORTABILIDADE_CONSIGNADO') return 'credito'
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
    tipoBusca: cardId === 'clinicas' ? 'empresa' : filtros.tipoBusca || 'empresa',
    campaignContext: cardId === 'clinicas' ? '' : filtros.campaignContext,
    subsegment: cardId === 'clinicas' ? '' : filtros.subsegment,
  }
}

export function aplicarProdutoCredito(filtros: FiltrosPesquisa, produtoId: string, checked: boolean): FiltrosPesquisa {
  const def = defDoCard('credito')
  const opt = def?.opcoes?.find((o) => o.id === produtoId)
  const produtos = filtros.produtos || []
  let nextProdutos = checked ? Array.from(new Set([...produtos, produtoId])) : produtos.filter((p) => p !== produtoId)
  if (!checked && produtoId === 'INSS') {
    nextProdutos = nextProdutos.filter((p) => p !== 'PORTABILIDADE_CONSIGNADO')
  }
  const principal = def?.opcoes?.find((o) => nextProdutos.includes(o.id))
  const contextos = checked ? filtros.contextosSegmento || [] : (filtros.contextosSegmento || []).filter((c) => !(opt?.funcoes || []).some((f) => f.id === c))
  const portabilidadeOn = (contextos.includes('Portabilidade') || nextProdutos.includes('PORTABILIDADE_CONSIGNADO')) && nextProdutos.includes('INSS')
  return {
    ...filtros,
    produtos: nextProdutos,
    operacao: (principal?.operacao || '') as OperacaoMonitor | '',
    segmento: principal?.id === 'INSS' || portabilidadeOn ? 'inss' : principal?.segmentoPipeline || def?.segmentoPipeline || 'emprestimo',
    contextosSegmento: contextos,
    palavraChave: keywordsSugeridas(def, nextProdutos),
    tipoBusca: nextProdutos.includes('CREDITO_CLT')
      ? 'empresa_funcionarios'
      : nextProdutos.includes('INSS')
        ? 'pessoa'
        : filtros.tipoBusca || 'empresa',
  }
}

/** Chip de contexto INSS; Portabilidade reutiliza o produto PORTABILIDADE_CONSIGNADO sem segmento visual CONSIGNADO. */
export function aplicarFuncaoInss(filtros: FiltrosPesquisa, funcaoId: string): FiltrosPesquisa {
  const cargos = filtros.cargos || []
  const contextos = filtros.contextosSegmento || []
  const inCargos = cargos.includes(funcaoId)
  const nextCargos = inCargos ? cargos.filter((x) => x !== funcaoId) : [...cargos, funcaoId]
  const nextCtx = inCargos || contextos.includes(funcaoId) ? contextos.filter((x) => x !== funcaoId) : [...contextos, funcaoId]
  const portabilidadeOn = nextCtx.includes('Portabilidade')
  const produtos = Array.from(new Set([...(filtros.produtos || []), 'INSS']))
  const nextProdutos = portabilidadeOn
    ? Array.from(new Set([...produtos, 'PORTABILIDADE_CONSIGNADO']))
    : produtos.filter((p) => p !== 'PORTABILIDADE_CONSIGNADO')
  return {
    ...filtros,
    cargos: nextCargos,
    contextosSegmento: nextCtx,
    produtos: nextProdutos,
    operacao: 'INSS' as OperacaoMonitor,
    segmento: 'inss',
    tipoBeneficiario:
      funcaoId === 'Aposentado' ? 'aposentado' : funcaoId === 'Pensionista' ? 'pensionista' : filtros.tipoBeneficiario,
  }
}
