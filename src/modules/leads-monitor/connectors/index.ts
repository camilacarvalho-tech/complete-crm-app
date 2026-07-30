/**
 * Bootstrap dos conectores V1.
 * Novos conectores: importar + registerConnector(meuConector) — só isso.
 */
import { registerConnector } from './registry'
import { formulariosConnector } from './formularios.connector'
import { basesPublicasConnector } from './basesPublicas.connector'
import { integracaoApiConnector } from './integracaoApi.connector'
import { webhookConnector } from './webhook.connector'

let bootstrapped = false

export function bootstrapConnectors(): void {
  if (bootstrapped) return
  registerConnector(formulariosConnector)
  registerConnector(basesPublicasConnector)
  // Preparados — enabled:false (não alteram o núcleo ao serem ativados depois)
  registerConnector(integracaoApiConnector)
  registerConnector(webhookConnector)
  bootstrapped = true
}

export type { LeadConnector, ConnectorMeta, ConnectorRawRecord, NormalizedLead, ConnectorFetchContext } from './types'
export { registerConnector, getConnector, listConnectors, getRunnableConnectors, listConnectorMetas } from './registry'
