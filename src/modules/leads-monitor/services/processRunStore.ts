import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_PROCESS_RECORDS, COL_PROCESS_RUNS } from '../constants'
import { omitUndefinedForFirestore } from './jobQueue'
import { writeLeadsMonitorAudit } from './auditTrail'
import { writeLeadsMonitorLog } from './opsLogs'
import type { ProcessRun, ProcessRunStatus, ProcessRunTipo } from '../types/processRun'

function recId(processRunId: string, rowIndex: number) {
  return `${processRunId}_${String(rowIndex).padStart(6, '0')}`
}

export async function createProcessRun(opts: {
  empresaId: string
  nome: string
  tipo: ProcessRunTipo
  origem: string
  total?: number
  arquivoNome?: string
  mapping?: Record<string, string>
  searchRunId?: string | null
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<string> {
  const ref = doc(collection(db, 'empresas', opts.empresaId, COL_PROCESS_RUNS))
  await setDoc(
    ref,
    omitUndefinedForFirestore({
      empresaId: opts.empresaId,
      nome: opts.nome,
      tipo: opts.tipo,
      origem: opts.origem,
      status: 'aguardando' as ProcessRunStatus,
      total: opts.total || 0,
      processados: 0,
      validos: 0,
      invalidos: 0,
      duplicados: 0,
      enriquecidos: 0,
      pessoasEncontradas: 0,
      qualificados: 0,
      aprovados: 0,
      rejeitados: 0,
      erros: 0,
      etapaAtual: 'Recebimento',
      progresso: 0,
      cursor: 0,
      searchRunId: opts.searchRunId || null,
      mapping: opts.mapping || null,
      arquivoNome: opts.arquivoNome || null,
      lastError: null,
      usuarioId: opts.actor?.usuarioId || null,
      usuarioNome: opts.actor?.usuarioNome || null,
      criadoEm: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startedAt: null,
      completedAt: null,
    })
  )
  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'monitor.job.started',
    origem: 'ui',
    usuarioId: opts.actor?.usuarioId,
    usuarioNome: opts.actor?.usuarioNome,
    entidade: 'process_run',
    entidadeId: ref.id,
    after: { tipo: opts.tipo, origem: opts.origem, nome: opts.nome },
  })
  return ref.id
}

export async function patchProcessRun(
  empresaId: string,
  runId: string,
  patch: Record<string, unknown>
) {
  await updateDoc(
    doc(db, 'empresas', empresaId, COL_PROCESS_RUNS, runId),
    omitUndefinedForFirestore({ ...patch, updatedAt: serverTimestamp() })
  )
}

export async function ingestMappedRows(opts: {
  empresaId: string
  processRunId: string
  rows: Record<string, string>[]
}): Promise<number> {
  const { empresaId, processRunId, rows } = opts
  const col = collection(db, 'empresas', empresaId, COL_PROCESS_RECORDS)
  let written = 0
  const CHUNK = 400
  for (let start = 0; start < rows.length; start += CHUNK) {
    const batch = writeBatch(db)
    const slice = rows.slice(start, start + CHUNK)
    slice.forEach((mapped, offset) => {
      const rowIndex = start + offset
      const ref = doc(col, recId(processRunId, rowIndex))
      batch.set(
        ref,
        omitUndefinedForFirestore({
          empresaId,
          processRunId,
          rowIndex,
          mapped,
          raw: mapped,
          status: 'pendente',
          validation: 'PENDENTE',
          opportunityId: null,
          duplicateOf: null,
          duplicateReason: null,
          lastError: null,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        })
      )
      written += 1
    })
    await batch.commit()
  }
  await patchProcessRun(empresaId, processRunId, {
    total: rows.length,
    etapaAtual: 'Recebimento',
  })
  await writeLeadsMonitorLog({
    empresaId,
    level: 'info',
    message: `Base recebida: ${rows.length}`,
    meta: { processRunId, etapa: 'recebimento' },
  })
  return written
}

export async function setProcessControl(opts: {
  empresaId: string
  runId: string
  status: ProcessRunStatus
  actor?: { usuarioId?: string; usuarioNome?: string }
}) {
  const patch: Record<string, unknown> = { status: opts.status }
  if (opts.status === 'processando') {
    patch.startedAt = serverTimestamp()
    patch.etapaAtual = 'Normalização'
  }
  if (opts.status === 'cancelado' || opts.status === 'pausado') {
    patch.completedAt = opts.status === 'cancelado' ? serverTimestamp() : null
  }
  await patchProcessRun(opts.empresaId, opts.runId, patch)
  const action =
    opts.status === 'pausado'
      ? 'monitor.job.paused'
      : opts.status === 'processando'
        ? 'monitor.job.resumed'
        : opts.status === 'cancelado'
          ? 'monitor.job.failed'
          : 'monitor.job.started'
  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action,
    origem: 'ui',
    usuarioId: opts.actor?.usuarioId,
    usuarioNome: opts.actor?.usuarioNome,
    entidade: 'process_run',
    entidadeId: opts.runId,
    after: { status: opts.status },
  })
}

export async function retryErrorRecords(empresaId: string, runId: string): Promise<number> {
  const recs = await getDocs(
    query(collection(db, 'empresas', empresaId, COL_PROCESS_RECORDS), where('processRunId', '==', runId))
  )
  const errors = recs.docs.filter((d) => d.data().status === 'erro')
  if (!errors.length) return 0
  const minIdx = Math.min(...errors.map((d) => Number(d.data().rowIndex || 0)))
  const CHUNK = 400
  for (let i = 0; i < errors.length; i += CHUNK) {
    const batch = writeBatch(db)
    errors.slice(i, i + CHUNK).forEach((d) =>
      batch.update(d.ref, { status: 'pendente', lastError: null, atualizadoEm: serverTimestamp() })
    )
    await batch.commit()
  }
  await patchProcessRun(empresaId, runId, {
    status: 'processando',
    cursor: minIdx,
    etapaAtual: 'Validação',
    completedAt: null,
  })
  return errors.length
}

export async function deleteProcessRun(empresaId: string, runId: string) {
  const recs = await getDocs(
    query(collection(db, 'empresas', empresaId, COL_PROCESS_RECORDS), where('processRunId', '==', runId))
  )
  const CHUNK = 400
  const docs = recs.docs
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = writeBatch(db)
    docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'empresas', empresaId, COL_PROCESS_RUNS, runId))
}

export { recId as processRecordId }
