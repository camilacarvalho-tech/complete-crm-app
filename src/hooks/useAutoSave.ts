/**
 * Auto-save com debounce — sincroniza alterações sem botão Salvar.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, serverTimestamp, updateDoc, DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { useEmpresaId } from './useEmpresaId'
import { useAuditLog } from './useAuditLog'

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions {
  collectionName: string
  docId: string | null | undefined
  data: DocumentData | null
  debounceMs?: number
  tela?: string
  enabled?: boolean
}

export function useAutoSave({
  collectionName,
  docId,
  data,
  debounceMs = 600,
  tela,
  enabled = true,
}: UseAutoSaveOptions) {
  const empresaId = useEmpresaId()
  const { log } = useAuditLog()
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerialized = useRef<string>('')
  const skipFirst = useRef(true)

  const flush = useCallback(
    async (payload: DocumentData) => {
      if (!empresaId || !docId) return
      setStatus('saving')
      try {
        await updateDoc(doc(db, 'empresas', empresaId, collectionName, docId), {
          ...payload,
          atualizadoEm: serverTimestamp(),
        })
        await log({
          acao: 'editar',
          entidade: collectionName,
          entidadeId: docId,
          tela: tela || collectionName,
          detalhes: { autoSave: true, depois: payload },
        })
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 1500)
      } catch (e) {
        console.error('[useAutoSave]', e)
        setStatus('error')
      }
    },
    [empresaId, docId, collectionName, log, tela]
  )

  useEffect(() => {
    if (!enabled || !empresaId || !docId || !data) return

    const serialized = JSON.stringify(data)
    if (skipFirst.current) {
      skipFirst.current = false
      lastSerialized.current = serialized
      return
    }
    if (serialized === lastSerialized.current) return

    lastSerialized.current = serialized
    setStatus('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flush(data), debounceMs)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [data, docId, empresaId, enabled, debounceMs, flush])

  useEffect(() => {
    skipFirst.current = true
    lastSerialized.current = ''
    setStatus('idle')
  }, [docId])

  return { status }
}

export function AutoSaveBadge({ status }: { status: AutoSaveStatus }) {
  if (status === 'idle') return null
  const map: Record<AutoSaveStatus, { text: string; className: string }> = {
    idle: { text: '', className: '' },
    pending: { text: 'Alterações pendentes…', className: 'text-code-warning' },
    saving: { text: 'Salvando…', className: 'text-code-info' },
    saved: { text: 'Salvo', className: 'text-code-success' },
    error: { text: 'Erro ao salvar', className: 'text-code-danger' },
  }
  const m = map[status]
  return <span className={`text-xs font-medium ${m.className}`}>{m.text}</span>
}
