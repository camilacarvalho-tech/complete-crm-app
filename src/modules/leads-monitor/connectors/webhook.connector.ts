/**
 * Stub V1.1 — webhook autenticado.
 */
import type { LeadConnector } from './types'

export const webhookConnector: LeadConnector = {
  meta: {
    id: 'webhook',
    label: 'Webhook',
    descricao: 'Recebe oportunidades via webhook autenticado (preparado para V1.1).',
    autorizado: true,
    enabled: false,
    versao: '0.0.0',
    tiposSuportados: ['pessoa', 'empresa'],
  },
  async fetch() {
    return []
  },
  normalize() {
    return null
  },
}
