/**
 * Coleção multi-tenant em tempo real: empresas/{empresaId}/{collection}
 */
import { useCallback, useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  QueryConstraint,
  query,
  serverTimestamp,
  updateDoc,
  DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useEmpresaId } from './useEmpresaId'
import { useAuditLog } from './useAuditLog'

export interface TenantDoc {
  id: string
  [key: string]: any
}

export function useTenantCollection<T extends TenantDoc = TenantDoc>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options?: { tela?: string; enabled?: boolean }
) {
  const empresaId = useEmpresaId()
  const { log } = useAuditLog()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const enabled = options?.enabled !== false
  const tela = options?.tela || collectionName

  useEffect(() => {
    if (!empresaId || !enabled) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    const colRef = collection(db, 'empresas', empresaId, collectionName)
    const q = constraints.length ? query(colRef, ...constraints) : colRef

    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)))
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error(`[useTenantCollection:${collectionName}]`, err)
        setError(err.message)
        setLoading(false)
      }
    )
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, collectionName, enabled, JSON.stringify(constraints.map(String))])

  const create = useCallback(
    async (data: DocumentData) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      const ref = await addDoc(collection(db, 'empresas', empresaId, collectionName), {
        ...data,
        empresaId,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      })
      await log({
        acao: 'criar',
        entidade: collectionName,
        entidadeId: ref.id,
        tela,
        detalhes: { depois: data },
      })
      return ref.id
    },
    [empresaId, collectionName, log, tela]
  )

  const update = useCallback(
    async (id: string, data: DocumentData, antes?: DocumentData) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      await updateDoc(doc(db, 'empresas', empresaId, collectionName, id), {
        ...data,
        atualizadoEm: serverTimestamp(),
      })
      await log({
        acao: 'editar',
        entidade: collectionName,
        entidadeId: id,
        tela,
        detalhes: { antes, depois: data },
      })
    },
    [empresaId, collectionName, log, tela]
  )

  const remove = useCallback(
    async (id: string, antes?: DocumentData) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      await deleteDoc(doc(db, 'empresas', empresaId, collectionName, id))
      await log({
        acao: 'excluir',
        entidade: collectionName,
        entidadeId: id,
        tela,
        detalhes: { antes },
      })
    },
    [empresaId, collectionName, log, tela]
  )

  return { items, loading, error, empresaId, create, update, remove }
}
