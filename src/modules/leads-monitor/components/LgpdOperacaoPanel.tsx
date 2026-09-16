import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../contexts/AuthContext'
import { useTenantCollection } from '../../../hooks/useTenantCollection'
import { BASE_LEGAL_OPCOES, RETENTION_STATUS, TITULAR_SOLICITACOES } from '../catalog/lgpdGovernanca'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import { LgpdGovernancaBlock } from './LgpdGovernancaBlock'
import { formatMonitorDateTime } from '../utils/datetime'

export function LgpdOperacaoPanel() {
  const { usuario } = useAuth()
  const empresaId = usuario?.empresaId || null
  const solicitacoes = useTenantCollection<{ id: string; tipo?: string; status?: string; criadoEm?: unknown }>(
    'lgpdSolicitacoes',
    [],
    { tela: 'lgpd-solicitacoes' }
  )
  const incidentes = useTenantCollection<{ id: string; tipo?: string; status?: string; nivel?: string; dataHora?: unknown }>(
    'lgpdIncidentes',
    [],
    { tela: 'lgpd-incidentes' }
  )
  const [tipoSol, setTipoSol] = useState(TITULAR_SOLICITACOES[0])
  const [descSol, setDescSol] = useState('')
  const [tipoInc, setTipoInc] = useState('')
  const [descInc, setDescInc] = useState('')
  const [nivel, setNivel] = useState('Em análise')
  const [busy, setBusy] = useState(false)

  const registrarSolicitacao = async () => {
    if (!empresaId) return
    setBusy(true)
    try {
      const ref = await addDoc(collection(db, 'empresas', empresaId, 'lgpdSolicitacoes'), {
        empresaId,
        tipo: tipoSol,
        descricao: descSol.trim() || 'Não informado',
        status: 'Registrada',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      })
      await writeLeadsMonitorAudit({
        empresaId,
        action: 'data.accessed',
        origem: 'ui',
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
        entidade: 'lgpdSolicitacao',
        entidadeId: ref.id,
        meta: { tipo: tipoSol },
      })
      setDescSol('')
    } finally {
      setBusy(false)
    }
  }

  const registrarIncidente = async () => {
    if (!empresaId) return
    setBusy(true)
    try {
      const incidentId = `inc-${Date.now()}`
      const ref = await addDoc(collection(db, 'empresas', empresaId, 'lgpdIncidentes'), {
        empresaId,
        incidentId,
        dataHora: serverTimestamp(),
        tipo: tipoInc.trim() || 'Não informado',
        descricao: descInc.trim() || 'Não informado',
        registroAfetado: 'Não informado',
        nivel,
        status: 'Aberto',
        responsavel: usuario?.nome || 'Não informado',
        acoesTomadas: 'Não informado',
        resolvidoEm: null,
        criadoEm: serverTimestamp(),
      })
      await writeLeadsMonitorAudit({
        empresaId,
        action: 'data.accessed',
        origem: 'ui',
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
        entidade: 'lgpdIncidente',
        entidadeId: ref.id,
        meta: { incidentId, nivel },
      })
      setTipoInc('')
      setDescInc('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="nexus-card p-4 space-y-3">
        <LgpdGovernancaBlock
          record={{
            origemDado: '',
            finalidadeTratamento: 'Pendente de definição',
            baseLegal: 'Pendente de definição',
            retentionStatus: '',
          }}
        />
        <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
          Campos de governança: origemDado, fonteDado, finalidadeTratamento, baseLegal, coletadoEm, atualizadoEm,
          retentionPolicy, retentionUntil, retentionStatus. Valores ausentes aparecem como Não informado ou Pendente de
          definição. Nenhuma exclusão automática de dados é executada nesta tela.
        </p>
        <div className="text-xs" style={{ color: 'var(--code-muted)' }}>
          <div>Opções de base legal (configuráveis, sem seleção automática): {BASE_LEGAL_OPCOES.join(' · ')}</div>
          <div>Retenção: {RETENTION_STATUS.join(' · ')}</div>
        </div>
      </div>

      <div className="nexus-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Direitos do titular (registro)</h3>
        <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
          Somente registra e audita. Não há decisão jurídica automática.
        </p>
        <select
          value={tipoSol}
          onChange={(e) => setTipoSol(e.target.value as (typeof TITULAR_SOLICITACOES)[number])}
          className="w-full px-3 py-2 rounded-lg text-sm"
        >
          {TITULAR_SOLICITACOES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <textarea
          value={descSol}
          onChange={(e) => setDescSol(e.target.value)}
          placeholder="Descrição da solicitação"
          className="w-full px-3 py-2 rounded-lg text-sm min-h-[72px]"
        />
        <button type="button" disabled={busy || !empresaId} className="nexus-cta text-white text-xs px-3 py-2 rounded-lg" onClick={() => void registrarSolicitacao()}>
          Registrar solicitação
        </button>
        <ul className="text-xs space-y-1">
          {solicitacoes.items.slice(0, 20).map((s) => (
            <li key={s.id}>
              {s.tipo} · {s.status} · {s.criadoEm ? formatMonitorDateTime(s.criadoEm) : ''}
            </li>
          ))}
          {!solicitacoes.items.length && <li>Não informado</li>}
        </ul>
      </div>

      <div className="nexus-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Incidentes de segurança (registro)</h3>
        <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
          Preparado para registro e auditoria. Sem envio automático de comunicação jurídica.
        </p>
        <input
          value={tipoInc}
          onChange={(e) => setTipoInc(e.target.value)}
          placeholder="Tipo"
          className="w-full px-3 py-2 rounded-lg text-sm"
        />
        <textarea
          value={descInc}
          onChange={(e) => setDescInc(e.target.value)}
          placeholder="Descrição"
          className="w-full px-3 py-2 rounded-lg text-sm min-h-[72px]"
        />
        <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm">
          <option>Em análise</option>
          <option>Baixo</option>
          <option>Médio</option>
          <option>Alto</option>
        </select>
        <button type="button" disabled={busy || !empresaId} className="nexus-cta text-white text-xs px-3 py-2 rounded-lg" onClick={() => void registrarIncidente()}>
          Registrar incidente
        </button>
        <ul className="text-xs space-y-1">
          {incidentes.items.slice(0, 20).map((s) => (
            <li key={s.id}>
              {s.tipo} · {s.nivel} · {s.status}
            </li>
          ))}
          {!incidentes.items.length && <li>Não informado</li>}
        </ul>
      </div>
    </div>
  )
}
