import type { EnrichmentProvider } from './enrichmentProvider'
import { authorizedApiProvider } from './providers/authorizedApiProvider'
import { authorizedImportProvider } from './providers/authorizedImportProvider'
import { licensedPersonProvider } from './providers/licensedPersonProvider'
import { officialPublicProvider } from './providers/officialPublicProvider'

const providers = new Map<string, EnrichmentProvider>()

export function registerEnrichmentProvider(provider: EnrichmentProvider) {
  providers.set(provider.id, provider)
}

export function getEnrichmentProviders(): EnrichmentProvider[] {
  return Array.from(providers.values())
}

export function getActiveEnrichmentProviders(): EnrichmentProvider[] {
  return getEnrichmentProviders().filter((p) => p.status === 'ACTIVE')
}

export function getCallableEnrichmentProviders(): EnrichmentProvider[] {
  return getEnrichmentProviders().filter((p) => p.status === 'ACTIVE' && p.type !== 'AUTHORIZED_IMPORT')
}

export function getConfiguredEnrichmentProviders(): EnrichmentProvider[] {
  return getEnrichmentProviders().filter((p) => p.status === 'ACTIVE' || p.status === 'INACTIVE')
}

function bootstrap() {
  if (providers.size) return
  registerEnrichmentProvider(authorizedImportProvider)
  registerEnrichmentProvider(authorizedApiProvider)
  registerEnrichmentProvider(licensedPersonProvider)
  registerEnrichmentProvider(officialPublicProvider)
}

bootstrap()
