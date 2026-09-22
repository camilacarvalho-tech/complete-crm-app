import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_PROCESS_RUNS } from '../constants'
import { fetchMunicipiosUf } from '../../../lib/municipiosIbge'
import { omitUndefinedForFirestore } from '../services/jobQueue'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import { writeLeadsMonitorLog } from '../services/opsLogs'
import { enqueueJob } from '../services/jobQueue'
import type { FiltrosPesquisa } from '../types'
import type { ProcessRun } from '../types/processRun'
import { resolveAbrangencia, selectedCitiesFromFiltros, ufsDaAbrangencia } from './geoCoverage'

export async function seedGeoQueue(opts: {
  empresaId: string
  processRunId: string
  filtros: FiltrosPesquisa
}): Promise<{ cidade: string; estado: string; cidadesTotal: number }> {
  const abrangencia = resolveAbrangencia(opts.filtros)
  const ufs = ufsDaAbrangencia(opts.filtros)
  const firstUf = ufs[0]
  const selected = selectedCitiesFromFiltros(opts.filtros)
  const cities =
    abrangencia === 'CIDADE'
      ? selected.length
        ? selected
        : [opts.filtros.cidade].filter(Boolean)
      : await fetchMunicipiosUf(firstUf)
  await updateDoc(
    doc(db, 'empresas', opts.empresaId, COL_PROCESS_RUNS, opts.processRunId),
    omitUndefinedForFirestore({
      abrangenciaGeografica: abrangencia,
      geoUfs: ufs,
      geoUfIndex: 0,
      geoCities: cities,
      geoCityIndex: 0,
      cidadesTotal: abrangencia === 'BRASIL' ? cities.length : cities.length,
      cidadesProcessadas: 0,
      cidadesErro: 0,
      cidadeAtual: cities[0] || null,
      geoBairro: opts.filtros.bairro || null,
      geoCep: opts.filtros.cep || null,
      etapaAtual: 'Buscando empresas',
      updatedAt: serverTimestamp(),
    })
  )
  return { cidade: cities[0] || opts.filtros.cidade, estado: firstUf, cidadesTotal: cities.length }
}

export async function advanceGeoQueue(opts: {
  empresaId: string
  processRunId: string
  searchRunId: string
  fontesIds?: string[]
  pesquisaId?: string | null
  filtros: FiltrosPesquisa
  cityError?: string | null
  signal?: AbortSignal
}): Promise<{ done: boolean; nextCidade?: string; nextEstado?: string }> {
  const ref = doc(db, 'empresas', opts.empresaId, COL_PROCESS_RUNS, opts.processRunId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return { done: true }
  const run = { id: snap.id, ...snap.data() } as ProcessRun
  const { isSearchHardCancelled, readExecutionFlags } = await import('./searchCancel')
  if (run.status === 'pausado' || run.status === 'cancelado') return { done: true }
  if (isSearchHardCancelled({ processRunId: opts.processRunId, searchRunId: opts.searchRunId })) {
    return { done: true }
  }
  const live = await readExecutionFlags(opts.empresaId, {
    processRunId: opts.processRunId,
    searchRunId: opts.searchRunId,
  })
  if (live.cancelled || live.paused) return { done: true }
  const abrangencia = run.abrangenciaGeografica || resolveAbrangencia(opts.filtros)

  let ufIndex = run.geoUfIndex || 0
  let cityIndex = (run.geoCityIndex || 0) + 1
  let cities = run.geoCities || []
  let ufs = run.geoUfs || ufsDaAbrangencia(opts.filtros)
  let cidadesProcessadas = (run.cidadesProcessadas || 0) + 1
  let cidadesErro = (run.cidadesErro || 0) + (opts.cityError ? 1 : 0)
  let cidadesTotal = run.cidadesTotal || cities.length

  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: opts.cityError ? 'search.city.error' : 'search.city.complete',
    origem: 'worker',
    entidade: 'process_run',
    entidadeId: opts.processRunId,
    after: { cidade: run.cidadeAtual, erro: opts.cityError || null },
  })

  if (cityIndex >= cities.length) {
    if (abrangencia === 'CIDADE') {
      await updateDoc(
        ref,
        omitUndefinedForFirestore({
          geoCityIndex: cityIndex,
          cidadesProcessadas,
          cidadesErro,
          cidadeAtual: null,
          progresso: 100,
          status: cidadesErro > 0 ? 'concluido_com_erros' : 'concluido',
          etapaAtual: 'Finalização',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
      return { done: true }
    }
    ufIndex += 1
    if (ufIndex >= ufs.length) {
      await updateDoc(
        ref,
        omitUndefinedForFirestore({
          geoCityIndex: cityIndex,
          geoUfIndex: ufIndex,
          cidadesProcessadas,
          cidadesErro,
          cidadeAtual: null,
          progresso: 100,
          status: cidadesErro > 0 ? 'concluido_com_erros' : 'concluido',
          etapaAtual: 'Finalização',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
      return { done: true }
    }
    cities = await fetchMunicipiosUf(ufs[ufIndex], opts.signal)
    const afterUf = await readExecutionFlags(opts.empresaId, {
      processRunId: opts.processRunId,
      searchRunId: opts.searchRunId,
    })
    if (afterUf.cancelled || afterUf.paused) return { done: true }
    cityIndex = 0
    cidadesTotal += cities.length
  }

  const nextCidade = cities[cityIndex]
  const nextEstado = ufs[ufIndex]
  const beforeEnqueue = await readExecutionFlags(opts.empresaId, {
    processRunId: opts.processRunId,
    searchRunId: opts.searchRunId,
  })
  if (beforeEnqueue.cancelled || beforeEnqueue.paused || isSearchHardCancelled({ processRunId: opts.processRunId, searchRunId: opts.searchRunId })) {
    return { done: true }
  }
  await updateDoc(
    ref,
    omitUndefinedForFirestore({
      geoUfs: ufs,
      geoUfIndex: ufIndex,
      geoCities: cities,
      geoCityIndex: cityIndex,
      cidadesProcessadas,
      cidadesErro,
      cidadesTotal,
      cidadeAtual: nextCidade,
      progresso: cidadesTotal ? Math.round((cidadesProcessadas / cidadesTotal) * 100) : 0,
      etapaAtual: `Buscando ${nextCidade}/${nextEstado}`,
      updatedAt: serverTimestamp(),
    })
  )

  const nextFiltros: FiltrosPesquisa = {
    ...opts.filtros,
    cidade: nextCidade,
    estado: nextEstado,
    abrangenciaGeografica: (run.abrangenciaGeografica as FiltrosPesquisa['abrangenciaGeografica']) || resolveAbrangencia(opts.filtros),
    cidadesSelecionadas: cities,
  }
  const stillGo = await readExecutionFlags(opts.empresaId, {
    processRunId: opts.processRunId,
    searchRunId: opts.searchRunId,
  })
  if (stillGo.cancelled || stillGo.paused || isSearchHardCancelled({ processRunId: opts.processRunId, searchRunId: opts.searchRunId })) {
    return { done: true }
  }
  await enqueueJob({
    empresaId: opts.empresaId,
    type: 'search_inteligente',
    payload: {
      filtros: nextFiltros,
      fontesIds: opts.fontesIds,
      searchRunId: opts.searchRunId,
      pesquisaId: opts.pesquisaId || null,
      processRunId: opts.processRunId,
    },
    idempotencyKey: `geo:${opts.empresaId}:${opts.processRunId}:${nextEstado}:${nextCidade}`,
  })
  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: 'info',
    message: `Próxima cidade: ${nextCidade}/${nextEstado} (${cidadesProcessadas}/${cidadesTotal})`,
    meta: { processRunId: opts.processRunId, etapa: 'geo' },
  })
  return { done: false, nextCidade, nextEstado }
}
