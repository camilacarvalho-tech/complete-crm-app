import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_SEARCH_RUNS } from '../constants'
import { abortSearchExecution } from './searchCancel'

export async function requestSearchCancel(opts: {
  empresaId: string
  searchRunId: string
  processRunId?: string | null
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<void> {
  abortSearchExecution({ searchRunId: opts.searchRunId, processRunId: opts.processRunId })
  await updateDoc(doc(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS, opts.searchRunId), {
    status: 'cancelled',
    canceladoPor: opts.actor?.usuarioId || null,
    atualizadoEm: serverTimestamp(),
    finalizadoEm: serverTimestamp(),
  })
}
