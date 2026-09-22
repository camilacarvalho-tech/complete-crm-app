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
  COL_PEOPLE_RESEARCH,
  COL_PEOPLE_RUNS,
  COL_PROCESS_RUNS,
  COL_PROCESS_RECORDS,
  ESTADOS_BR,
  ESTADOS_BR_NOMES,
  OPERACOES_MONITOR,
  FILTROS_VAZIOS,
  FONTES_TIPOS,
  FONTE_LIMITE_DIARIO_DEFAULT,
  LEADS_MONITOR_VERSION,
  SEGMENTOS,
  SEGMENTOS_NICHOS,
  FAIXAS_FUNCIONARIOS,
  PALAVRAS_CHAVE_PROSPECCAO,
  JOB_MAX_ATTEMPTS,
  JOB_LEASE_MS,
  AUTO_SEARCH_ENABLED,
  DEFAULT_SCORE_MINIMO,
  MAX_RESULTS_PER_CYCLE,
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
export { runPersonDiscovery, runPersonDiscoveryForNewCompanies } from './person/personDiscoveryEngine'
export {
  registerEnrichmentProvider,
  getEnrichmentProviders,
  getActiveEnrichmentProviders,
} from './enrichment/enrichmentRegistry'
export { enrichExistingPersonLead } from './enrichment/enrichmentEngine'
export { runEnrichmentQueue } from './enrichment/enrichmentQueue'
export { normalizeFiltros, filtrosResumo } from './search/filters'
export { runSearchEngine } from './search/SearchEngine'
export { startIntelligentSearch, requestSearchCancel, stopSearchExecution } from './search/startSearch'
export { PRODUTOS_MONITOR, produtoPorOperacao, produtoLabel, LIMITES_BUSCA_PRESETS } from './catalog/produtosMonitor'
export {
  seedFontesCatalogo,
  updateFontePesquisa,
  fonteTipoLabel,
  healthBadgeClass,
} from './services/fontesStore'
export { parseCsv, mapCsvRow } from './connectors/csvParse'
export { savePendingCsv, saveFonteCsvText } from './connectors/csvImport.connector'
export { enviarOportunidadeParaCrm } from './pipeline/sendToCrm'
export { enviarPessoaParaCrm } from './pipeline/sendPersonToCrm'
export type { PersonLead } from './types/personLead'
export { PERSON_LEAD_EXPORT_COLUMNS, PERSON_FIELD_REQUEST_OPTIONS } from './types/personLead'
export { toPersonLead, personLeadToNxErpContact } from './pipeline/personLead'
export {
  downloadDelimited,
  downloadSpreadsheetMl,
  exportRowsFromClientes,
  exportRowsFromOportunidades,
  exportRowsFromPeople,
} from './pipeline/exportMonitorRows'
export {
  downloadBaseCompleta,
  downloadCsvNamed,
  exportEmpresasRows,
  exportPessoasSheetRows,
} from './pipeline/exportWorkbook'
export { formatMonitorDateTime, formatMonitorDate, formatMonitorTime, formatMonitorRelative } from './utils/datetime'
export { PesquisarPessoasModal } from './components/PesquisarPessoasModal'
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
