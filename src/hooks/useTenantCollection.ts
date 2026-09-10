import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, type CollectionReference } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

type TenantOptions = { tela?: string }
type TenantItem = { id: string }
type TenantState<T extends TenantItem> = {
  items: T[]; loading: boolean; error: string | null; empresaId: string | null
  create: (data: Omit<T, 'id'>) => Promise<string>
  update: (id: string, data: Partial<Omit<T, 'id'>>) => Promise<void>
  remove: (id: string, _item?: T) => Promise<void>
}

export function useTenantCollection(collectionName: string, empresaId?: string): CollectionReference
export function useTenantCollection<T extends TenantItem>(collectionName: string, initial: T[], options?: TenantOptions): TenantState<T>
export function useTenantCollection<T extends TenantItem>(collectionName: string, empresaIdOrInitial?: string | T[], _options?: TenantOptions): CollectionReference | TenantState<T> {
  const monitorMode = Array.isArray(empresaIdOrInitial)
  const initial = (monitorMode ? empresaIdOrInitial : []) as T[]
  const explicitEmpresaId = typeof empresaIdOrInitial === 'string' ? empresaIdOrInitial : undefined
  const { usuario } = useAuth()
  const empresaId = monitorMode ? usuario?.empresaId || null : explicitEmpresaId || null
  const [items, setItems] = useState<T[]>(initial)
  const [loading, setLoading] = useState(monitorMode)
  const [error, setError] = useState<string | null>(null)
  const ref = useMemo(() => empresaId ? collection(db, 'empresas', empresaId, collectionName) : collection(db, collectionName), [collectionName, empresaId])

  useEffect(() => {
    if (!monitorMode) return
    if (!empresaId) { setItems(initial); setLoading(false); setError('Empresa não identificada'); return }
    setLoading(true); setError(null)
    return onSnapshot(ref, (snapshot) => { setItems(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<T, 'id'>) }))); setLoading(false) }, (snapshotError) => { setError(snapshotError.message); setLoading(false) })
  }, [monitorMode, empresaId, ref])

  if (!monitorMode) return ref
  return {
    items, loading, error, empresaId,
    create: async (data) => { if (!empresaId) throw new Error('Empresa não identificada'); const created = await addDoc(ref, { ...data, empresaId, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() }); return created.id },
    update: async (id, data) => { if (!empresaId) throw new Error('Empresa não identificada'); await updateDoc(doc(db, 'empresas', empresaId, collectionName, id), { ...data, atualizadoEm: serverTimestamp() }) },
    remove: async (id) => { if (!empresaId) throw new Error('Empresa não identificada'); await deleteDoc(doc(db, 'empresas', empresaId, collectionName, id)) },
  }
}
