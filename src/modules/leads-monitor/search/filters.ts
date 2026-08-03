/**
 * Helpers de filtros V1.2 — normalização e campos estendidos.
 */
import type { FiltrosPesquisa } from '../types'
import { FILTROS_VAZIOS } from '../constants'

/** Garante todos os campos V1.2 (compatível com docs V1.1 parciais). */
export function normalizeFiltros(input?: Partial<FiltrosPesquisa> | null): FiltrosPesquisa {
  return {
    ...FILTROS_VAZIOS,
    ...(input || {}),
    cidade: String(input?.cidade ?? '').trim(),
    estado: String(input?.estado ?? '').trim().toUpperCase(),
    segmento: String(input?.segmento ?? '').trim(),
    palavraChave: String(input?.palavraChave ?? '').trim(),
    bairro: String(input?.bairro ?? '').trim(),
    cep: String(input?.cep ?? '').replace(/\D/g, '').slice(0, 8),
    cnae: String(input?.cnae ?? '').replace(/\D/g, ''),
    nomeEmpresa: String(input?.nomeEmpresa ?? '').trim(),
    site: String(input?.site ?? '').trim(),
    instagram: String(input?.instagram ?? '').trim(),
    facebook: String(input?.facebook ?? '').trim(),
    googleMapsQuery: String(input?.googleMapsQuery ?? '').trim(),
  }
}

/** Resumo legível para histórico / audit. */
export function filtrosResumo(f: FiltrosPesquisa): string {
  return [
    f.cidade && `cidade=${f.cidade}`,
    f.estado && `UF=${f.estado}`,
    f.bairro && `bairro=${f.bairro}`,
    f.cep && `CEP=${f.cep}`,
    f.segmento && `seg=${f.segmento}`,
    f.cnae && `CNAE=${f.cnae}`,
    f.palavraChave && `kw=${f.palavraChave}`,
    f.nomeEmpresa && `empresa=${f.nomeEmpresa}`,
  ]
    .filter(Boolean)
    .join(' · ') || 'sem filtros'
}
