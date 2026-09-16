import { lgpdText, governancaFromRecord } from '../catalog/lgpdGovernanca'
import { formatMonitorDateTime } from '../utils/datetime'

export function LgpdGovernancaBlock({
  record,
  compact,
}: {
  record: Record<string, unknown>
  compact?: boolean
}) {
  const g = governancaFromRecord({
    origemDado: record.origemDado || (record.metadados as Record<string, unknown> | undefined)?.origemDado,
    fonteDado: record.fonteDado || (record.metadados as Record<string, unknown> | undefined)?.fonteDado,
    origemLabel: record.origemLabel || record.fontePesquisa || record.source,
    connectorId: record.connectorId,
    finalidadeTratamento:
      record.finalidadeTratamento || (record.metadados as Record<string, unknown> | undefined)?.finalidadeTratamento,
    baseLegal: record.baseLegal || (record.metadados as Record<string, unknown> | undefined)?.baseLegal,
    coletadoEm:
      record.coletadoEm ||
      (record.metadados as Record<string, unknown> | undefined)?.coletadoEm ||
      record.criadoEm,
    atualizadoEm: record.atualizadoEm || record.updatedAt,
    criadoEm: record.criadoEm || record.createdAt,
    retentionStatus:
      record.retentionStatus || (record.metadados as Record<string, unknown> | undefined)?.retentionStatus,
  })
  return (
    <section className={compact ? 'text-xs space-y-1' : 'text-sm space-y-2'}>
      <h3 className="font-semibold text-sm">LGPD — Governança de Dados</h3>
      <p style={{ color: 'var(--code-muted)' }}>
        Origem, finalidade, base legal e rastreabilidade dos dados são registradas quando aplicável.
      </p>
      <p style={{ color: 'var(--code-muted)' }}>
        Tratamento de dados conforme configuração da operação e base legal aplicável.
      </p>
      <dl className="grid gap-1">
        <div>Origem: {g.origem}</div>
        <div>Fonte: {g.fonte}</div>
        <div>Finalidade: {g.finalidade}</div>
        <div>Base legal: {g.baseLegal}</div>
        <div>Data da coleta: {g.coletadoEm ? formatMonitorDateTime(g.coletadoEm) : 'Não informado'}</div>
        <div>Última atualização: {g.atualizadoEm ? formatMonitorDateTime(g.atualizadoEm) : 'Não informado'}</div>
        <div>Status de retenção: {g.retentionStatus}</div>
        <div>Auditoria: {lgpdText(record.auditRef || 'Registro via Audit Trail do tenant, quando a ação ocorrer.')}</div>
      </dl>
    </section>
  )
}
