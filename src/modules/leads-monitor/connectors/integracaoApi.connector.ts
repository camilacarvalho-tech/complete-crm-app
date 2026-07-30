/**
 * Stub V1.1 — integração API autorizada.
 * Registrar com enabled:false; ativar e implementar fetch/normalize sem tocar no núcleo.
 */
import type { LeadConnector } from './types'

export const integracaoApiConnector: LeadConnector = {
  meta: {
    id: 'integracao_api',
    label: 'Integração API',
    descricao: 'Conector genérico para APIs autorizadas (preparado para V1.1).',
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
