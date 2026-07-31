/**
 * Bootstrap dos conectores de produção.
 * Fontes demo (formularios / basesPublicas) ficam fora do registry em V1.1 —
 * arquivos mantidos apenas como referência em connectors/_demo/ ou desabilitados.
 */
import { registerConnector } from './registry'
import { integracaoApiConnector } from './integracaoApi.connector'
import { webhookConnector } from './webhook.connector'

let bootstrapped = false

export function bootstrapConnectors(): void {
  if (bootstrapped) return
  // Produção V1.1: apenas fontes reais configuráveis
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
