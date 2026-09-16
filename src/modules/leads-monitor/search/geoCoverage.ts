import { ESTADOS_BR } from '../constants'
import type { AbrangenciaGeografica, FiltrosPesquisa } from '../types'

export const CIDADE_TODAS = '__TODAS__'

export function selectedCitiesFromFiltros(filtros: Partial<FiltrosPesquisa>): string[] {
  const listed = (filtros.cidadesSelecionadas || []).map((c) => String(c).trim()).filter(Boolean)
  if (listed.length) return Array.from(new Set(listed))
  const c = String(filtros.cidade || '').trim()
  if (c && c !== CIDADE_TODAS) return [c]
  return []
}

export function resolveAbrangencia(filtros: Partial<FiltrosPesquisa>): AbrangenciaGeografica {
  if (filtros.abrangenciaGeografica === 'ESTADO' || filtros.abrangenciaGeografica === 'BRASIL') {
    return filtros.abrangenciaGeografica
  }
  const estado = String(filtros.estado || '').toUpperCase()
  const listed = (filtros.cidadesSelecionadas || []).map((c) => String(c).trim()).filter(Boolean)
  if (listed.length >= 1) return 'CIDADE'
  const cidadeRaw = String(filtros.cidade || '').trim()
  const todasCidades = !cidadeRaw || cidadeRaw === CIDADE_TODAS
  const todosEstados = !estado || estado === 'TODOS'
  if (todosEstados && todasCidades) return 'BRASIL'
  if (todasCidades) return 'ESTADO'
  return 'CIDADE'
}

export function needsGeoQueue(filtros: Partial<FiltrosPesquisa>): boolean {
  const abrangencia = resolveAbrangencia(filtros)
  if (abrangencia === 'ESTADO' || abrangencia === 'BRASIL') return true
  return (filtros.cidadesSelecionadas || []).filter(Boolean).length > 1
}

export function ufsDaAbrangencia(filtros: Partial<FiltrosPesquisa>): string[] {
  const abrangencia = resolveAbrangencia(filtros)
  if (abrangencia === 'BRASIL') return [...ESTADOS_BR]
  const uf = String(filtros.estado || '').toUpperCase()
  return uf && uf !== 'TODOS' ? [uf] : [...ESTADOS_BR]
}

export function cidadeEfetiva(filtros: Partial<FiltrosPesquisa>): string {
  const cities = selectedCitiesFromFiltros(filtros)
  if (cities.length) return cities[0]
  const c = String(filtros.cidade || '').trim()
  if (!c || c === CIDADE_TODAS) return ''
  return c
}
