/**
 * Bootstrap dos conectores.
 * Novos conectores: importar + registerConnector(meuConector) — só isso.
 * Várias apiVersion do mesmo id podem coexistir (pin por empresa).
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
  registerConnector(integracaoApiConnector)
  registerConnector(webhookConnector)
  bootstrapped = true
}

export type {
  IConnector,
  LeadConnector,
  ConnectorMeta,
  ConnectorRawRecord,
  NormalizedLead,
  ConnectorFetchContext,
} from './types'

export { connectorRegistryKey } from './types'

export {
  registerConnector,
  getConnector,
  listConnectors,
  listLatestConnectors,
  getRunnableConnectors,
  listConnectorMetas,
  listConnectorApiVersions,
} from './registry'
