/**
 * Resolve paths JSON tipo "data.items.0.nome" / "lead.phone"
 */
export function getByPath(obj: unknown, path?: string): unknown {
  if (!path || !path.trim()) return obj
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let cur: any = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

export function asString(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

export function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v
  if (v == null) return fallback
  const s = String(v).toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes' || s === 'sim') return true
  if (s === 'false' || s === '0' || s === 'no' || s === 'nao' || s === 'não') return false
  return fallback
}

/** Extrai array de itens de uma resposta JSON usando itemsPath. */
export function extractItems(payload: unknown, itemsPath?: string): Record<string, unknown>[] {
  const root = itemsPath ? getByPath(payload, itemsPath) : payload
  if (Array.isArray(root)) {
    return root.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
  }
  if (root && typeof root === 'object') return [root as Record<string, unknown>]
  return []
}

export function applyTemplate(
  template: Record<string, unknown> | undefined,
  vars: Record<string, string>
): Record<string, unknown> | undefined {
  if (!template) return undefined
  const raw = JSON.stringify(template)
  const filled = raw.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key] ?? ''
    return JSON.stringify(v).slice(1, -1)
  })
  try {
    return JSON.parse(filled)
  } catch {
    return template
  }
}
