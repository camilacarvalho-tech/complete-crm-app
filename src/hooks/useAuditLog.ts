/**
 * Auditoria multi-tenant: empresas/{empresaId}/auditoria
 */
import { useCallback } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useEmpresaId } from './useEmpresaId'

export interface AuditPayload {
  acao: 'criar' | 'editar' | 'excluir' | 'login' | 'logout' | string
  entidade: string
  entidadeId?: string
  tela?: string
  detalhes?: Record<string, unknown>
}

export function useAuditLog() {
  const { usuario, user } = useAuth()
  const empresaId = useEmpresaId()

  const log = useCallback(
    async (payload: AuditPayload) => {
      if (!empresaId) return
      try {
        await addDoc(collection(db, 'empresas', empresaId, 'auditoria'), {
          ...payload,
          usuarioId: user?.uid || usuario?.id || 'anon',
          usuarioNome: usuario?.nome || user?.email || 'Sistema',
          empresaId,
          data: new Date().toISOString().slice(0, 10),
          hora: new Date().toTimeString().slice(0, 8),
          timestamp: serverTimestamp(),
        })
      } catch (e) {
        console.warn('[audit]', e)
      }
    },
    [empresaId, usuario, user]
  )

  return { log }
}
