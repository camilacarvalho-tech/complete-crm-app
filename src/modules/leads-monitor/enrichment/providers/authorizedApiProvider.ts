import { ENRICHABLE_FIELDS } from '../enrichmentTypes'
import type { EnrichmentProvider } from '../enrichmentProvider'
import { notConfiguredResult } from '../enrichmentProvider'

/**
 * API autorizada futura.
 * Lê apenas nomes de env — sem valor, sem chamada, sem chave no código.
 * Segredo de API deve ir para backend quando existir.
 */
function envUrl(): string {
  try {
    return String((import.meta as { env?: Record<string, string> }).env?.VITE_ENRICHMENT_API_URL || '').trim()
  } catch {
    return ''
  }
}

function envKeyPresent(): boolean {
  try {
    return Boolean(String((import.meta as { env?: Record<string, string> }).env?.VITE_ENRICHMENT_API_KEY || '').trim())
  } catch {
    return false
  }
}

const hasUrl = Boolean(envUrl())
const hasKey = envKeyPresent()

export const authorizedApiProvider: EnrichmentProvider = {
  id: 'authorized_api',
  name: 'API autorizada de pessoas',
  type: 'AUTHORIZED_API',
  status: hasUrl || hasKey ? 'INACTIVE' : 'NOT_CONFIGURED',
  supportedFields: [...ENRICHABLE_FIELDS],
  async enrich() {
    if (hasKey) {
      const r = notConfiguredResult(this.id, this.name)
      r.message =
        'Há indício de chave no frontend. O adapter de enriquecimento deve usar backend — a chave não é usada daqui.'
      r.status = 'NO_PROVIDER'
      return r
    }
    return notConfiguredResult(this.id, this.name)
  },
}
