/**
 * URLs públicas opcionais no Vite. Chaves (ERP_API_KEY / CRM_API_KEY)
 * só no backend (Functions / Secret Manager) — nunca no frontend.
 */
function readVite(key: string): string {
  try {
    return String((import.meta as { env?: Record<string, string> }).env?.[key] || '').trim()
  } catch {
    return ''
  }
}

export function getErpApiUrl(): string {
  return readVite('VITE_ERP_API_URL')
}

export function getCrmApiUrl(): string {
  return readVite('VITE_CRM_API_URL')
}

export function integrationMode(): 'mock' | 'url_only' {
  return getErpApiUrl() || getCrmApiUrl() ? 'url_only' : 'mock'
}
