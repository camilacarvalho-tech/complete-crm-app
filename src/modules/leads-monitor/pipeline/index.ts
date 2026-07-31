/**
 * Orquestrador do pipeline (núcleo).
 *
 * Fluxo fixo:
 *   Conector → Normalização → Deduplicação → Classificação (Nexus AI) → Score → Persistência (aguarda aprovação)
 *
 * Aprovação e Envio ao CRM são etapas seguintes, acionadas pelo usuário
 * (pipeline/approve.ts + pipeline/sendToCrm.ts) — sem acoplamento a fontes.
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
import { COL_OPORTUNIDADES, COL_PESQUISAS } from '../constants'
import { bootstrapConnectors, getRunnableConnectors } from '../connectors'
import type { ConnectorFetchContext, NormalizedLead } from '../connectors/types'
import type { FiltrosPesquisa, MonitorRunResult, OportunidadeMonitor } from '../types'
import { getNexusAiQualifier } from '../ai/INexusAiQualifier'
import { recordConnectorFailure, recordConnectorSuccess } from '../services/healthStore'
import { normalizeFromConnector } from './normalize'
import { buildDedupeKey, deduplicateLeads } from './dedupe'

export interface PipelineRunOptions {
  empresaId: string
  filtros: FiltrosPesquisa
  pesquisaId?: string
  /** Orçamento de chamadas LLM na classificação (0 = só heurística). */
  llmBudget?: number
  limitePorConector?: number
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

/** Etapa 1+2: fetch de cada conector + normalize */
async function collectNormalized(
  ctx: ConnectorFetchContext
): Promise<{ leads: NormalizedLead[]; fontes: string[]; rawCount: number }> {
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
        }
      } catch (e: any) {
        console.warn(`[leads-monitor] conector ${connector.meta.id} falhou`, e)
        await recordConnectorFailure({
          empresaId: ctx.empresaId,
          connectorId: connector.meta.id,
          error: e?.message || String(e),
          latencyMs: Date.now() - t0,
          connectorVersion: connector.meta.version,
        })
        return { label: connector.meta.label, leads: [] as NormalizedLead[], rawCount: 0 }
      }
    })
  )

  return {
    leads: batches.flatMap((b) => b.leads),
    fontes: batches.filter((b) => b.leads.length > 0).map((b) => b.label),
    rawCount: batches.reduce((a, b) => a + b.rawCount, 0),
  }
}

/**
 * Executa o pipeline até persistir oportunidades com status `novo`
 * (prontas para Aprovação → Envio ao CRM).
 */
export async function runLeadPipeline(opts: PipelineRunOptions): Promise<MonitorRunResult> {
  bootstrapConnectors()

  const {
    empresaId,
    filtros,
    pesquisaId,
    llmBudget = 3,
    limitePorConector = 10,
  } = opts

  const ctx: ConnectorFetchContext = {
    empresaId,
    filtros,
    limite: limitePorConector,
  }

  // 1–2. Conector → Normalização
  const { leads, fontes, rawCount } = await collectNormalized(ctx)

  // 3. Deduplicação
  const existingKeys = await loadExistingDedupeKeys(empresaId)
  const { unicos, duplicados } = deduplicateLeads(leads, existingKeys)

  // 4–5. Classificação Nexus AI → Score → persistência (via INexusAiQualifier)
  let novos = 0
  let budget = llmBudget
  const qualifier = getNexusAiQualifier()

  for (const lead of unicos) {
    const scored = await qualifier.classifyAndScore(lead, {
      empresaId,
      filtros,
      useLlm: budget > 0,
    })
    if (budget > 0) budget -= 1

    await addDoc(collection(db, 'empresas', empresaId, COL_OPORTUNIDADES), {
      ...lead,
      /** @deprecated prefer connectorId — mantido para compatibilidade de leitura */
      origemFonte: lead.connectorId,
      empresaId,
      status: 'novo',
      score: scored.score,
      temperatura: scored.temperatura,
      classificacao: scored.classificacao,
      categoriaClassificacao: scored.categoria || scored.classificacao,
      motivosScore: scored.motivos,
      origemScore: scored.origemScore,
      pesquisaId: pesquisaId || null,
      encontradoEm: serverTimestamp(),
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    novos += 1
  }

  if (pesquisaId) {
    await updateDoc(doc(db, 'empresas', empresaId, COL_PESQUISAS, pesquisaId), {
      ultimaExecucao: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    }).catch(() => {})
  }

  return {
    encontrados: rawCount || leads.length,
    novos,
    duplicados: duplicados.length,
    fontes,
  }
}

/** Alias estável usado pelo hook / UI */
export const executarPesquisaMonitor = runLeadPipeline
