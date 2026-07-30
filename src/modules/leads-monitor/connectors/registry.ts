/**
 * Registry de conectores — plugável sem alterar o núcleo do pipeline.
 */
import type { LeadConnector } from './types'

const connectors = new Map<string, LeadConnector>()

export function registerConnector(connector: LeadConnector): void {
  const id = connector.meta.id
  if (connectors.has(id)) {
    console.warn(`[leads-monitor] conector "${id}" já registrado — substituindo`)
  }
  connectors.set(id, connector)
}

export function getConnector(id: string): LeadConnector | undefined {
  return connectors.get(id)
}

export function listConnectors(): LeadConnector[] {
  return Array.from(connectors.values())
}

/** Conectores que podem rodar no pipeline (autorizados + enabled). */
export function getRunnableConnectors(): LeadConnector[] {
  return listConnectors().filter((c) => c.meta.autorizado && c.meta.enabled)
}

/** Metadados para UI (inclui stubs desabilitados). */
export function listConnectorMetas() {
  return listConnectors().map((c) => ({
    ...c.meta,
    runnable: c.meta.autorizado && c.meta.enabled,
  }))
}
