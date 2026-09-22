import { useEffect, useState } from 'react'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { GhostButton } from '../../components/nexus/kit'
import { COL_CRM_ERP_SYNC } from './crmSync'
import { COL_CRM_ERP_EVENTS } from '../events/eventBus'
import { getNxErpHealthAdapter } from '../adapters/erpProvider'
import { statusLabel, type ErpHealthResult, type NxErpConnectionStatus } from '../erp/connectionStatus'

function formatCheckedAt(iso: string | null): string {
  if (!iso) return '--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('pt-BR')
}

export function NxErpStatusPanel({ empresaId }: { empresaId?: string | null }) {
  const [connection, setConnection] = useState<NxErpConnectionStatus>('NOT_CONFIGURED')
  const [health, setHealth] = useState<ErpHealthResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [leads, setLeads] = useState(0)
  const [clientes, setClientes] = useState(0)
  const [eventos, setEventos] = useState(0)

  useEffect(() => {
    if (!empresaId) return
    void (async () => {
      const syncSnap = await getDocs(query(collection(db, 'empresas', empresaId, COL_CRM_ERP_SYNC), limit(200)))
      const evSnap = await getDocs(query(collection(db, 'empresas', empresaId, COL_CRM_ERP_EVENTS), limit(200)))
      const crmIds = new Set(syncSnap.docs.map((d) => String(d.data().crmId || d.id)))
      setLeads(syncSnap.size)
      setClientes(crmIds.size)
      setEventos(evSnap.size)
    })()
  }, [empresaId])

  async function testarConexao() {
    setTesting(true)
    setConnection('CONNECTING')
    try {
      const result = await getNxErpHealthAdapter().healthCheck()
      setHealth(result)
      setConnection(result.connection)
    } catch {
      setHealth(null)
      setConnection('ERROR')
    } finally {
      setTesting(false)
    }
  }

  const mode = health?.mode === 'real' && connection === 'CONNECTED' ? 'Real' : 'Mock'
  const api = health?.apiConfigured ? 'Configurada no backend' : 'Não configurada'
  const ambiente = connection === 'CONNECTED' ? 'Produção' : 'Mock'

  return (
    <div className="nexus-card p-4 text-sm space-y-2 max-w-xl">
      <p className="font-semibold">NX ERP</p>
      <p>
        Status:
        <br />
        <b>{testing ? '● Conectando' : health ? health.label : statusLabel(connection)}</b>
      </p>
      <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
        {health?.description || 'Configure a conexão do NX ERP para ativá-la.'}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <p>
          Modo
          <br />
          <b>{mode}</b>
        </p>
        <p>
          Ambiente
          <br />
          <b>{ambiente}</b>
        </p>
        <p>
          API
          <br />
          <b>{api}</b>
        </p>
        <p>
          Última verificação
          <br />
          <b>{formatCheckedAt(health?.checkedAt || null)}</b>
        </p>
        <p>
          Leads sincronizados
          <br />
          <b>{leads}</b>
        </p>
        <p>
          Clientes sincronizados
          <br />
          <b>{clientes}</b>
        </p>
        <p>
          Eventos processados
          <br />
          <b>{eventos}</b>
        </p>
      </div>
      <GhostButton type="button" disabled={testing} onClick={() => void testarConexao()}>
        {testing ? 'Testando…' : 'Testar conexão'}
      </GhostButton>
    </div>
  )
}
