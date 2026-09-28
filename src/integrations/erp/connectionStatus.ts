/** Status da conexão NX ERP. Sem secrets. */

export const NX_ERP_CONNECTION_STATUSES = [
  'NOT_CONFIGURED',
  'CONNECTING',
  'CONNECTED',
  'AUTH_ERROR',
  'UNAVAILABLE',
  'TIMEOUT',
  'ERROR',
] as const

export type NxErpConnectionStatus = (typeof NX_ERP_CONNECTION_STATUSES)[number]

export type ErpRuntimeMode = 'mock' | 'real'

export interface ErpHealthProbe {
  enabled?: boolean
  urlConfigured?: boolean
  keyConfigured?: boolean
  healthPathConfigured?: boolean
  httpStatus?: number
  timeout?: boolean
  networkError?: boolean
  functionMissing?: boolean
  detail?: string
}

export interface ErpHealthResult {
  connection: NxErpConnectionStatus
  mode: ErpRuntimeMode
  apiConfigured: boolean
  checkedAt: string | null
  message: string
  label: string
  description: string
  status: 'not_configured' | 'online' | 'error'
}

const SECRET_KEY = /token|secret|password|senha|authorization|apikey|api_key|hmac|bearer|ciphertext|nx_erp_api_key|erp_api_key/i

export function sanitizeErpLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeErpLog)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k) || SECRET_KEY.test(String(v))) {
        out[k] = '[REDACTED]'
        continue
      }
      out[k] = sanitizeErpLog(v)
    }
    return out
  }
  if (typeof value === 'string' && SECRET_KEY.test(value)) return '[REDACTED]'
  return value
}

export function statusLabel(connection: NxErpConnectionStatus): string {
  switch (connection) {
    case 'CONNECTED':
      return '● Conectado'
    case 'CONNECTING':
      return '● Conectando'
    case 'AUTH_ERROR':
      return '● Erro de autenticação'
    case 'UNAVAILABLE':
      return '● Indisponível'
    case 'TIMEOUT':
      return '● Tempo esgotado'
    case 'ERROR':
      return '● Erro'
    default:
      return '● Não configurado'
  }
}

export function statusDescription(connection: NxErpConnectionStatus): string {
  switch (connection) {
    case 'CONNECTED':
      return 'Health check documentado respondeu HTTP 200. Envio de campanha em massa continua desligado neste CRM.'
    case 'CONNECTING':
      return 'Verificando o NX ERP…'
    case 'AUTH_ERROR':
      return 'O NX ERP recusou a autenticação. Confira o token da API NX.'
    case 'UNAVAILABLE':
      return 'O NX ERP não respondeu.'
    case 'TIMEOUT':
      return 'A verificação excedeu o tempo limite.'
    case 'ERROR':
      return 'Falha na verificação.'
    default:
      return 'Configure a conexão do NX ERP para ativá-la.'
  }
}

export function interpretErpHealth(input: ErpHealthProbe): Omit<ErpHealthResult, 'checkedAt'> {
  const apiConfigured = Boolean(input.urlConfigured)
  const healthReady = Boolean(input.urlConfigured && input.healthPathConfigured && input.enabled !== false)

  if (input.timeout) {
    return pack('TIMEOUT', input.urlConfigured ? 'real' : 'mock', apiConfigured, input.detail)
  }
  if (input.httpStatus === 401 || input.httpStatus === 403) {
    return pack('AUTH_ERROR', 'real', apiConfigured, input.detail)
  }
  if (input.httpStatus === 404) {
    return pack('ERROR', 'real', apiConfigured, input.detail || 'HTTP 404')
  }
  if (input.httpStatus === 502 || input.httpStatus === 503) {
    return pack('UNAVAILABLE', 'real', apiConfigured, input.detail)
  }
  if (typeof input.httpStatus === 'number' && input.httpStatus >= 500) {
    return pack('ERROR', 'real', apiConfigured, input.detail || `HTTP ${input.httpStatus}`)
  }
  if (input.httpStatus === 200 && healthReady) {
    return pack('CONNECTED', 'real', true, input.detail)
  }
  if (input.networkError && input.urlConfigured) {
    return pack('UNAVAILABLE', 'real', apiConfigured, input.detail || 'Conexão recusada')
  }
  if (input.functionMissing || !healthReady) {
    return pack('NOT_CONFIGURED', 'mock', apiConfigured, input.detail)
  }
  if (input.networkError) {
    return pack('UNAVAILABLE', 'real', apiConfigured, input.detail)
  }
  return pack('ERROR', healthReady ? 'real' : 'mock', apiConfigured, input.detail)
}

function pack(
  connection: NxErpConnectionStatus,
  mode: ErpRuntimeMode,
  apiConfigured: boolean,
  detail?: string
): Omit<ErpHealthResult, 'checkedAt'> {
  const status: ErpHealthResult['status'] =
    connection === 'CONNECTED' ? 'online' : connection === 'NOT_CONFIGURED' ? 'not_configured' : 'error'
  const base = statusDescription(connection)
  const description = detail ? `${base} ${detail}` : base
  return {
    connection,
    mode,
    apiConfigured,
    message: description,
    label: statusLabel(connection),
    description,
    status,
  }
}

export function withCheckedAt(result: Omit<ErpHealthResult, 'checkedAt'>, at = new Date()): ErpHealthResult {
  return { ...result, checkedAt: at.toISOString() }
}

export const REAL_LEAD_SYNC_DISABLED = {
  ok: false as const,
  duplicated: false,
  message: 'Sincronização real de leads desativada. Use o mock até o próximo comando.',
}

export function leadSyncAdapterKind(): 'mock' {
  return 'mock'
}
