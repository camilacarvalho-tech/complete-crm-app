/**
 * Nexus Leads Monitor — API pública do módulo.
 *
 * Arquitetura:
 *   connectors/  → cada fonte implementa LeadConnector (plugável)
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
  ESTADOS_BR,
  FILTROS_VAZIOS,
  LEADS_MONITOR_VERSION,
  SEGMENTOS,
} from './constants'

export {
  registerConnector,
  getConnector,
  listConnectors,
  getRunnableConnectors,
  listConnectorMetas,
  bootstrapConnectors,
} from './connectors'

export { useLeadsMonitor } from './hooks/useLeadsMonitor'
export { runLeadPipeline, executarPesquisaMonitor } from './pipeline'
export { enviarOportunidadeParaCrm } from './pipeline/sendToCrm'
export { aprovarOportunidade, rejeitarOportunidade } from './pipeline/approve'
export { classifyLead } from './pipeline/classify'
export { scoreLead } from './pipeline/score'
