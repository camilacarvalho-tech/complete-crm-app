/** Preferências UI locais — NÃO usar como fonte de verdade de negócio */

export function getEmpresaId(empresa?: { id?: string } | null): string {
  const id =
    empresa?.id ||
    localStorage.getItem('empresaId') ||
    localStorage.getItem('nexus_empresa_id') ||
    ''
  return id
}

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function storeKey(empresaId: string, collection: string): string {
  return `nexus_${collection}_${empresaId}`
}
