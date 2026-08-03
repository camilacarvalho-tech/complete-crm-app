/**
 * Search Engine V1.2 — orquestra fontes ativas em paralelo → normalize → dedupe → score → persist.
 * UI nunca bloqueia: progresso via SearchRun (onSnapshot).
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_FONTES, COL_JOBS, COL_OPORTUNIDADES, COL_PESQUISAS, JOB_LEASE_MS } from '../constants'
import { bootstrapConnectors, getConnector } from '../connectors'
import type { ConnectorFetchContext, NormalizedLead } from '../connectors/types'
import { getNexusAiQualifier } from '../ai/INexusAiQualifier'
import { recordConnectorFailure, recordConnectorSuccess } from '../services/healthStore'
import { writeLeadsMonitorLog } from '../services/opsLogs'
import { normalizeFromConnector } from '../pipeline/normalize'
import { buildDedupeKey, deduplicateLeads } from '../pipeline/dedupe'
import type { FontePesquisa, FiltrosPesquisa, MonitorRunResult, OportunidadeMonitor } from '../types'
import { normalizeFiltros } from './filters'
import {
  finalizeSearchRun,
  getSearchRun,
  isSearchCancelled,
  updateSearchProgress,
} from './SearchProgress'
import { isSoftSkip, withRetry } from './retry'

export interface SearchEngineOptions {
  empresaId: string
  searchRunId: string
  jobId?: string
  filtros?: FiltrosPesquisa
  fontesIds?: string[]
  pesquisaId?: string
  llmBudget?: number
  limitePorFonte?: number
}

export interface FonteExecResult {
  fonteId: string
  fonteNome: string
  connectorId?: string
  ok: boolean
  skipped?: boolean
  rawCount: number
  leads: NormalizedLead[]
  error?: string
  attempts: number
  latencyMs: number
}

async function renewLease(empresaId: string, jobId?: string): Promise<void> {
  if (!jobId) return
  try {
    await updateDoc(doc(db, 'empresas', empresaId, COL_JOBS, jobId), {
      leaseUntil: new Date(Date.now() + JOB_LEASE_MS),
      updatedAt: serverTimestamp(),
    })
  } catch {
    /* ignore */
  }
}

async function loadFontes(
  empresaId: string,
  fontesIds?: string[]
): Promise<FontePesquisa[]> {
  const snap = await getDocs(collection(db, 'empresas', empresaId, COL_FONTES))
  let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FontePesquisa, 'id'>) }))
  if (fontesIds?.length) {
    const set = new Set(fontesIds)
    list = list.filter((f) => set.has(f.id))
  } else {
    list = list.filter((f) => f.status === 'ativa')
  }
  return list
}

async function loadExistingDedupeKeys(empresaId: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, 'empresas', empresaId, COL_OPORTUNIDADES))
  return new Set(
    snap.docs.map((d) => {
      const data = d.data() as Partial<OportunidadeMonitor>
      return buildDedupeKey({
        dedupeKey: data.dedupeKey || '',
        telefone: data.telefone,
        email: data.email,
        cnpj: data.cnpj,
        nome: data.nome || '',
      })
    })
  )
}

async function executeOneFonte(
  fonte: FontePesquisa,
  ctx: ConnectorFetchContext
): Promise<FonteExecResult> {
  const t0 = Date.now()
  const base = {
    fonteId: fonte.id,
    fonteNome: fonte.nome,
    connectorId: fonte.connectorId || undefined,
    attempts: 0,
  }

  if (fonte.status !== 'ativa') {
    return {
      ...base,
      ok: true,
      skipped: true,
      rawCount: 0,
      leads: [],
      latencyMs: 0,
      attempts: 0,
      error: 'fonte_inativa',
    }
  }

  if ((fonte.usadoHoje || 0) >= (fonte.limiteDiario || 0) && (fonte.limiteDiario || 0) > 0) {
    return {
      ...base,
      ok: true,
      skipped: true,
      rawCount: 0,
      leads: [],
      latencyMs: Date.now() - t0,
      attempts: 0,
      error: 'limite_diario',
    }
  }

  if (fonte.health === 'needs_credentials' && !fonte.secretRef) {
    // Ainda assim tenta se houver conector (CSV/webhook sem secretRef)
    const connectorPeek = fonte.connectorId
      ? getConnector(fonte.connectorId, fonte.connectorApiVersion)
      : undefined
    if (!connectorPeek) {
      return {
        ...base,
        ok: true,
        skipped: true,
        rawCount: 0,
        leads: [],
        latencyMs: Date.now() - t0,
        attempts: 0,
        error: 'needs_credentials',
      }
    }
  }

  const connectorId = fonte.connectorId
  if (!connectorId) {
    return {
      ...base,
      ok: true,
      skipped: true,
      rawCount: 0,
      leads: [],
      latencyMs: Date.now() - t0,
      attempts: 0,
      error: 'sem_connectorId',
    }
  }

  const connector = getConnector(connectorId, fonte.connectorApiVersion)
  if (!connector) {
    return {
      ...base,
      ok: false,
      rawCount: 0,
      leads: [],
      latencyMs: Date.now() - t0,
      attempts: 0,
      error: `connector_nao_registrado:${connectorId}`,
    }
  }

  if (!connector.meta.autorizado || !connector.meta.enabled) {
    return {
      ...base,
      ok: true,
      skipped: true,
      rawCount: 0,
      leads: [],
      latencyMs: Date.now() - t0,
      attempts: 0,
      error: 'connector_desabilitado',
    }
  }

  let attempts = 0
  try {
    // Extrair secrets do config da fonte
    const fonteSecrets: Record<string, string> = {}
    if (fonte.config?.apiKey) {
      fonteSecrets.apiKey = String(fonte.config.apiKey)
    }
    if (fonte.config?.apiSecret) {
      fonteSecrets.apiSecret = String(fonte.config.apiSecret)
    }
    if (fonte.config?.webhookUrl) {
      fonteSecrets.webhookUrl = String(fonte.config.webhookUrl)
    }
    if (fonte.config?.authToken) {
      fonteSecrets.authToken = String(fonte.config.authToken)
    }

    const raw = await withRetry(
      async () => {
        attempts += 1
        return connector.fetch({
          ...ctx,
          secrets: fonteSecrets,
          preferredApiVersion: fonte.connectorApiVersion,
        })
      },
      { maxAttempts: 3, baseDelayMs: 350, label: connectorId }
    )
    const normalized = normalizeFromConnector(connector, raw, ctx)
    await recordConnectorSuccess({
      empresaId: ctx.empresaId,
      connectorId: connector.meta.id,
      latencyMs: Date.now() - t0,
      connectorVersion: connector.meta.version,
    })
    // Incrementa uso diário (best-effort)
    try {
      await updateDoc(doc(db, 'empresas', ctx.empresaId, COL_FONTES, fonte.id), {
        usadoHoje: (fonte.usadoHoje || 0) + 1,
        ultimaSyncEm: serverTimestamp(),
        health: 'ok',
        atualizadoEm: serverTimestamp(),
      })
    } catch {
      /* ignore */
    }
    return {
      ...base,
      ok: true,
      rawCount: raw.length,
      leads: normalized.leads,
      latencyMs: Date.now() - t0,
      attempts,
    }
  } catch (e: any) {
    const msg = e?.message || String(e)
    const soft = isSoftSkip(e)
    if (!soft) {
      await recordConnectorFailure({
        empresaId: ctx.empresaId,
        connectorId: connector.meta.id,
        error: msg,
        latencyMs: Date.now() - t0,
        connectorVersion: connector.meta.version,
      }).catch(() => {})
      try {
        await updateDoc(doc(db, 'empresas', ctx.empresaId, COL_FONTES, fonte.id), {
          health: msg.includes('needs_credentials') ? 'needs_credentials' : 'error',
          errosRecentes: [{ em: new Date().toISOString(), mensagem: msg.slice(0, 240) }],
          atualizadoEm: serverTimestamp(),
        })
      } catch {
        /* ignore */
      }
    }
    return {
      ...base,
      ok: soft,
      skipped: soft,
      rawCount: 0,
      leads: [],
      latencyMs: Date.now() - t0,
      attempts,
      error: msg,
    }
  }
}

/**
 * Executa busca inteligente completa para um SearchRun.
 * Falha de uma fonte NÃO aborta as demais (Promise.allSettled).
 */
export async function runSearchEngine(opts: SearchEngineOptions): Promise<MonitorRunResult> {
  bootstrapConnectors()
  const started = Date.now()
  const {
    empresaId,
    searchRunId,
    jobId,
    pesquisaId,
    llmBudget = 3,
    limitePorFonte = 25,
  } = opts

  const run = await getSearchRun(empresaId, searchRunId)
  if (!run) throw new Error(`SearchRun ${searchRunId} não encontrado`)
  if (run.status === 'cancelled') {
    return { encontrados: 0, novos: 0, duplicados: 0, fontes: [] }
  }

  const filtros = normalizeFiltros(opts.filtros || run.filtros)
  const fontes = await loadFontes(empresaId, opts.fontesIds || run.fontesIds)
  const fontesTotal = Math.max(fontes.length, 1)

  await writeLeadsMonitorLog({
    empresaId,
    level: 'info',
    message: `SearchEngine start · run=${searchRunId} · fontes=${fontes.length}`,
    jobId,
    meta: { searchRunId, fontesIds: fontes.map((f) => f.id) },
  })

  await updateSearchProgress(
    empresaId,
    searchRunId,
    {
      percent: 2,
      etapa: 'consultando_fontes',
      fontesConcluidas: 0,
      fontesTotal,
      encontrados: 0,
      novos: 0,
      duplicados: 0,
      tempoMs: Date.now() - started,
    },
    'running'
  )

  if (await isSearchCancelled(empresaId, searchRunId)) {
    await finalizeSearchRun({
      empresaId,
      searchRunId,
      status: 'cancelled',
      progresso: {
        percent: 100,
        etapa: 'cancelled',
        fontesConcluidas: 0,
        fontesTotal,
        encontrados: 0,
        novos: 0,
        duplicados: 0,
        tempoMs: Date.now() - started,
      },
    })
    return { encontrados: 0, novos: 0, duplicados: 0, fontes: [] }
  }

  const ctx: ConnectorFetchContext = {
    empresaId,
    filtros,
    secrets: {}, // Será preenchido por fonte específica
    limite: limitePorFonte,
  }

  // —— Execução simultânea por fonte ativa ——
  const results: FonteExecResult[] = []
  let progressChain: Promise<void> = Promise.resolve()

  const reportFonteDone = (fonte: FontePesquisa, r: FonteExecResult) => {
    progressChain = progressChain.then(async () => {
      results.push(r)
      const fontesConcluidas = results.length
      const encontradosParcial = results.reduce((a, x) => a + x.rawCount, 0)

      await writeLeadsMonitorLog({
        empresaId,
        level: r.ok ? 'info' : 'error',
        message: r.skipped
          ? `Fonte skip ${fonte.nome}: ${r.error || 'ok'}`
          : r.ok
            ? `Fonte ok ${fonte.nome}: ${r.rawCount} raw · ${r.leads.length} norm · ${r.attempts} tentativa(s)`
            : `Fonte falhou ${fonte.nome}: ${r.error}`,
        jobId,
        connectorId: r.connectorId,
        meta: {
          searchRunId,
          fonteId: fonte.id,
          rawCount: r.rawCount,
          latencyMs: r.latencyMs,
          attempts: r.attempts,
        },
      })

      const elapsed = Date.now() - started
      const avg = fontesConcluidas > 0 ? elapsed / fontesConcluidas : elapsed
      const remaining = Math.max(0, fontesTotal - fontesConcluidas)
      await updateSearchProgress(empresaId, searchRunId, {
        percent: Math.min(70, Math.round((fontesConcluidas / fontesTotal) * 70)),
        etapa: `fonte:${fonte.nome}`,
        fontesConcluidas,
        fontesTotal,
        encontrados: encontradosParcial,
        novos: 0,
        duplicados: 0,
        tempoMs: elapsed,
        etaMs: Math.round(avg * remaining),
      })
    })
    return progressChain
  }

  const tasks = fontes.map((fonte) =>
    (async () => {
      if (await isSearchCancelled(empresaId, searchRunId)) {
        const skipped: FonteExecResult = {
          fonteId: fonte.id,
          fonteNome: fonte.nome,
          ok: true,
          skipped: true,
          rawCount: 0,
          leads: [],
          attempts: 0,
          latencyMs: 0,
          error: 'cancelled',
        }
        await reportFonteDone(fonte, skipped)
        return skipped
      }
      await renewLease(empresaId, jobId)
      const r = await executeOneFonte(fonte, ctx)
      await reportFonteDone(fonte, r)
      return r
    })()
  )

  await Promise.allSettled(tasks)
  await progressChain

  const fontesConcluidas = results.length
  const encontradosParcial = results.reduce((a, x) => a + x.rawCount, 0)

  if (await isSearchCancelled(empresaId, searchRunId)) {
    await finalizeSearchRun({
      empresaId,
      searchRunId,
      status: 'cancelled',
      progresso: {
        percent: 100,
        etapa: 'cancelled',
        fontesConcluidas,
        fontesTotal,
        encontrados: encontradosParcial,
        novos: 0,
        duplicados: 0,
        tempoMs: Date.now() - started,
      },
      resultadoResumo: {
        encontrados: encontradosParcial,
        novos: 0,
        duplicados: 0,
        fontes: results.filter((r) => r.ok && !r.skipped).map((r) => r.fonteNome),
        tempoMs: Date.now() - started,
      },
    })
    return {
      encontrados: encontradosParcial,
      novos: 0,
      duplicados: 0,
      fontes: results.filter((r) => r.ok && !r.skipped).map((r) => r.fonteNome),
    }
  }

  await renewLease(empresaId, jobId)
  await updateSearchProgress(empresaId, searchRunId, {
    percent: 75,
    etapa: 'dedupe_normalize_score',
    fontesConcluidas,
    fontesTotal,
    encontrados: encontradosParcial,
    novos: 0,
    duplicados: 0,
    tempoMs: Date.now() - started,
  })

  const allLeads = results.flatMap((r) => r.leads)
  const existingKeys = await loadExistingDedupeKeys(empresaId)
  const { unicos, duplicados } = deduplicateLeads(allLeads, existingKeys)

  await writeLeadsMonitorLog({
    empresaId,
    level: 'info',
    message: `Dedupe: ${allLeads.length} → ${unicos.length} únicos · ${duplicados.length} duplicados`,
    jobId,
    meta: { searchRunId },
  })

  let novos = 0
  let budget = llmBudget
  const qualifier = getNexusAiQualifier()
  const fontesLabels = [
    ...new Set(results.filter((r) => r.ok && r.leads.length > 0).map((r) => r.fonteNome)),
  ]

  for (let i = 0; i < unicos.length; i++) {
    if (i % 5 === 0 && (await isSearchCancelled(empresaId, searchRunId))) break
    if (i % 8 === 0) await renewLease(empresaId, jobId)

    const lead = unicos[i]
    const scored = await qualifier.classifyAndScore(lead, {
      empresaId,
      filtros,
      useLlm: budget > 0,
    })
    if (budget > 0) budget -= 1

    await addDoc(collection(db, 'empresas', empresaId, COL_OPORTUNIDADES), {
      ...lead,
      origemFonte: lead.connectorId,
      empresaId,
      status: 'novo',
      score: scored.score,
      temperatura: scored.temperatura,
      classificacao: scored.classificacao,
      categoriaClassificacao: scored.categoria || scored.classificacao,
      motivosScore: scored.motivos,
      origemScore: scored.origemScore,
      sugestaoContato: scored.sugestaoContato || null,
      pesquisaId: pesquisaId || null,
      searchRunId,
      encontradoEm: serverTimestamp(),
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    novos += 1

    if (i % 3 === 0 || i === unicos.length - 1) {
      await updateSearchProgress(empresaId, searchRunId, {
        percent: Math.min(98, 75 + Math.round(((i + 1) / Math.max(unicos.length, 1)) * 23)),
        etapa: 'persistindo_oportunidades',
        fontesConcluidas,
        fontesTotal,
        encontrados: encontradosParcial || allLeads.length,
        novos,
        duplicados: duplicados.length,
        tempoMs: Date.now() - started,
      })
    }
  }

  if (pesquisaId) {
    await updateDoc(doc(db, 'empresas', empresaId, COL_PESQUISAS, pesquisaId), {
      ultimaExecucao: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    }).catch(() => {})
  }

  const cancelledLate = await isSearchCancelled(empresaId, searchRunId)
  const tempoMs = Date.now() - started
  const result: MonitorRunResult = {
    encontrados: encontradosParcial || allLeads.length,
    novos,
    duplicados: duplicados.length,
    fontes: fontesLabels,
  }

  await finalizeSearchRun({
    empresaId,
    searchRunId,
    status: cancelledLate ? 'cancelled' : 'succeeded',
    progresso: {
      percent: 100,
      etapa: cancelledLate ? 'cancelled' : 'succeeded',
      fontesConcluidas,
      fontesTotal,
      encontrados: result.encontrados,
      novos,
      duplicados: duplicados.length,
      tempoMs,
    },
    resultadoResumo: { ...result, tempoMs },
  })

  await writeLeadsMonitorLog({
    empresaId,
    level: 'info',
    message: `SearchEngine fim · encontrados=${result.encontrados} novos=${novos} dup=${duplicados.length} · ${tempoMs}ms`,
    jobId,
    meta: { searchRunId, ...result, tempoMs },
  })

  return result
}
