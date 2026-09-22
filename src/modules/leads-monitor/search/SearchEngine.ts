import { addDoc, collection, doc, getDoc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_OPORTUNIDADES, COL_PROCESS_RUNS, COL_SEARCH_RUNS } from '../constants'
import { runLeadPipeline } from '../pipeline'
import { enrichLead } from '../pipeline/enrich'
import { digitsOnly, formatCnpj } from '../pipeline/normalizeFields'
import { scoreLead, temperaturaFromScore } from '../pipeline/score'
import { classifyLead } from '../pipeline/classify'
import { omitUndefinedForFirestore } from '../services/jobQueue'
import type { FiltrosPesquisa, MonitorRunResult } from '../types'
import { needsGeoQueue, resolveAbrangencia } from './geoCoverage'
import { advanceGeoQueue } from './geoAdvance'
import type { NormalizedLead } from '../connectors/types'
import {
  beginSearchAbort,
  isSearchCancelledError,
  isSearchHardCancelled,
  readExecutionFlags,
  throwIfSearchCancelled,
  type SearchCancelIds,
} from './searchCancel'

const EMPTY_CANCELLED: MonitorRunResult = {
  encontrados: 0,
  novos: 0,
  duplicados: 0,
  fontes: [],
  enriquecidos: 0,
  rejeitados: 0,
  scoreMedio: 0,
  quentes: 0,
  muitoQuentes: 0,
  tempoMs: 0,
  erros: ['cancelado'],
}

async function markSearchRunRunningIfActive(opts: {
  empresaId: string
  searchRunId: string
  jobId?: string
  filtros: FiltrosPesquisa
  fontesTotal: number
}): Promise<boolean> {
  const runRef = doc(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS, opts.searchRunId)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(runRef)
    const st = String(snap.data()?.status || '')
    if (st === 'cancelled' || st === 'paused') return false
    tx.update(runRef, {
      status: 'running',
      jobId: opts.jobId || null,
      atualizadoEm: serverTimestamp(),
      progresso: {
        percent: 10,
        etapa: opts.filtros.cidade ? `Buscando ${opts.filtros.cidade}` : 'Processando fontes',
        fontesConcluidas: 0,
        fontesTotal: opts.fontesTotal,
        encontrados: 0,
        novos: 0,
        duplicados: 0,
        tempoMs: 0,
      },
    })
    return true
  })
}

async function runCnpjEnrichment(empresaId: string, cnpj: string, filtros: FiltrosPesquisa): Promise<MonitorRunResult> {
  const formatted = formatCnpj(cnpj) || cnpj
  const lead: NormalizedLead = {
    connectorId: 'brasilapi_cnpj',
    origemLabel: 'BrasilAPI CNPJ',
    dedupeKey: `cnpj:${cnpj}`,
    tipo: 'empresa',
    nome: formatted,
    cidade: filtros.cidade || '',
    estado: filtros.estado || '',
    segmento: filtros.segmento || '',
    cnpj,
    consentimentoLgpd: true,
    baseLegal: '',
  }
  const enriched = await enrichLead(lead, empresaId)
  const classification = await classifyLead(enriched, filtros, empresaId, { useLlm: false })
  const scored = scoreLead(enriched, classification, filtros)
  await addDoc(
    collection(db, 'empresas', empresaId, COL_OPORTUNIDADES),
    omitUndefinedForFirestore({
      ...enriched,
      origemFonte: 'brasilapi_cnpj',
      empresaId,
      status: 'novo',
      score: scored.score,
      temperatura: scored.temperatura || temperaturaFromScore(scored.score),
      classificacao: classification.label,
      motivosScore: scored.motivos,
      origemScore: scored.origemScore,
      employeeCountStatus: 'nao_informada',
      fontes: [enriched.origemLabel],
      origemDado: 'BrasilAPI',
      fonteDado: 'BrasilAPI',
      finalidadeTratamento: 'Enriquecimento empresarial',
      coletadoEm: serverTimestamp(),
      encontradoEm: serverTimestamp(),
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
      dadosEnriquecidos: enriched.dadosEnriquecidos ?? null,
    })
  )
  return {
    encontrados: 1,
    novos: 1,
    duplicados: 0,
    fontes: ['BrasilAPI CNPJ'],
    enriquecidos: enriched.dadosEnriquecidos?.cnpjValidado ? 1 : 0,
    rejeitados: 0,
    scoreMedio: scored.score,
    quentes: 0,
    muitoQuentes: 0,
    tempoMs: 0,
    erros: [],
  }
}

export async function runSearchEngine(opts: {
  empresaId: string
  searchRunId: string
  jobId?: string
  filtros: FiltrosPesquisa
  fontesIds?: string[]
  fontesHabilitadas?: string[]
  pesquisaId?: string
  llmBudget?: number
  processRunId?: string
  signal?: AbortSignal
}): Promise<MonitorRunResult> {
  const ids: SearchCancelIds = { searchRunId: opts.searchRunId, processRunId: opts.processRunId }
  const runRef = doc(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS, opts.searchRunId)
  const flags = await readExecutionFlags(opts.empresaId, ids)
  if (flags.cancelled || flags.paused) return EMPTY_CANCELLED
  throwIfSearchCancelled(ids)

  const started = await markSearchRunRunningIfActive({
    empresaId: opts.empresaId,
    searchRunId: opts.searchRunId,
    jobId: opts.jobId,
    filtros: opts.filtros,
    fontesTotal: opts.fontesIds?.length || 0,
  })
  if (!started) return EMPTY_CANCELLED

  const signal = opts.signal || beginSearchAbort(ids)
  const startedAt = Date.now()
  const cnpj = digitsOnly(opts.filtros.cnpjConsulta)
  try {
    let result: MonitorRunResult
    if (cnpj.length === 14) {
      result = await runCnpjEnrichment(opts.empresaId, cnpj, opts.filtros)
    } else {
      result = await runLeadPipeline({
        empresaId: opts.empresaId,
        filtros: opts.filtros,
        pesquisaId: opts.pesquisaId,
        llmBudget: opts.llmBudget,
        limitePorConector: opts.filtros.maxResultsPerCycle,
        fontesHabilitadas: opts.fontesHabilitadas || opts.filtros.fontesHabilitadas,
        cancelIds: ids,
        signal,
      })
    }
    const stopped = await readExecutionFlags(opts.empresaId, ids)
    if (stopped.cancelled || isSearchHardCancelled(ids)) {
      await updateDoc(runRef, {
        status: 'cancelled',
        atualizadoEm: serverTimestamp(),
        finalizadoEm: serverTimestamp(),
      })
      return EMPTY_CANCELLED
    }
    const tempoMs = Date.now() - startedAt
    const abrangencia =
      opts.filtros.abrangenciaGeografica === 'ESTADO' ||
      opts.filtros.abrangenciaGeografica === 'BRASIL' ||
      opts.filtros.abrangenciaGeografica === 'CIDADE'
        ? opts.filtros.abrangenciaGeografica
        : resolveAbrangencia(opts.filtros)
    const hasGeo =
      Boolean(opts.processRunId) &&
      cnpj.length !== 14 &&
      needsGeoQueue({ ...opts.filtros, abrangenciaGeografica: abrangencia })

    if (hasGeo && opts.processRunId) {
      const adv = await advanceGeoQueue({
        empresaId: opts.empresaId,
        processRunId: opts.processRunId,
        searchRunId: opts.searchRunId,
        fontesIds: opts.fontesIds,
        pesquisaId: opts.pesquisaId || null,
        filtros: opts.filtros,
        cityError: null,
        signal,
      })
      const geoSnap = await getDoc(doc(db, 'empresas', opts.empresaId, COL_PROCESS_RUNS, opts.processRunId))
      const geo = geoSnap.data() as {
        cidadesProcessadas?: number
        cidadesTotal?: number
        cidadeAtual?: string
        status?: string
      } | undefined
      const cancelledNow = geo?.status === 'cancelado' || isSearchHardCancelled(ids)
      const pausedNow = geo?.status === 'pausado'
      await updateDoc(runRef, {
        status: cancelledNow ? 'cancelled' : pausedNow ? 'paused' : adv.done ? 'succeeded' : 'running',
        resultadoResumo: { ...result, tempoMs },
        progresso: {
          percent: geo?.cidadesTotal ? Math.round(((geo.cidadesProcessadas || 0) / geo.cidadesTotal) * 100) : 50,
          etapa: cancelledNow ? 'Parado' : pausedNow ? 'Pausado' : adv.done ? 'Concluída' : `Cidade ${geo?.cidadeAtual || ''}`,
          fontesConcluidas: result.fontes.length,
          fontesTotal: opts.fontesIds?.length || result.fontes.length,
          encontrados: result.encontrados,
          novos: result.novos,
          duplicados: result.duplicados,
          tempoMs,
        },
        atualizadoEm: serverTimestamp(),
        ...((adv.done || cancelledNow || pausedNow) ? { finalizadoEm: pausedNow ? null : serverTimestamp() } : {}),
      })
      return cancelledNow ? EMPTY_CANCELLED : result
    }

    await updateDoc(runRef, {
      status: 'succeeded',
      resultadoResumo: { ...result, tempoMs },
      progresso: {
        percent: 100,
        etapa: 'Concluída',
        fontesConcluidas: result.fontes.length,
        fontesTotal: opts.fontesIds?.length || result.fontes.length,
        encontrados: result.encontrados,
        novos: result.novos,
        duplicados: result.duplicados,
        tempoMs,
      },
      finalizadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    return result
  } catch (error: any) {
    if (isSearchCancelledError(error) || isSearchHardCancelled(ids)) {
      await updateDoc(runRef, {
        status: 'cancelled',
        atualizadoEm: serverTimestamp(),
        finalizadoEm: serverTimestamp(),
      }).catch(() => {})
      return EMPTY_CANCELLED
    }
    const cityError = error?.message || String(error)
    const stopped = await readExecutionFlags(opts.empresaId, ids)
    if (!stopped.cancelled && !stopped.paused && opts.processRunId && needsGeoQueue(opts.filtros)) {
      await advanceGeoQueue({
        empresaId: opts.empresaId,
        processRunId: opts.processRunId,
        searchRunId: opts.searchRunId,
        fontesIds: opts.fontesIds,
        pesquisaId: opts.pesquisaId || null,
        filtros: opts.filtros,
        cityError,
        signal,
      })
    }
    await updateDoc(runRef, {
      status: stopped.cancelled ? 'cancelled' : 'failed',
      lastError: stopped.cancelled ? null : cityError,
      finalizadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    if (stopped.cancelled) return EMPTY_CANCELLED
    throw error
  }
}
