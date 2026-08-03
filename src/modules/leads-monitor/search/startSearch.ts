/**
 * API de início/cancelamento da busca inteligente (UI não bloqueia).
 */
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_FONTES } from '../constants'
import { enqueueJob } from '../services/jobQueue'
import { seedFontesCatalogo } from '../services/fontesStore'
import { normalizeFiltros } from './filters'
import {
  attachJobToSearchRun,
  createSearchRun,
  requestSearchCancel,
} from './SearchProgress'
import type { FiltrosPesquisa, FontePesquisa } from '../types'

export async function startIntelligentSearch(opts: {
  empresaId: string
  filtros: FiltrosPesquisa
  pesquisaId?: string
  fontesIds?: string[]
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<{ searchRunId: string; jobId: string; fontesIds: string[] }> {
  const { empresaId, actor } = opts
  if (!empresaId) throw new Error('empresaId obrigatório')

  // Garante catálogo mínimo (idempotente)
  await seedFontesCatalogo({ empresaId, actor })

  let fontesIds = opts.fontesIds
  if (!fontesIds?.length) {
    const snap = await getDocs(collection(db, 'empresas', empresaId, COL_FONTES))
    fontesIds = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<FontePesquisa, 'id'>) }))
      .filter((f) => f.status === 'ativa')
      .map((f) => f.id)
  }

  // Se nenhuma ativa, ainda cria run com todas (engine pula inativas / needs_credentials)
  if (!fontesIds.length) {
    const snap = await getDocs(collection(db, 'empresas', empresaId, COL_FONTES))
    fontesIds = snap.docs.map((d) => d.id)
  }

  const filtros = normalizeFiltros(opts.filtros)
  const searchRunId = await createSearchRun({
    empresaId,
    filtros,
    fontesIds,
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
  })

  const jobId = await enqueueJob({
    empresaId,
    type: 'search_inteligente',
    payload: {
      filtros,
      fontesIds,
      searchRunId,
      pesquisaId: opts.pesquisaId,
    },
    actor,
  })

  await attachJobToSearchRun(empresaId, searchRunId, jobId)
  return { searchRunId, jobId, fontesIds }
}

export { requestSearchCancel }
