/**
 * Nexus Leads Monitor — API pública do módulo.
 *
 * Arquitetura:
 *   connectors/  → cada fonte implementa IConnector (plugável + versionado)
 *   pipeline/    → Conector → Normalize → Dedupe → Classify → Score → Approve → CRM
 */

export type {
  FiltrosPesquisa,
  LeadMonitorStatus,
  LeadScoreResult,
  MonitorRunResult,
  OportunidadeMonitor,
  PesquisaSalva,
  TipoOportunidade,
} from './types'

export type {
  IConnector,
  LeadConnector,
  ConnectorMeta,
  ConnectorRawRecord,
  NormalizedLead,
  ConnectorFetchContext,
} from './connectors'

export {
  AUTO_REFRESH_MS,
  COL_OPORTUNIDADES,
  COL_PESQUISAS,
  COL_CONFIG,
  COL_JOBS,
  COL_INBOX,
  COL_LOGS,
  COL_DLQ,
  COL_AUDIT,
  COL_HEALTH,
  ESTADOS_BR,
  FILTROS_VAZIOS,
  LEADS_MONITOR_VERSION,
  SEGMENTOS,
  JOB_MAX_ATTEMPTS,
  JOB_LEASE_MS,
} from './constants'

export {
  registerConnector,
  getConnector,
  listConnectors,
  listLatestConnectors,
  getRunnableConnectors,
  listConnectorMetas,
  listConnectorApiVersions,
  bootstrapConnectors,
  connectorRegistryKey,
} from './connectors'

export { useLeadsMonitor } from './hooks/useLeadsMonitor'
export { runLeadPipeline, executarPesquisaMonitor } from './pipeline'
export { enviarOportunidadeParaCrm } from './pipeline/sendToCrm'
export { aprovarOportunidade, rejeitarOportunidade } from './pipeline/approve'
export { classifyLead } from './pipeline/classify'
export { scoreLead } from './pipeline/score'
export { writeLeadsMonitorAudit, sanitizeAuditPayload } from './services/auditTrail'
export type { LeadsMonitorAuditEntry, AuditAction, AuditOrigem } from './services/auditTrail'
export { enqueueJob, claimNextJob } from './services/jobQueue'
export { processOneJob, startJobWorkerLoop } from './services/jobWorker'
export { writeLeadsMonitorLog, moveToDlq, reprocessDlq } from './services/opsLogs'
export { recordConnectorSuccess, recordConnectorFailure } from './services/healthStore'
export { getNexusAiQualifier, setNexusAiQualifier, defaultNexusAiQualifier } from './ai/INexusAiQualifier'
export type { INexusAiQualifier } from './ai/INexusAiQualifier'
export type { ApiConnectorConfig, WebhookConnectorConfig } from './services/configStore'
export { IntegrationsAdminPanel } from './components/IntegrationsAdminPanel'
