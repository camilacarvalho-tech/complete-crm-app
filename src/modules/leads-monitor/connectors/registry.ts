/**
 * Registry de conectores — plugável e versionado.
 * Suporta várias apiVersion do mesmo id sem quebrar pins de empresas.
 */
import type { IConnector } from './types'
import { connectorRegistryKey } from './types'

/** id@apiVersion → conector */
const byVersion = new Map<string, IConnector>()
/** id → maior apiVersion registrada (default) */
const latestApiVersion = new Map<string, number>()

function resolveVersion(connector: IConnector): string {
  return connector.meta.version || connector.meta.versao || '0.0.0'
}

function normalizeMeta(connector: IConnector): IConnector {
  const version = resolveVersion(connector)
  const apiVersion = connector.meta.apiVersion ?? 1
  return {
    ...connector,
    meta: {
      ...connector.meta,
      version,
      versao: connector.meta.versao || version,
      apiVersion,
    },
  }
}

export function registerConnector(connector: IConnector): void {
  const c = normalizeMeta(connector)
  const id = c.meta.id
  const apiVersion = c.meta.apiVersion
  const key = connectorRegistryKey(id, apiVersion)

  if (byVersion.has(key)) {
    console.warn(`[leads-monitor] conector "${key}" já registrado — substituindo`)
  }
  byVersion.set(key, c)

  const prev = latestApiVersion.get(id) ?? 0
  if (apiVersion >= prev) latestApiVersion.set(id, apiVersion)
}

/** Resolve por id (latest) ou id + apiVersion pinada. */
export function getConnector(id: string, apiVersion?: number): IConnector | undefined {
  const v = apiVersion ?? latestApiVersion.get(id)
  if (v == null) return undefined
  return byVersion.get(connectorRegistryKey(id, v))
}

/** Todas as implementações registradas (todas as versões). */
export function listConnectors(): IConnector[] {
  return Array.from(byVersion.values())
}

/** Uma entrada por id (versão mais recente). */
export function listLatestConnectors(): IConnector[] {
  const out: IConnector[] = []
  for (const [id, apiVersion] of latestApiVersion) {
    const c = getConnector(id, apiVersion)
    if (c) out.push(c)
  }
  return out
}

/** Conectores que podem rodar (autorizados + enabled) — latest por id. */
export function getRunnableConnectors(): IConnector[] {
  return listLatestConnectors().filter((c) => c.meta.autorizado && c.meta.enabled)
}

/** Metadados para UI (inclui stubs desabilitados). */
export function listConnectorMetas() {
  return listLatestConnectors().map((c) => ({
    ...c.meta,
    version: c.meta.version,
    versao: c.meta.versao || c.meta.version,
    runnable: c.meta.autorizado && c.meta.enabled,
  }))
}

/** Lista apiVersions disponíveis para um id (upgrade na UI). */
export function listConnectorApiVersions(id: string): number[] {
  const versions: number[] = []
  for (const key of byVersion.keys()) {
    if (key.startsWith(`${id}@`)) {
      const n = Number(key.split('@')[1])
      if (!Number.isNaN(n)) versions.push(n)
    }
  }
  return versions.sort((a, b) => a - b)
}
