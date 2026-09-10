/**
 * CSV Import Connector — permite importar leads de arquivos CSV
 */
import type { IConnector, ConnectorFetchContext, ConnectorRawRecord, NormalizedLead } from './types'

export const csvImportConnector: IConnector = {
  meta: {
    id: 'csv-import',
    label: 'Import CSV',
    descricao: 'Importação de leads via arquivo CSV (upload manual).',
    autorizado: true,
    enabled: true,
    version: '1.0.0',
    versao: '1.0.0',
    apiVersion: 1,
    tiposSuportados: ['pessoa', 'empresa'],
  },

  async fetch(_ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    return []
  },

  normalize(_raw: ConnectorRawRecord, _ctx: ConnectorFetchContext): NormalizedLead | null {
    return null
  },
}

export async function savePendingCsv(data: unknown) {
  console.log('savePendingCsv:', data)
}

export async function saveFonteCsvText(fonteId: string, csvText: string) {
  console.log('saveFonteCsvText:', fonteId, csvText.substring(0, 100))
}
