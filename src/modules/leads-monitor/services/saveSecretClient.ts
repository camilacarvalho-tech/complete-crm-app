/**
 * Grava secrets via Cloud Function (KEK no Secret Manager).
 * Nunca persiste plaintext no Firestore a partir do cliente.
 */
import { auth } from '../../../firebase'
import type { StoredSecretRef } from './secrets'
import { secretHintFromPlain } from './secrets'

export type SecretField = 'authToken' | 'hmacSecret' | 'webhookToken'
export type SecretConfigDoc = 'api' | 'webhook'

function saveSecretUrl(): string | null {
  const fromEnv =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env?.VITE_LEADS_MONITOR_SAVE_SECRET_URL) ||
    ''
  if (fromEnv) return String(fromEnv).trim()
  // Homolog/local: URL relativa via hosting rewrite (quando configurada)
  return null
}

export function isSaveSecretViaFunctionConfigured(): boolean {
  return Boolean(saveSecretUrl())
}

/**
 * Envia plaintext só na Function autenticada; retorna hint mascarado.
 * Em produção (PROD) sem URL da Function: falha — evita encrypt local com KEK embutido.
 */
export async function saveSecretViaFunction(opts: {
  empresaId: string
  configDoc: SecretConfigDoc
  field: SecretField
  plainSecret: string
}): Promise<{ hint: string; webhookTokenHash?: string }> {
  const url = saveSecretUrl()
  if (!url) {
    throw new Error(
      'Configure VITE_LEADS_MONITOR_SAVE_SECRET_URL (Function leadsMonitorSaveSecret) para gravar segredos.'
    )
  }

  const user = auth.currentUser
  if (!user) throw new Error('Sessão expirada — faça login novamente.')
  const idToken = await user.getIdToken()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      empresaId: opts.empresaId,
      configDoc: opts.configDoc,
      field: opts.field,
      plainSecret: opts.plainSecret,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `saveSecret HTTP ${res.status}`)
  }

  const hint = String(data.hint || `••••${secretHintFromPlain(opts.plainSecret)}`)
  return { hint }
}

/** Placeholder local só para tipagem quando a Function já gravou o secret. */
export function placeholderSecretRef(field: string, hint: string): StoredSecretRef {
  return {
    ciphertext: '',
    iv: '',
    keyVersion: 'v1-sm',
    secretRef: `function:${field}`,
    hint: hint.replace(/^•+/, '').slice(-4) || hint.slice(-4),
  }
}
