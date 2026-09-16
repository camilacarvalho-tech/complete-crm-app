import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
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
  pesquisaId?: string
  llmBudget?: number
  processRunId?: string
}): Promise<MonitorRunResult> {
  const runRef = doc(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS, opts.searchRunId)
  await updateDoc(runRef, {
    status: 'running',
    jobId: opts.jobId || null,
    atualizadoEm: serverTimestamp(),
    progresso: {
      percent: 10,
      etapa: opts.filtros.cidade ? `Buscando ${opts.filtros.cidade}` : 'Processando fontes',
      fontesConcluidas: 0,
      fontesTotal: opts.fontesIds?.length || 0,
      encontrados: 0,
      novos: 0,
      duplicados: 0,
      tempoMs: 0,
    },
  })
  const startedAt = Date.now()
  const cnpj = digitsOnly(opts.filtros.cnpjConsulta)
  let cityError: string | null = null
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
      })
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
      })
      const geoSnap = await getDoc(doc(db, 'empresas', opts.empresaId, COL_PROCESS_RUNS, opts.processRunId))
      const geo = geoSnap.data() as { cidadesProcessadas?: number; cidadesTotal?: number; cidadeAtual?: string } | undefined
      await updateDoc(runRef, {
        status: adv.done ? 'succeeded' : 'running',
        resultadoResumo: { ...result, tempoMs },
        progresso: {
          percent: geo?.cidadesTotal ? Math.round(((geo.cidadesProcessadas || 0) / geo.cidadesTotal) * 100) : 50,
          etapa: adv.done ? 'Concluída' : `Cidade ${geo?.cidadeAtual || ''}`,
          fontesConcluidas: result.fontes.length,
          fontesTotal: opts.fontesIds?.length || result.fontes.length,
          encontrados: result.encontrados,
          novos: result.novos,
          duplicados: result.duplicados,
          tempoMs,
        },
        atualizadoEm: serverTimestamp(),
        ...(adv.done ? { finalizadoEm: serverTimestamp() } : {}),
      })
      return result
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
    cityError = error?.message || String(error)
    if (
      opts.processRunId &&
      needsGeoQueue(opts.filtros)
    ) {
      await advanceGeoQueue({
        empresaId: opts.empresaId,
        processRunId: opts.processRunId,
        searchRunId: opts.searchRunId,
        fontesIds: opts.fontesIds,
        pesquisaId: opts.pesquisaId || null,
        filtros: opts.filtros,
        cityError,
      })
    }
    await updateDoc(runRef, {
      status: 'failed',
      lastError: cityError,
      finalizadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    throw error
  }
}
