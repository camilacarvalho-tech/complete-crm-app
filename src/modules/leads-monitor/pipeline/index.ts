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
import type { ConnectorFetchContext, NormalizedLead } from '../connectors/types'
import type { FiltrosPesquisa, MonitorRunResult, OportunidadeMonitor } from '../types'
import { getNexusAiQualifier } from '../ai/INexusAiQualifier'
import { recordConnectorFailure, recordConnectorSuccess } from '../services/healthStore'
import { omitUndefinedForFirestore } from '../services/jobQueue'
import { writeLeadsMonitorLog } from '../services/opsLogs'
import { mapPlacesSkipCode } from '../services/placesClient'
import { normalizeFromConnector } from './normalize'
import { collectDedupeKeys, buildDedupeKey, deduplicateLeads, matchExistingId } from './dedupe'
import { enrichLead } from './enrich'
import { temperaturaFromScore } from './score'

export interface PipelineRunOptions {
  empresaId: string
  filtros: FiltrosPesquisa
  pesquisaId?: string
  llmBudget?: number
  limitePorConector?: number
  enableEnrichment?: boolean
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
  ctx: ConnectorFetchContext
): Promise<{
  leads: NormalizedLead[]
  fontes: string[]
  rawCount: number
  skipped: ConnectorSkip[]
}> {
  const connectors = getRunnableConnectors()
  const batches = await Promise.all(
    connectors.map(async (connector) => {
      const t0 = Date.now()
      try {
        const raw = await connector.fetch(ctx)
        const normalized = normalizeFromConnector(connector, raw, ctx)
        await recordConnectorSuccess({
          empresaId: ctx.empresaId,
          connectorId: connector.meta.id,
          latencyMs: Date.now() - t0,
          connectorVersion: connector.meta.version,
        })
        return {
          label: connector.meta.label,
          leads: normalized.leads,
          rawCount: raw.length,
          skipped: undefined as ConnectorSkip | undefined,
        }
      } catch (e: any) {
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
        return {
          label: connector.meta.label,
          leads: [] as NormalizedLead[],
          rawCount: 0,
          skipped: {
            connectorId: connector.meta.id,
            label: connector.meta.label,
            code,
            message,
          } satisfies ConnectorSkip,
        }
      }
    })
  )

  return {
    leads: batches.flatMap((b) => b.leads),
    fontes: batches.filter((b) => b.leads.length > 0).map((b) => b.label),
    rawCount: batches.reduce((a, b) => a + b.rawCount, 0),
    skipped: batches.map((b) => b.skipped).filter((s): s is ConnectorSkip => Boolean(s)),
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
  } = opts

  const ctx: ConnectorFetchContext = {
    empresaId,
    filtros,
    limite: Math.min(MAX_RESULTS_PER_CYCLE, Math.max(1, limitePorConector)),
  }

  const { leads, fontes, rawCount, skipped } = await collectNormalized(ctx)
  const skipNotes = skipped.map((s) => `${s.label}: ${s.code} — ${s.message}`)

  const existing = await loadExisting(empresaId)
  const existingKeys = new Set(existing.flatMap((row) => row.keys))
  const { unicos, duplicados } = deduplicateLeads(leads, existingKeys)

  let enriquecidos = 0
  const leadsEnriquecidos = enableEnrichment
    ? await Promise.all(
        unicos.map(async (lead) => {
          const next = await enrichLead(lead, empresaId, { useLlm: false })
          if (next.dadosEnriquecidos?.cnpjValidado) enriquecidos += 1
          return next
        })
      )
    : unicos

  let novos = 0
  let budget = llmBudget
  const qualifier = getNexusAiQualifier()
  const scores: number[] = []
  let quentes = 0
  let muitoQuentes = 0
  let rejeitados = 0

  for (const lead of leadsEnriquecidos) {
    const existingId = matchExistingId(lead, existing)
    const scored = await qualifier.classifyAndScore(lead, {
      empresaId,
      filtros,
      useLlm: budget > 0,
    })
    if (budget > 0) budget -= 1
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

    await addDoc(
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
        },
        vezesEncontrada: 1,
        fontes: [lead.origemLabel || lead.connectorId],
        primeiraDescoberta: serverTimestamp(),
        ultimaDescoberta: serverTimestamp(),
        encontradoEm: serverTimestamp(),
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        dadosEnriquecidos: lead.dadosEnriquecidos ?? null,
      })
    )
    novos += 1
  }

  for (const dup of duplicados) {
    const existingId = matchExistingId(dup, existing)
    if (existingId) {
      await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, existingId), mergeLead(
        existing.find((e) => e.id === existingId)?.data || {},
        dup
      ))
    }
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
      source: fontes.join(',') || 'none',
      query: [filtros.palavraChave, filtros.segmento, filtros.cidade, filtros.estado].filter(Boolean).join(' '),
      cidade: filtros.cidade,
      estado: filtros.estado,
      timestamp: new Date().toISOString(),
      status: osmSkip ? osmSkip.code : googleSkip ? 'optional_indisponivel' : 'ok',
      skipped: skipped.map((s) => ({ connectorId: s.connectorId, code: s.code })),
      quantidadeRetornada: result.encontrados,
      quantidadeNova: result.novos,
      quantidadeDuplicada: result.duplicados,
      quantidadeEnriquecida: enriquecidos,
      quantidadeRejeitada: rejeitados,
      scoreMedio,
      quantidadeQuente: quentes,
      quantidadeMuitoQuente: muitoQuentes,
      tempoMs,
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
