/**
 * Fontes de Pesquisa (V1.2) — CRUD multi-tenant + seed de catálogo.
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
import {
  COL_FONTES,
  FONTE_LIMITE_DIARIO_DEFAULT,
  FONTES_TIPOS,
} from '../constants'
import { writeLeadsMonitorAudit } from './auditTrail'
import type {
  FonteHealthStatus,
  FontePesquisa,
  FontePesquisaStatus,
  FontePesquisaTipo,
} from '../types'

function defaultHealth(tipo: FontePesquisaTipo): FonteHealthStatus {
  const meta = FONTES_TIPOS.find((t) => t.id === tipo)
  if (meta?.prontoSemCredencial) return 'idle'
  return 'needs_credentials'
}

function defaultStatus(tipo: FontePesquisaTipo): FontePesquisaStatus {
  const meta = FONTES_TIPOS.find((t) => t.id === tipo)
  return meta?.prontoSemCredencial ? 'ativa' : 'inativa'
}

function connectorIdFor(tipo: FontePesquisaTipo): string | undefined {
  if (tipo === 'webhook') return 'webhook'
  if (tipo === 'api_externa') return 'integracao_api'
  if (tipo === 'csv') return 'csv_import'
  if (tipo === 'google_places') return 'google_places'
  if (tipo === 'google_maps') return 'google_places'
  return undefined
}

export async function seedFontesCatalogo(opts: {
  empresaId: string
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<number> {
  const { empresaId, actor } = opts
  if (!empresaId) return 0

  const col = collection(db, 'empresas', empresaId, COL_FONTES)
  const snap = await getDocs(col)
  const existingTipos = new Set(
    snap.docs.map((d) => (d.data() as FontePesquisa).tipo).filter(Boolean)
  )

  let created = 0
  for (const t of FONTES_TIPOS) {
    if (existingTipos.has(t.id)) continue
    const ref = await addDoc(col, {
      empresaId,
      nome: t.label,
      tipo: t.id,
      status: defaultStatus(t.id),
      limiteDiario: FONTE_LIMITE_DIARIO_DEFAULT,
      usadoHoje: 0,
      health: defaultHealth(t.id),
      errosRecentes: [],
      config: {},
      secretRef: null,
      connectorId: connectorIdFor(t.id) || null,
      connectorApiVersion: 1,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    await writeLeadsMonitorAudit({
      empresaId,
      action: 'fonte.create',
      origem: 'system',
      usuarioId: actor?.usuarioId,
      usuarioNome: actor?.usuarioNome,
      entidade: 'fonte',
      entidadeId: ref.id,
      after: { tipo: t.id, nome: t.label },
    })
    created += 1
  }
  return created
}

export async function updateFontePesquisa(opts: {
  empresaId: string
  fonteId: string
  patch: Partial<
    Pick<
      FontePesquisa,
      'nome' | 'status' | 'limiteDiario' | 'health' | 'config' | 'usadoHoje'
    >
  >
  before?: Partial<FontePesquisa>
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<void> {
  const { empresaId, fonteId, patch, before, actor } = opts
  await updateDoc(doc(db, 'empresas', empresaId, COL_FONTES, fonteId), {
    ...patch,
    atualizadoEm: serverTimestamp(),
  })
  await writeLeadsMonitorAudit({
    empresaId,
    action: 'fonte.update',
    origem: 'ui',
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'fonte',
    entidadeId: fonteId,
    before: before as Record<string, unknown> | undefined,
    after: patch as Record<string, unknown>,
  })
}

export function fonteTipoLabel(tipo: FontePesquisaTipo): string {
  return FONTES_TIPOS.find((t) => t.id === tipo)?.label || tipo
}

export function healthBadgeClass(health: FonteHealthStatus): string {
  switch (health) {
    case 'ok':
      return 'bg-emerald-500/15 text-emerald-600'
    case 'degraded':
      return 'bg-amber-500/15 text-amber-600'
    case 'error':
      return 'bg-red-500/15 text-red-600'
    case 'needs_credentials':
      return 'bg-violet-500/15 text-violet-600'
    default:
      return 'bg-slate-500/15 text-slate-500'
  }
}
