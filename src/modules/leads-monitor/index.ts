/**
 * Nexus Leads Monitor — API pública do módulo.
 *
 * Arquitetura:
 *   connectors/  → cada fonte implementa IConnector (plugável + versionado)
 *   pipeline/    → Conector → Normalize → Dedupe → Classify → Score → Approve → CRM
 */

export type {
  FiltrosPesquisa,
  FonteHealthStatus,
  FontePesquisa,
  FontePesquisaStatus,
  FontePesquisaTipo,
  LeadMonitorStatus,
  LeadScoreResult,
  MonitorRunResult,
  OportunidadeMonitor,
  PesquisaSalva,
  SearchRun,
  SearchRunProgresso,
  SearchRunStatus,
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
  COL_FONTES,
  COL_SEARCH_RUNS,
  ESTADOS_BR,
  FILTROS_VAZIOS,
  FONTES_TIPOS,
  FONTE_LIMITE_DIARIO_DEFAULT,
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
export { normalizeFiltros, filtrosResumo } from './search/filters'
export { runSearchEngine } from './search/SearchEngine'
export { startIntelligentSearch, requestSearchCancel } from './search/startSearch'
export {
  seedFontesCatalogo,
  updateFontePesquisa,
  fonteTipoLabel,
  healthBadgeClass,
} from './services/fontesStore'
export { parseCsv, mapCsvRow } from './connectors/csvParse'
export { savePendingCsv, saveFonteCsvText } from './connectors/csvImport.connector'
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
