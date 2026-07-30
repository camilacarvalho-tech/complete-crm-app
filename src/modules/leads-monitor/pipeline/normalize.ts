/**
 * Etapa 2 — Normalização.
 * O núcleo só itera conectores; cada um normaliza o próprio payload.
 */
import type { LeadConnector, NormalizedLead, ConnectorFetchContext, ConnectorRawRecord } from '../connectors/types'

export interface NormalizeBatchResult {
  leads: NormalizedLead[]
  descartados: number
  connectorId: string
  connectorLabel: string
}

export function normalizeFromConnector(
  connector: LeadConnector,
  rawRecords: ConnectorRawRecord[],
  ctx: ConnectorFetchContext
): NormalizeBatchResult {
  const leads: NormalizedLead[] = []
  let descartados = 0

  for (const raw of rawRecords) {
    try {
      const lead = connector.normalize(raw, ctx)
      if (!lead) {
        descartados += 1
        continue
      }
      // Garante que o connectorId canônico vem do meta (não confiar só no payload)
      leads.push({
        ...lead,
        connectorId: connector.meta.id,
        origemLabel: lead.origemLabel || connector.meta.label,
      })
    } catch (e) {
      console.warn(`[leads-monitor] normalize falhou em ${connector.meta.id}`, e)
      descartados += 1
    }
  }

  return {
    leads,
    descartados,
    connectorId: connector.meta.id,
    connectorLabel: connector.meta.label,
  }
}
