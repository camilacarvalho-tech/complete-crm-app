import { useEffect, useState } from 'react'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { canManageIntegrations } from '../../lib/nexusCore'
import { FormField, GhostButton, PrimaryButton, SelectInput, TextInput } from '../../components/nexus/kit'
import { useToast } from '../../components/ui/Toast'
import { COL_CRM_ERP_SYNC } from './crmSync'
import { COL_CRM_ERP_EVENTS } from '../events/eventBus'
import { statusLabel, type ErpHealthResult, type NxErpConnectionStatus } from '../erp/connectionStatus'
import {
  ambienteLabel,
  generateInboundCrmKey,
  loadNxErpCrmConfig,
  saveNxErpCrmConfig,
  testNxErpHealth,
  tokenMask,
  type NxErpAmbiente,
  type NxErpModo,
} from '../erp/nxErpCrmClient'

function formatCheckedAt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

export function NxErpStatusPanel({ empresaId }: { empresaId?: string | null }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const canEdit = canManageIntegrations(usuario?.perfil)
  const [connection, setConnection] = useState<NxErpConnectionStatus>('NOT_CONFIGURED')
  const [health, setHealth] = useState<ErpHealthResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [leads, setLeads] = useState(0)
  const [clientes, setClientes] = useState(0)
  const [eventos, setEventos] = useState(0)
  const [apiUrl, setApiUrl] = useState('')
  const [token, setToken] = useState('')
  const [tokenHint, setTokenHint] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [ambiente, setAmbiente] = useState<NxErpAmbiente>('producao')
  const [modo, setModo] = useState<NxErpModo>('real')
  const [ativo, setAtivo] = useState(true)
  const [inboundHint, setInboundHint] = useState('')
  const [hasInboundKey, setHasInboundKey] = useState(false)
  const [inboundOnce, setInboundOnce] = useState('')
  const [generatingKey, setGeneratingKey] = useState(false)
  const crmBase = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5474'

  useEffect(() => {
    if (!empresaId) return
    void (async () => {
      const cfg = await loadNxErpCrmConfig(empresaId)
      setApiUrl(cfg.apiUrl)
      setAmbiente(cfg.ambiente)
      setModo(cfg.modo)
      setAtivo(cfg.ativo)
      setTokenHint(cfg.tokenHint)
      setHasToken(cfg.hasToken)
      setInboundHint(cfg.inboundHint)
      setHasInboundKey(cfg.hasInboundKey)
      if (cfg.last) {
        setHealth(cfg.last)
        setConnection(cfg.last.connection)
      }
      const syncSnap = await getDocs(query(collection(db, 'empresas', empresaId, COL_CRM_ERP_SYNC), limit(200)))
      const evSnap = await getDocs(query(collection(db, 'empresas', empresaId, COL_CRM_ERP_EVENTS), limit(200)))
      const crmIds = new Set(syncSnap.docs.map((d) => String(d.data().crmId || d.id)))
      setLeads(syncSnap.size)
      setClientes(crmIds.size)
      setEventos(evSnap.size)
    })()
  }, [empresaId])

  async function salvar() {
    if (!empresaId) return toast.error('Entre na empresa para salvar a integração.')
    if (!canEdit) return toast.error('Somente administrador ou gestor altera integrações.')
    if (!apiUrl.trim()) return toast.error('Informe a URL do NX ERP.')
    setSaving(true)
    try {
      const saved = await saveNxErpCrmConfig({
        empresaId,
        apiUrl,
        ambiente,
        modo,
        ativo,
        token,
      })
      setToken('')
      setTokenHint(saved.tokenHint)
      setHasToken(saved.hasToken)
      setModo(saved.modo)
      toast.success('NX ERP salvo. O token fica mascarado.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar o NX ERP.')
    } finally {
      setSaving(false)
    }
  }

  async function gerarChaveEntrada() {
    if (!empresaId) return toast.error('Entre na empresa para gerar a chave.')
    if (!canEdit) return toast.error('Somente administrador ou gestor gera a chave.')
    setGeneratingKey(true)
    try {
      const created = await generateInboundCrmKey(empresaId)
      setInboundOnce(created.token)
      setInboundHint(created.hint)
      setHasInboundKey(true)
      toast.success('Chave do CRM gerada. Copie agora para o NX ERP. Ela não é o Token da API NX.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível gerar a chave.')
    } finally {
      setGeneratingKey(false)
    }
  }

  async function testarConexao() {
    if (!empresaId) return toast.error('Entre na empresa para testar o NX ERP.')
    setTesting(true)
    setConnection('CONNECTING')
    try {
      if (canEdit && apiUrl.trim()) {
        const saved = await saveNxErpCrmConfig({ empresaId, apiUrl, ambiente, modo, ativo, token })
        setToken('')
        setTokenHint(saved.tokenHint)
        setHasToken(saved.hasToken)
      }
      const result = await testNxErpHealth(empresaId)
      setHealth(result)
      setConnection(result.connection)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao testar o NX ERP.'
      setHealth({
        connection: 'ERROR',
        mode: 'real',
        apiConfigured: true,
        message,
        label: '● Erro',
        description: message,
        status: 'error',
        checkedAt: new Date().toISOString(),
      })
      setConnection('ERROR')
      toast.error(message)
    } finally {
      setTesting(false)
    }
  }

  const configured = Boolean(apiUrl.trim())
  const modeLabel = configured && modo === 'real' ? 'Real' : 'Mock'
  const apiLabel = configured ? 'Configurada' : 'Não configurada'
  const ambienteShown = configured ? ambienteLabel(ambiente) : '—'
  const statusText = testing
    ? '● Conectando'
    : health
      ? health.label
      : connection !== 'NOT_CONFIGURED'
        ? statusLabel(connection)
        : configured
          ? '● Aguardando teste'
          : statusLabel(connection)

  return (
    <div className="nexus-card p-4 text-sm space-y-3 max-w-xl">
      <p className="font-semibold">NX ERP</p>
      <p>
        Status:
        <br />
        <b>{statusText}</b>
      </p>
      <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
        {health?.description || (configured ? 'Clique em Testar conexão para chamar GET /api/crm/health.' : 'Informe a URL e o token do NX ERP.')}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <p>
          Modo
          <br />
          <b>{modeLabel}</b>
        </p>
        <p>
          Ambiente
          <br />
          <b>{ambienteShown}</b>
        </p>
        <p>
          API
          <br />
          <b>{apiLabel}</b>
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
        <p>
          Situação
          <br />
          <b>{ativo ? 'Ativo' : 'Inativo'}</b>
        </p>
      </div>
      <div className="grid gap-2">
        <FormField label="URL do NX ERP">
          <TextInput
            value={apiUrl}
            disabled={!canEdit}
            placeholder="https://seu-nx-erp"
            onChange={(e) => setApiUrl(e.target.value)}
          />
        </FormField>
        <FormField label="URL do Nexus CRM (para o NX ERP)">
          <TextInput readOnly value={crmBase} />
        </FormField>
        <FormField label="Token/Chave (CRM) — entrada do NX ERP">
          <TextInput
            type="password"
            readOnly
            value={inboundOnce}
            placeholder={hasInboundKey ? tokenMask(inboundHint) : 'Gere a chave de entrada'}
          />
        </FormField>
        <div className="flex gap-2">
          <GhostButton type="button" disabled={!canEdit || generatingKey} onClick={() => void gerarChaveEntrada()}>
            {generatingKey ? 'Gerando…' : 'Gerar chave do CRM'}
          </GhostButton>
          <GhostButton
            type="button"
            disabled={!inboundOnce}
            onClick={() => {
              void navigator.clipboard.writeText(inboundOnce)
              toast.success('Chave copiada. Cole no NX ERP e não compartilhe.')
            }}
          >
            Copiar chave
          </GhostButton>
        </div>
        <FormField label="Token da API NX">
          <TextInput
            type="password"
            autoComplete="new-password"
            value={token}
            disabled={!canEdit}
            placeholder={hasToken ? tokenMask(tokenHint) : 'Cole o token'}
            onChange={(e) => setToken(e.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Ambiente">
            <SelectInput value={ambiente} disabled={!canEdit} onChange={(e) => setAmbiente(e.target.value as NxErpAmbiente)}>
              <option value="producao">Produção</option>
              <option value="homologacao">Homologação</option>
            </SelectInput>
          </FormField>
          <FormField label="Modo">
            <SelectInput value={modo} disabled={!canEdit} onChange={(e) => setModo(e.target.value as NxErpModo)}>
              <option value="real">Real</option>
              <option value="mock">Mock</option>
            </SelectInput>
          </FormField>
          <FormField label="Ativo">
            <SelectInput value={ativo ? 'ativo' : 'inativo'} disabled={!canEdit} onChange={(e) => setAtivo(e.target.value === 'ativo')}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </SelectInput>
          </FormField>
        </div>
      </div>
      <div className="flex gap-2">
        <PrimaryButton type="button" disabled={saving || !canEdit} onClick={() => void salvar()}>
          {saving ? 'Salvando…' : 'Salvar'}
        </PrimaryButton>
        <GhostButton type="button" disabled={testing} onClick={() => void testarConexao()}>
          {testing ? 'Testando…' : 'Testar conexão'}
        </GhostButton>
      </div>
    </div>
  )
}
