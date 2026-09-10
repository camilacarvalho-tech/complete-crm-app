import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_FONTES, FONTE_LIMITE_DIARIO_DEFAULT, FONTES_TIPOS } from '../constants'
import type { FontePesquisa, FontePesquisaTipo } from '../types'

export function fonteTipoLabel(tipo: FontePesquisaTipo): string { return FONTES_TIPOS.find((fonte) => fonte.id === tipo)?.label || tipo }
export function healthBadgeClass(health?: string): string {
  if (health === 'ok') return 'bg-emerald-100 text-emerald-700'
  if (health === 'error') return 'bg-red-100 text-red-700'
  if (health === 'degraded' || health === 'needs_credentials') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}
export async function seedFontesCatalogo(empresaId: string): Promise<void> {
  const existing = await getDocs(collection(db, 'empresas', empresaId, COL_FONTES))
  if (!existing.empty) return
  await Promise.all(FONTES_TIPOS.map((fonte) => setDoc(doc(collection(db, 'empresas', empresaId, COL_FONTES)), { empresaId, nome: fonte.label, tipo: fonte.id, status: 'inativa', limiteDiario: FONTE_LIMITE_DIARIO_DEFAULT, usadoHoje: 0, health: fonte.prontoSemCredencial ? 'idle' : 'needs_credentials', connectorId: fonte.id, connectorApiVersion: 1, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() } satisfies Omit<FontePesquisa, 'id'>)))
}
export async function updateFontePesquisa(empresaId: string, fonteId: string, patch: Partial<Omit<FontePesquisa, 'id' | 'empresaId' | 'criadoEm'>>): Promise<void> {
  await updateDoc(doc(db, 'empresas', empresaId, COL_FONTES, fonteId), { ...patch, empresaId, atualizadoEm: serverTimestamp() })
}
