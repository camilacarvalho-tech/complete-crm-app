/**
 * Controle independente dos 5 robôs do Monitor.
 * Persiste intenção (running/paused) em leadsMonitorConfig/robots.
 * Workers consultam isRobotPaused antes de iniciar o próximo job — não duplica filas.
 */
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_CONFIG } from '../constants'
import { writeLeadsMonitorAudit } from './auditTrail'
import { writeLeadsMonitorLog } from './opsLogs'
import type { JobType } from './jobQueue'
import type { RobotKind } from '../types/robot'

export type RobotControlKey = 'search' | 'enrichment' | 'classification' | 'crm' | 'followup'
export type RobotIntent = 'running' | 'paused' | 'idle'

export const ROBOT_CONTROL_KEYS: RobotControlKey[] = [
  'search',
  'enrichment',
  'classification',
  'crm',
  'followup',
]

export const ROBOT_KIND_TO_KEY: Record<RobotKind, RobotControlKey> = {
  busca: 'search',
  enriquecimento: 'enrichment',
  classificacao: 'classification',
  crm: 'crm',
  followup: 'followup',
}

export const ROBOT_KEY_TO_KIND: Record<RobotControlKey, RobotKind> = {
  search: 'busca',
  enrichment: 'enriquecimento',
  classification: 'classificacao',
  crm: 'crm',
  followup: 'followup',
}

export const ROBOT_LABEL: Record<RobotControlKey, string> = {
  search: 'Robô de Busca',
  enrichment: 'Robô de Enriquecimento',
  classification: 'Robô de Classificação',
  crm: 'Robô CRM',
  followup: 'Robô de Follow-up',
}

export interface RobotControlState {
  search: RobotIntent
  enrichment: RobotIntent
  classification: RobotIntent
  crm: RobotIntent
  followup: RobotIntent
  updatedAt?: unknown
  lastAction?: string
  lastActorNome?: string
}

export const DEFAULT_ROBOT_CONTROL: RobotControlState = {
  search: 'running',
  enrichment: 'running',
  classification: 'running',
  crm: 'running',
  followup: 'idle',
}

const cache = new Map<string, { at: number; state: RobotControlState }>()
const CACHE_MS = 1500

function robotsRef(empresaId: string) {
  return doc(db, 'empresas', empresaId, COL_CONFIG, 'robots')
}

function asIntent(v: unknown, fallback: RobotIntent): RobotIntent {
  return v === 'paused' || v === 'running' || v === 'idle' ? v : fallback
}

export function normalizeRobotControl(raw?: Record<string, unknown> | null): RobotControlState {
  const d = raw || {}
  return {
    search: asIntent(d.search, 'running'),
    enrichment: asIntent(d.enrichment, 'running'),
    classification: asIntent(d.classification, 'running'),
    crm: asIntent(d.crm, 'running'),
    followup: asIntent(d.followup, 'idle'),
    updatedAt: d.updatedAt,
    lastAction: typeof d.lastAction === 'string' ? d.lastAction : undefined,
    lastActorNome: typeof d.lastActorNome === 'string' ? d.lastActorNome : undefined,
  }
}

export async function loadRobotControl(empresaId: string): Promise<RobotControlState> {
  const hit = cache.get(empresaId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.state
  const snap = await getDoc(robotsRef(empresaId))
  const state = normalizeRobotControl(snap.exists() ? (snap.data() as Record<string, unknown>) : null)
  cache.set(empresaId, { at: Date.now(), state })
  return state
}

export function subscribeRobotControl(
  empresaId: string,
  cb: (state: RobotControlState) => void
): () => void {
  return onSnapshot(robotsRef(empresaId), (snap) => {
    const state = normalizeRobotControl(snap.exists() ? (snap.data() as Record<string, unknown>) : null)
    cache.set(empresaId, { at: Date.now(), state })
    cb(state)
  })
}

export async function isRobotPaused(empresaId: string, key: RobotControlKey): Promise<boolean> {
  const state = await loadRobotControl(empresaId)
  return state[key] === 'paused'
}

export function jobTypesForRobot(key: RobotControlKey): JobType[] {
  if (key === 'search') return ['search', 'search_inteligente', 'import_csv', 'people_search', 'drain_inbox']
  return []
}

export function skipJobTypesForPaused(state: RobotControlState): JobType[] {
  const skip: JobType[] = []
  if (state.search === 'paused') skip.push(...jobTypesForRobot('search'))
  return skip
}

export async function setRobotIntent(opts: {
  empresaId: string
  key: RobotControlKey
  intent: RobotIntent
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<RobotControlState> {
  const current = await loadRobotControl(opts.empresaId)
  if (opts.key === 'followup' && opts.intent === 'running') {
    const next = { ...current, followup: 'idle' as RobotIntent }
    cache.set(opts.empresaId, { at: Date.now(), state: next })
    return next
  }
  const next: RobotControlState = {
    ...current,
    [opts.key]: opts.intent,
    lastAction: `${opts.intent}:${opts.key}`,
    lastActorNome: opts.actor?.usuarioNome,
  }
  await setDoc(
    robotsRef(opts.empresaId),
    {
      search: next.search,
      enrichment: next.enrichment,
      classification: next.classification,
      crm: next.crm,
      followup: next.followup,
      lastAction: next.lastAction,
      lastActorNome: next.lastActorNome || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  cache.set(opts.empresaId, { at: 0, state: next })
  const verb = opts.intent === 'paused' ? 'pausou' : opts.intent === 'running' ? 'retomou' : 'atualizou'
  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: opts.intent === 'paused' ? 'robot.pause' : 'robot.resume',
    origem: 'ui',
    usuarioId: opts.actor?.usuarioId,
    usuarioNome: opts.actor?.usuarioNome,
    entidade: 'robot',
    entidadeId: opts.key,
    before: { [opts.key]: current[opts.key] },
    after: { [opts.key]: opts.intent },
  })
  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: 'info',
    message: `Usuário ${verb} ${ROBOT_LABEL[opts.key]}.`,
    meta: { robot: opts.key, intent: opts.intent },
  })
  return next
}

export async function assertRobotNotPaused(empresaId: string, key: RobotControlKey, message: string) {
  if (await isRobotPaused(empresaId, key)) throw new Error(message)
}
