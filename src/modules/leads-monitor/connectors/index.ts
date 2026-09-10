/**
 * Bootstrap dos conectores de produção.
 * Fontes demo (formularios / basesPublicas) ficam fora do registry em V1.1 —
 * arquivos mantidos apenas como referência em connectors/_demo/ ou desabilitados.
 */
import { registerConnector } from './registry'
import { integracaoApiConnector } from './integracaoApi.connector'
import { webhookConnector } from './webhook.connector'
import { csvImportConnector } from './csvImport.connector'
import { googlePlacesConnector } from './googlePlaces.connector'

let bootstrapped = false

export function bootstrapConnectors(): void {
  if (bootstrapped) return
  registerConnector(integracaoApiConnector)
  registerConnector(webhookConnector)
  registerConnector(csvImportConnector)
  registerConnector(googlePlacesConnector)
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
