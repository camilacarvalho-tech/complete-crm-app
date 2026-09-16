import { FILTROS_VAZIOS } from '../constants'
import type { FiltrosPesquisa } from '../types'

function clean(value: unknown): string { return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '' }

export function normalizeFiltros(input?: Partial<FiltrosPesquisa>): FiltrosPesquisa {
  const scoreMinimo = Number(input?.scoreMinimo)
  const maxResults = Number(input?.maxResultsPerCycle)
  return {
    ...FILTROS_VAZIOS,
    ...input,
    cidade: clean(input?.cidade),
    cidadesSelecionadas: Array.isArray(input?.cidadesSelecionadas)
      ? input.cidadesSelecionadas.map((c) => clean(c)).filter(Boolean)
      : [],
    estado: clean(input?.estado).toUpperCase(),
    segmento: clean(input?.segmento),
    palavraChave: clean(input?.palavraChave),
    cargos: Array.isArray(input?.cargos) ? input.cargos.filter(Boolean) : [],
    bairro: clean(input?.bairro),
    cep: clean(input?.cep),
    cnae: clean(input?.cnae),
    nomeEmpresa: clean(input?.nomeEmpresa),
    site: clean(input?.site),
    instagram: clean(input?.instagram),
    facebook: clean(input?.facebook),
    googleMapsQuery: clean(input?.googleMapsQuery),
    scoreMinimo: Number.isFinite(scoreMinimo) && scoreMinimo > 0 ? scoreMinimo : 70,
    temperaturaMinima: input?.temperaturaMinima || '',
    maxResultsPerCycle: Number.isFinite(maxResults) && maxResults > 0 ? Math.min(100, maxResults) : 100,
    faixaFuncionarios: input?.faixaFuncionarios || 'qualquer',
    pais: clean(input?.pais) || 'Brasil',
    abrangenciaGeografica: input?.abrangenciaGeografica,
    operacao: input?.operacao || '',
    campanha: clean(input?.campanha),
    produtos: Array.isArray(input?.produtos) ? input.produtos.filter(Boolean) : [],
    banco: clean(input?.banco) || 'todos',
    cnpjConsulta: (input?.cnpjConsulta || '').replace(/\D/g, ''),
    tipoBeneficiario: input?.tipoBeneficiario || 'todos',
    idadeMinima: input?.idadeMinima ?? null,
    idadeMaxima: input?.idadeMaxima ?? null,
    dataNascimentoInicial: clean(input?.dataNascimentoInicial),
    dataNascimentoFinal: clean(input?.dataNascimentoFinal),
    tipoBeneficio: clean(input?.tipoBeneficio),
    especieBeneficio: clean(input?.especieBeneficio),
    situacaoBeneficio: clean(input?.situacaoBeneficio),
    beneficiosConsignaveis: input?.beneficiosConsignaveis || 'todos',
  }
}

export function filtrosResumo(input?: Partial<FiltrosPesquisa>): string {
  const filtros = normalizeFiltros(input)
  return [filtros.palavraChave, filtros.segmento, [filtros.cidade, filtros.estado].filter(Boolean).join('/')].filter(Boolean).join(' · ') || 'Pesquisa geral'
}
