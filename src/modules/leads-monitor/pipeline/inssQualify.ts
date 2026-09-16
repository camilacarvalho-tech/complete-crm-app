import type { FiltrosPesquisa } from '../types'

export const INSS_PRODUTOS = [
  { id: 'NOVO', label: 'Novo' },
  { id: 'PORTABILIDADE', label: 'Portabilidade' },
  { id: 'REFINANCIAMENTO', label: 'Refinanciamento' },
  { id: 'REFINANCIAMENTO_PORTABILIDADE', label: 'Refinanciamento da Portabilidade' },
  { id: 'MULTIPLAS_OPORTUNIDADES', label: 'Múltiplas oportunidades' },
  { id: 'CARTAO_RMC', label: 'Cartão RMC' },
  { id: 'CARTAO_RCC', label: 'Cartão RCC' },
  { id: 'CP_RESOLVE', label: 'CP Resolve' },
] as const

export const INSS_CAMPANHAS = [
  { id: 'NOVO', label: 'Campanha Novo' },
  { id: 'PORTABILIDADE', label: 'Campanha Portabilidade' },
  { id: 'REFINANCIAMENTO', label: 'Campanha Refinanciamento' },
  { id: 'REFINANCIAMENTO_PORTABILIDADE', label: 'Campanha Refinanciamento da Portabilidade' },
  { id: 'MULTIPLAS_OPORTUNIDADES', label: 'Campanha Múltiplas oportunidades' },
  { id: 'CARTAO_RMC', label: 'Campanha Cartão RMC' },
  { id: 'CARTAO_RCC', label: 'Campanha Cartão RCC' },
  { id: 'CP_RESOLVE', label: 'Campanha CP Resolve' },
] as const

export function idadeFromDate(value?: string | null): number | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

export interface InssOpportunity {
  produto: string
  status: 'oportunidade_identificada' | 'possivel_enquadramento'
  criteriosAtendidos: string[]
  criteriosNaoAtendidos: string[]
  score: number
}

export function qualifyInssRecord(
  mapped: Record<string, string>,
  filtros: FiltrosPesquisa
): { ok: boolean; idade: number | null; oportunidades: InssOpportunity[]; motivos: string[] } {
  const idade = mapped.idade && /^\d+$/.test(mapped.idade)
    ? Number(mapped.idade)
    : idadeFromDate(mapped.dataNascimento)
  const tipo = (mapped.tipoBeneficiario || '').toLowerCase()
  const situacao = (mapped.situacaoBeneficio || '').toLowerCase()
  const motivos: string[] = []
  const met: string[] = []
  const notMet: string[] = []

  if (filtros.tipoBeneficiario && filtros.tipoBeneficiario !== 'todos') {
    if (!tipo) {
      notMet.push('tipo de beneficiário não informado na fonte')
    } else if (!tipo.includes(filtros.tipoBeneficiario) && !tipo.includes('aposent') && filtros.tipoBeneficiario === 'aposentado') {
      return { ok: false, idade, oportunidades: [], motivos: ['tipo de beneficiário fora do filtro'] }
    } else if (filtros.tipoBeneficiario === 'pensionista' && !tipo.includes('pension')) {
      return { ok: false, idade, oportunidades: [], motivos: ['tipo de beneficiário fora do filtro'] }
    } else {
      met.push('tipo de beneficiário compatível com o filtro')
    }
  }

  if (filtros.idadeMinima != null && idade != null && idade < filtros.idadeMinima) {
    return { ok: false, idade, oportunidades: [], motivos: ['idade abaixo do filtro'] }
  }
  if (filtros.idadeMaxima != null && idade != null && idade > filtros.idadeMaxima) {
    return { ok: false, idade, oportunidades: [], motivos: ['idade acima do filtro'] }
  }
  if ((filtros.idadeMinima != null || filtros.idadeMaxima != null) && idade != null) {
    met.push('idade dentro do filtro')
  } else if (filtros.idadeMinima != null || filtros.idadeMaxima != null) {
    notMet.push('idade não informada na fonte')
  }

  if (filtros.situacaoBeneficio && situacao) {
    if (situacao.includes(filtros.situacaoBeneficio.toLowerCase())) met.push('situação do benefício compatível')
    else return { ok: false, idade, oportunidades: [], motivos: ['situação do benefício fora do filtro'] }
  }

  if (mapped.tipoBeneficio || mapped.especieBeneficio) {
    met.push('benefício informado pela fonte autorizada')
  }
  if (mapped.banco) {
    const want = (filtros.banco || '').toLowerCase()
    if (want && want !== 'todos' && !mapped.banco.toLowerCase().includes(want) && mapped.banco.toLowerCase() !== want) {
      return { ok: false, idade, oportunidades: [], motivos: ['banco fora do filtro'] }
    }
    met.push('banco informado pela fonte')
  } else if (filtros.banco && filtros.banco !== 'todos') {
    notMet.push('banco não informado na fonte')
  }

  const qtdFiltro = filtros.beneficiosConsignaveis
  const qtdFonte = (mapped.beneficiosConsignaveis || mapped.qtdBeneficios || '').trim()
  if (qtdFiltro && qtdFiltro !== 'todos') {
    if (!qtdFonte) notMet.push('número de benefícios consignáveis não informado na fonte')
    else if (qtdFonte !== qtdFiltro && !(qtdFiltro === '5+' && Number(qtdFonte) >= 5)) {
      return { ok: false, idade, oportunidades: [], motivos: ['quantidade de benefícios consignáveis fora do filtro'] }
    } else met.push('quantidade de benefícios consignáveis compatível')
  }

  const produtos = (filtros.produtos || []).filter((p) => p && p !== 'MULTIPLAS_OPORTUNIDADES')
  const selected = produtos.length ? produtos : mapped.produto ? [mapped.produto] : ['NOVO']
  let score = 40 + met.length * 8
  score = Math.max(0, Math.min(100, score))
  const oportunidades: InssOpportunity[] = selected.map((produto) => ({
    produto,
    status: 'possivel_enquadramento',
    criteriosAtendidos: met,
    criteriosNaoAtendidos: notMet,
    score,
  }))
  motivos.push('Oportunidade identificada — possível enquadramento pelos critérios da base')
  return { ok: true, idade, oportunidades, motivos }
}
