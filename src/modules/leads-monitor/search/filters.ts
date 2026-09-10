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
    estado: clean(input?.estado).toUpperCase(),
    segmento: clean(input?.segmento),
    palavraChave: clean(input?.palavraChave),
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
  }
}

export function filtrosResumo(input?: Partial<FiltrosPesquisa>): string {
  const filtros = normalizeFiltros(input)
  return [filtros.palavraChave, filtros.segmento, [filtros.cidade, filtros.estado].filter(Boolean).join('/')].filter(Boolean).join(' · ') || 'Pesquisa geral'
}
