import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_FONTES, COL_SEARCH_RUNS } from '../constants'
import { enqueueJob } from '../services/jobQueue'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import type { FiltrosPesquisa } from '../types'
import { normalizeFiltros } from './filters'

export async function startIntelligentSearch(opts: {
  empresaId: string
  filtros: FiltrosPesquisa
  pesquisaId?: string | null
  processRunId?: string | null
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<{ searchRunId: string; jobId: string; fontesIds: string[] }> {
  const fontesSnap = await getDocs(query(collection(db, 'empresas', opts.empresaId, COL_FONTES), where('status', '==', 'ativa')))
  const fontesIds = fontesSnap.docs.map((item) => item.id)
  const filtros = normalizeFiltros(opts.filtros)
  const runRef = await addDoc(collection(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS), {
    empresaId: opts.empresaId,
    filtros,
    fontesIds,
    processRunId: opts.processRunId || null,
    usuarioId: opts.actor?.usuarioId || null,
    usuarioNome: opts.actor?.usuarioNome || null,
    status: 'queued',
    progresso: {
      percent: 0,
      etapa: 'Na fila',
      fontesConcluidas: 0,
      fontesTotal: fontesIds.length,
      encontrados: 0,
      novos: 0,
      duplicados: 0,
      tempoMs: 0,
    },
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  const pesquisaId =
    typeof opts.pesquisaId === 'string' && opts.pesquisaId.trim() ? opts.pesquisaId.trim() : null
  const jobId = await enqueueJob({
    empresaId: opts.empresaId,
    type: 'search_inteligente',
    payload: {
      filtros,
      fontesIds,
      searchRunId: runRef.id,
      pesquisaId,
      processRunId: opts.processRunId || undefined,
    },
    idempotencyKey: `search:${opts.empresaId}:${runRef.id}`,
    actor: opts.actor,
  })
  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'search.start',
    origem: 'ui',
    usuarioId: opts.actor?.usuarioId,
    usuarioNome: opts.actor?.usuarioNome,
    entidade: 'search_run',
    entidadeId: runRef.id,
    after: { jobId, fontesIds, filtros: { estado: filtros.estado, cidade: filtros.cidade, abrangencia: filtros.abrangenciaGeografica } },
  })
  return { searchRunId: runRef.id, jobId, fontesIds }
}

export async function requestSearchCancel(opts: { empresaId: string; searchRunId: string; actor?: { usuarioId?: string; usuarioNome?: string } }): Promise<void> {
  const { requestSearchCancel: cancel } = await import('./SearchProgress')
  await cancel(opts)
}
