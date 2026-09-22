/**
 * Orquestrador do pipeline (núcleo).
 *
 * Fluxo:
 *   Conector → Normalização → Deduplicação → Enriquecimento → Score → Classificação → persistência
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
import { COL_OPORTUNIDADES, COL_PESQUISAS, MAX_RESULTS_PER_CYCLE } from '../constants'
import { bootstrapConnectors, getRunnableConnectors } from '../connectors'
import type { ConnectorFetchContext, IConnector, NormalizedLead } from '../connectors/types'
import type { FiltrosPesquisa, LeadScoreResult, MonitorRunResult, OportunidadeMonitor } from '../types'
import { getNexusAiQualifier } from '../ai/INexusAiQualifier'
import { recordConnectorFailure, recordConnectorSuccess } from '../services/healthStore'
import { omitUndefinedForFirestore } from '../services/jobQueue'
import { writeLeadsMonitorLog } from '../services/opsLogs'
import { mapPlacesSkipCode } from '../services/placesClient'
import { filterConnectorsByCampanha } from '../services/fontesCampanha'
import { normalizeFromConnector } from './normalize'
import { collectDedupeKeys, buildDedupeKey, deduplicateLeads, matchExistingId } from './dedupe'
import { enrichLead } from './enrich'
import { temperaturaFromScore } from './score'
import { qualificationFromScore } from '../catalog/produtosMonitor'
import { runPersonDiscoveryForNewCompanies } from '../person/personDiscoveryEngine'
import { isSearchCancelledError, SearchCancelledError, throwIfSearchCancelled } from '../search/searchCancel'
import { isRobotPaused } from '../services/robotControl'

export interface PipelineRunOptions {
  empresaId: string
  filtros: FiltrosPesquisa
  pesquisaId?: string
  llmBudget?: number
  limitePorConector?: number
  enableEnrichment?: boolean
  fontesHabilitadas?: string[]
  signal?: AbortSignal
  cancelIds?: { searchRunId?: string | null; processRunId?: string | null }
}

interface ExistingOpp {
  id: string
  keys: string[]
  data: Partial<OportunidadeMonitor>
}

async function loadExisting(empresaId: string): Promise<ExistingOpp[]> {
  const snap = await getDocs(collection(db, 'empresas', empresaId, COL_OPORTUNIDADES))
  return snap.docs.map((d) => {
    const data = d.data() as Partial<OportunidadeMonitor>
    const keys = collectDedupeKeys({
      dedupeKey: data.dedupeKey || '',
      telefone: data.telefone,
      email: data.email,
      cnpj: data.cnpj,
      nome: data.nome || '',
      placeId: data.placeId,
      dominio: data.dominio,
      website: data.website,
      endereco: data.endereco,
      cidade: data.cidade,
      externalId: data.externalId,
      metadados: data.metadados,
    })
    return { id: d.id, keys, data }
  })
}

type ConnectorSkip = {
  connectorId: string
  label: string
  code: string
  message: string
}

async function collectNormalized(
  ctx: ConnectorFetchContext,
  fontesHabilitadas?: string[]
): Promise<{
  leads: NormalizedLead[]
  fontes: string[]
  rawCount: number
  skipped: ConnectorSkip[]
  connectorsUsados: IConnector[]
}> {
  const connectors = filterConnectorsByCampanha(getRunnableConnectors(), fontesHabilitadas)
  const batches: Array<{
    label: string
    leads: NormalizedLead[]
    rawCount: number
    skipped: ConnectorSkip | undefined
  }> = []
  for (const connector of connectors) {
    throwIfSearchCancelled(ctx.cancelIds || {})
    if (ctx.signal?.aborted) throw new SearchCancelledError()
    const t0 = Date.now()
    try {
      const raw = await connector.fetch(ctx)
      throwIfSearchCancelled(ctx.cancelIds || {})
      if (ctx.signal?.aborted) throw new SearchCancelledError()
      const normalized = normalizeFromConnector(connector, raw, ctx)
      await recordConnectorSuccess({
        empresaId: ctx.empresaId,
        connectorId: connector.meta.id,
        latencyMs: Date.now() - t0,
        connectorVersion: connector.meta.version,
      })
      batches.push({
        label: connector.meta.label,
        leads: normalized.leads,
        rawCount: raw.length,
        skipped: undefined,
      })
    } catch (e: any) {
      if (isSearchCancelledError(e)) throw e
      const message = e?.message || String(e)
      const isGoogle = connector.meta.id === 'google-places'
      const code = isGoogle
        ? mapPlacesSkipCode(e?.code, e?.status, message)
        : String(e?.code || 'skipped')
      console.warn(`[leads-monitor] conector ${connector.meta.id} skipped`, e)
      await recordConnectorFailure({
        empresaId: ctx.empresaId,
        connectorId: connector.meta.id,
        error: `${code}: ${message}`,
        latencyMs: Date.now() - t0,
        connectorVersion: connector.meta.version,
      })
      await writeLeadsMonitorLog({
        empresaId: ctx.empresaId,
        level: 'warn',
        message,
        connectorId: connector.meta.id,
        meta: {
          source: connector.meta.id,
          status: code,
          optional: isGoogle,
          skipped: true,
        },
      })
      batches.push({
        label: connector.meta.label,
        leads: [],
        rawCount: 0,
        skipped: {
          connectorId: connector.meta.id,
          label: connector.meta.label,
          code,
          message,
        },
      })
    }
  }

  return {
    leads: batches.flatMap((b) => b.leads),
    fontes: batches.filter((b) => b.leads.length > 0).map((b) => b.label),
    rawCount: batches.reduce((a, b) => a + b.rawCount, 0),
    skipped: batches.map((b) => b.skipped).filter((s): s is ConnectorSkip => Boolean(s)),
    connectorsUsados: connectors,
  }
}

function mergeLead(existing: Partial<OportunidadeMonitor>, lead: NormalizedLead) {
  return {
    telefone: lead.telefone || existing.telefone || null,
    website: lead.website || existing.website || null,
    endereco: lead.endereco || existing.endereco || null,
    cep: lead.cep || existing.cep || null,
    cnpj: lead.cnpj || existing.cnpj || null,
    dominio: lead.dominio || existing.dominio || null,
    placeId: lead.placeId || existing.placeId || null,
    cnpjValidado: lead.cnpjValidado || existing.cnpjValidado || false,
    dadosEnriquecidos: lead.dadosEnriquecidos || existing.dadosEnriquecidos || null,
    fontes: Array.from(new Set([...(existing.fontes || []), lead.origemLabel || lead.connectorId])),
    vezesEncontrada: (existing.vezesEncontrada || 1) + 1,
    ultimaDescoberta: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  }
}

export async function runLeadPipeline(opts: PipelineRunOptions): Promise<MonitorRunResult> {
  bootstrapConnectors()
  const started = Date.now()

  const {
    empresaId,
    filtros,
    pesquisaId,
    llmBudget = 0,
    limitePorConector = filtros.maxResultsPerCycle || MAX_RESULTS_PER_CYCLE,
    enableEnrichment = true,
    fontesHabilitadas,
    signal,
    cancelIds,
  } = opts

  const fontesDaExecucao = fontesHabilitadas ?? filtros.fontesHabilitadas
  const ids = cancelIds || {}
  throwIfSearchCancelled(ids)
  if (signal?.aborted) throw new SearchCancelledError()

  const ctx: ConnectorFetchContext = {
    empresaId,
    filtros,
    limite: Math.min(MAX_RESULTS_PER_CYCLE, Math.max(1, limitePorConector)),
    signal,
    cancelIds: ids,
  }

  const { leads, fontes, rawCount, skipped, connectorsUsados } = await collectNormalized(
    ctx,
    fontesDaExecucao
  )
  const skipNotes = skipped.map((s) => `${s.label}: ${s.code} — ${s.message}`)

  const existing = await loadExisting(empresaId)
  const existingKeys = new Set(existing.flatMap((row) => row.keys))
  const { unicos, duplicados } = deduplicateLeads(leads, existingKeys)
  throwIfSearchCancelled(ids)
  if (signal?.aborted) throw new SearchCancelledError()

  let enriquecidos = 0
  const leadsEnriquecidos: typeof unicos = []
  if (enableEnrichment) {
    for (const lead of unicos) {
      throwIfSearchCancelled(ids)
      if (signal?.aborted) throw new SearchCancelledError()
      const next = await enrichLead(lead, empresaId, { useLlm: false, signal })
      if (next.dadosEnriquecidos?.cnpjValidado) enriquecidos += 1
      leadsEnriquecidos.push(next)
    }
  } else {
    leadsEnriquecidos.push(...unicos)
  }

  let novos = 0
  let budget = llmBudget
  const qualifier = getNexusAiQualifier()
  const scores: number[] = []
  let quentes = 0
  let muitoQuentes = 0
  let rejeitados = 0

  const classPaused = await isRobotPaused(empresaId, 'classification')
  const newCompanies: Array<{ id: string; nome: string; cnpj?: string; telefone?: string; cidade?: string; estado?: string }> = []
  for (const lead of leadsEnriquecidos) {
    throwIfSearchCancelled(ids)
    if (signal?.aborted) throw new SearchCancelledError()
    const existingId = matchExistingId(lead, existing)
    const scored: LeadScoreResult = classPaused
      ? {
          score: 0,
          temperatura: 'Frio',
          classificacao: 'aguardando_classificacao',
          motivos: ['Robô de classificação pausado'],
          origemScore: 'nexus_ai_heuristica',
        }
      : await qualifier.classifyAndScore(lead, {
          empresaId,
          filtros,
          useLlm: budget > 0,
        })
    if (!classPaused && budget > 0) budget -= 1
    scores.push(scored.score)
    if (scored.temperatura === 'Muito quente') muitoQuentes += 1
    if (scored.temperatura === 'Quente' || scored.temperatura === 'Muito quente') quentes += 1

    if (existingId) {
      await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, existingId), {
        ...mergeLead(existing.find((e) => e.id === existingId)?.data || {}, lead),
        score: scored.score,
        temperatura: scored.temperatura,
        classificacao: scored.classificacao,
        motivosScore: scored.motivos,
        origemScore: scored.origemScore,
      })
      continue
    }

    const oppRef = await addDoc(
      collection(db, 'empresas', empresaId, COL_OPORTUNIDADES),
      omitUndefinedForFirestore({
        ...lead,
        origemFonte: lead.connectorId,
        empresaId,
        status: 'novo',
        score: scored.score,
        temperatura: scored.temperatura || temperaturaFromScore(scored.score),
        classificacao: scored.classificacao,
        categoriaClassificacao: scored.categoria || scored.classificacao,
        motivosScore: scored.motivos,
        origemScore: scored.origemScore,
        pesquisaId: pesquisaId && pesquisaId.trim() ? pesquisaId.trim() : null,
        employeeCount: lead.employeeCount ?? null,
        employeeCountRange: lead.employeeCountRange ?? null,
        employeeCountFonte: lead.employeeCountFonte ?? null,
        employeeCountStatus: lead.employeeCountStatus || 'nao_informada',
        metadados: {
          ...(lead.metadados || {}),
          scoreMinimo: filtros.scoreMinimo || 70,
          contextoProspeccao: filtros.palavraChave || null,
          operacao: filtros.operacao || null,
          produto: (filtros.produtos || [])[0] || filtros.operacao || null,
          campanha: filtros.campanha || null,
          campaignContext: filtros.campaignContext || null,
          subsegment: filtros.subsegment || (filtros.contextosSegmento || [])[0] || null,
          segment: filtros.segmento || null,
          qualificationStatus: qualificationFromScore(scored.score),
          personDiscoveryStatus: 'NOT_FOUND',
        },
        vezesEncontrada: 1,
        fontes: [lead.origemLabel || lead.connectorId],
        primeiraDescoberta: serverTimestamp(),
        ultimaDescoberta: serverTimestamp(),
        encontradoEm: serverTimestamp(),
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        dadosEnriquecidos: lead.dadosEnriquecidos ?? null,
        personDiscoveryStatus: 'NOT_FOUND',
      })
    )
    newCompanies.push({
      id: oppRef.id,
      nome: lead.nome,
      cnpj: lead.cnpj,
      telefone: lead.telefone,
      cidade: lead.cidade,
      estado: lead.estado,
    })
    novos += 1
  }

  for (const dup of duplicados) {
    throwIfSearchCancelled(ids)
    if (signal?.aborted) throw new SearchCancelledError()
    const existingId = matchExistingId(dup, existing)
    if (existingId) {
      await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, existingId), mergeLead(
        existing.find((e) => e.id === existingId)?.data || {},
        dup
      ))
    }
  }

  const seekPeople =
    filtros.tipoBusca === 'pessoa' ||
    filtros.tipoBusca === 'empresa_funcionarios' ||
    (filtros.produtos || []).includes('CREDITO_CLT') ||
    filtros.operacao === 'CREDITO_CLT'
  const personDisc = seekPeople
    ? await runPersonDiscoveryForNewCompanies({
        empresaId,
        companies: newCompanies,
        filtros: {
          operacao: filtros.operacao,
          produtos: filtros.produtos,
          campanha: pesquisaId || filtros.campanha,
          tipoBusca: filtros.tipoBusca,
          personFieldsRequested: filtros.personFieldsRequested,
          contactFieldsRequested: filtros.contactFieldsRequested,
        },
      })
    : {
        pessoasEncontradas: 0,
        pessoasComWhatsapp: 0,
        pessoasComTelefone: 0,
        pessoasSemContato: 0,
        status: 'NOT_FOUND' as const,
      }

  const tempoMs = Date.now() - started
  const scoreMedio = scores.length ? Math.round(scores.reduce((a, n) => a + n, 0) / scores.length) : 0
  const result: MonitorRunResult = {
    encontrados: rawCount || leads.length,
    novos,
    duplicados: duplicados.length,
    fontes,
    enriquecidos,
    rejeitados,
    scoreMedio,
    quentes,
    muitoQuentes,
    tempoMs,
    erros: skipNotes,
    pessoasEncontradas: personDisc.pessoasEncontradas,
    pessoasComWhatsapp: personDisc.pessoasComWhatsapp,
    pessoasComTelefone: personDisc.pessoasComTelefone,
    pessoasSemContato: personDisc.pessoasSemContato,
    empresasEncontradas: novos,
    personDiscoveryStatus: personDisc.status,
  }

  const osmSkip = skipped.find((s) => s.connectorId === 'openstreetmap')
  const googleSkip = skipped.find((s) => s.connectorId === 'google-places')
  await writeLeadsMonitorLog({
    empresaId,
    level: 'info',
    message: `Busca ${filtros.cidade || ''} ${filtros.estado || ''} · ${result.encontrados} retornados`,
    connectorId: fontes.includes('OpenStreetMap / Overpass')
      ? 'openstreetmap'
      : fontes.includes('Google Places')
        ? 'google-places'
        : osmSkip?.connectorId || googleSkip?.connectorId,
    meta: {
      campaignId: pesquisaId || null,
      pesquisaId: pesquisaId || null,
      robotId: 'busca',
      connectorId: connectorsUsados.map((c) => c.meta.id).join(',') || null,
      sourceName: fontes.join(',') || connectorsUsados.map((c) => c.meta.label).join(',') || 'none',
      estado: filtros.estado || '',
      cidade: filtros.cidade || '',
      bairro: filtros.bairro || '',
      cep: filtros.cep || '',
      timestamp: new Date().toISOString(),
      resultado: `${result.encontrados} encontrados · ${result.novos} novos · ${result.duplicados} duplicados`,
      quantidadeEncontrada: result.encontrados,
      quantidadeNova: result.novos,
      quantidadeDuplicada: result.duplicados,
      status: osmSkip && !googleSkip && fontes.length === 0 ? osmSkip.code : skipNotes.length ? 'partial' : 'SUCCESS',
      source: fontes.join(',') || 'none',
      query: [filtros.palavraChave, filtros.segmento, filtros.cidade, filtros.estado].filter(Boolean).join(' '),
      skipped: skipped.map((s) => ({ connectorId: s.connectorId, code: s.code })),
      fontesSelecionadas: fontesDaExecucao || [],
      fontesExecutadas: connectorsUsados.map((c) => c.meta.id),
      quantidadeRetornada: result.encontrados,
      quantidadeEnriquecida: enriquecidos,
      quantidadeRejeitada: rejeitados,
      scoreMedio,
      quantidadeQuente: quentes,
      quantidadeMuitoQuente: muitoQuentes,
      tempoMs,
      pessoasEncontradas: personDisc.pessoasEncontradas,
      pessoasComWhatsapp: personDisc.pessoasComWhatsapp,
      pessoasComTelefone: personDisc.pessoasComTelefone,
      pessoasSemContato: personDisc.pessoasSemContato,
      personDiscoveryStatus: personDisc.status,
    },
  })

  if (pesquisaId) {
    const proxima = new Date(Date.now() + (90 * 60 * 1000))
    await updateDoc(doc(db, 'empresas', empresaId, COL_PESQUISAS, pesquisaId), {
      ultimaExecucao: serverTimestamp(),
      proximaExecucao: proxima,
      encontrados: result.encontrados,
      novos: result.novos,
      duplicados: result.duplicados,
      atualizadoEm: serverTimestamp(),
    }).catch(() => {})
  }

  return result
}

export const executarPesquisaMonitor = runLeadPipeline
