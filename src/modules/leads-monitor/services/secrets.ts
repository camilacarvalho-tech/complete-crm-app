/**
 * Camada de secrets do Leads Monitor.
 * Firestore nunca guarda tokens em texto puro — só ciphertext + metadados.
 *
 * Produção: Cloud Function `leadsMonitorSaveSecret` usa KEK (Secret Manager / env).
 * Cliente: envia plaintext só na Function; lê máscara + secretRef.
 */

export interface StoredSecretRef {
  ciphertext: string
  iv: string
  keyVersion: string
  secretRef: string
  /** Últimos 4 chars para UI (máscara) */
  hint?: string
  updatedAt?: unknown
}

export function maskSecret(hint?: string): string {
  if (!hint) return '••••••••'
  return `••••${hint}`
}

export function secretHintFromPlain(plain: string): string {
  const clean = plain.trim()
  if (clean.length <= 4) return clean
  return clean.slice(-4)
}

/** Payload enviado à Function para gravar segredo (nunca persistir no cliente). */
export interface SaveSecretRequest {
  empresaId: string
  configDoc: 'api' | 'webhook'
  field: 'authToken' | 'hmacSecret' | 'webhookToken'
  plainSecret: string
}

/**
 * Criptografa com AES-GCM (Web Crypto) — usado pela Function ou fallback local de homologação.
 * A KEK deve vir de Secret Manager / env — nunca hardcoded em produção.
 */
export async function encryptSecretAesGcm(
  plain: string,
  kekRaw: ArrayBuffer
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.importKey('raw', kekRaw, 'AES-GCM', false, ['encrypt'])
  const encoded = new TextEncoder().encode(plain)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    ciphertext: bufferToBase64(cipherBuf),
    iv: bufferToBase64(iv.buffer),
  }
}

export async function decryptSecretAesGcm(
  ciphertextB64: string,
  ivB64: string,
  kekRaw: ArrayBuffer
): Promise<string> {
  const key = await crypto.subtle.importKey('raw', kekRaw, 'AES-GCM', false, ['decrypt'])
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(ivB64) },
    key,
    base64ToBuffer(ciphertextB64)
  )
  return new TextDecoder().decode(plainBuf)
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function base64ToBuffer(b64: string): Uint8Array {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

/** Deriva 32 bytes a partir de uma string KEK (homologação). Produção: Secret Manager. */
export async function deriveKekFromPassphrase(passphrase: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder().encode(passphrase)
  const hash = await crypto.subtle.digest('SHA-256', enc)
  return hash
}
