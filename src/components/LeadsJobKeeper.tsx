import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { startJobWorkerLoop } from '../modules/leads-monitor/services/jobWorker'

/** O job fica no Firestore. Este loop segue enquanto o CRM estiver aberto, mesmo fora do Leads Monitor. */
export function LeadsJobKeeper() {
  const { usuario } = useAuth()
  const empresaId = usuario?.empresaId || ''
  useEffect(() => {
    if (!empresaId) return
    return startJobWorkerLoop(empresaId, 4000)
  }, [empresaId])
  return null
}
