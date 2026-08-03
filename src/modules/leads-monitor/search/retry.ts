/**
 * Retry com backoff — falhas transitórias por conector (não bloqueia o run).
 */
export class SoftSkipError extends Error {
  readonly code: string
  constructor(message: string, code = 'soft_skip') {
    super(message)
    this.name = 'SoftSkipError'
    this.code = code
  }
}

export function isSoftSkip(e: unknown): boolean {
  return e instanceof SoftSkipError || (e as any)?.name === 'SoftSkipError'
}

export function isRetryableError(e: unknown): boolean {
  if (isSoftSkip(e)) return false
  const msg = String((e as any)?.message || e || '').toLowerCase()
  if (msg.includes('needs_credentials') || msg.includes('not configured')) return false
  if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('401') || msg.includes('403'))
    return false
  // rede / 5xx / timeout
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('fetch') ||
    msg.includes('econn') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('429') ||
    msg.includes('unavailable')
  )
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number; baseDelayMs?: number; label?: string }
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3
  const baseDelayMs = opts?.baseDelayMs ?? 400
  let last: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (!isRetryableError(e) || attempt >= maxAttempts) throw e
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw last
}
