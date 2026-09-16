/**
 * Deduplicação — nunca inserir a mesma empresa duas vezes.
 * Prioridade: CNPJ → Place ID → domínio → telefone → nome + endereço.
 */
import type { NormalizedLead } from '../connectors/types'
import { digitsOnly, hostnameFromUrl, normalizeAddress, normalizeCompanyName } from './normalizeFields'

export function collectDedupeKeys(
  lead: Pick<
    NormalizedLead,
    'dedupeKey' | 'cnpj' | 'placeId' | 'dominio' | 'website' | 'telefone' | 'nome' | 'endereco' | 'cidade' | 'externalId'
  > & { metadados?: Record<string, unknown> }
): string[] {
  const keys: string[] = []
  const cnpj = digitsOnly(lead.cnpj)
  if (cnpj.length === 14) keys.push(`cnpj:${cnpj}`)
  const placeId = String(lead.placeId || lead.externalId || '').trim()
  if (placeId) keys.push(`place:${placeId.toLowerCase()}`)
  const dominio = (lead.dominio || hostnameFromUrl(lead.website)).toLowerCase()
  if (dominio) keys.push(`dom:${dominio}`)
  const tel = digitsOnly(lead.telefone)
  if (tel.length >= 10) keys.push(`tel:${tel}`)
  const email = String(lead.email || '').trim().toLowerCase()
  if (email.includes('@')) keys.push(`email:${email}`)
  const cpf = digitsOnly(String(lead.metadados?.cpf || ''))
  if (cpf.length === 11) keys.push(`cpf:${cpf}`)
  const personId = String(lead.metadados?.personId || '').trim()
  if (personId) keys.push(`person:${personId.toLowerCase()}`)
  const nome = normalizeCompanyName(lead.nome).toLowerCase()
  const empresaNome = normalizeCompanyName(String(lead.empresaNome || '')).toLowerCase()
  if (nome && empresaNome && nome !== empresaNome) keys.push(`pessoaemp:${nome}|${empresaNome}`)
  const endereco = normalizeAddress(lead.endereco || lead.cidade).toLowerCase()
  if (nome && endereco) keys.push(`nomeaddr:${nome}|${endereco}`)
  const lat = Number(lead.metadados?.lat)
  const lng = Number(lead.metadados?.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    keys.push(`geo:${lat.toFixed(4)},${lng.toFixed(4)}`)
  }
  if (lead.dedupeKey) keys.push(lead.dedupeKey.toLowerCase())
  return Array.from(new Set(keys.filter(Boolean)))
}

export function buildDedupeKey(
  lead: Pick<NormalizedLead, 'dedupeKey' | 'telefone' | 'email' | 'cnpj' | 'nome'> &
    Partial<Pick<NormalizedLead, 'placeId' | 'dominio' | 'website' | 'endereco' | 'cidade' | 'externalId'>>
): string {
  const keys = collectDedupeKeys(lead)
  return keys[0] || `nome:${normalizeCompanyName(lead.nome).toLowerCase()}`
}

export function deduplicateLeads(
  incoming: NormalizedLead[],
  existingKeys: Set<string>
): { unicos: NormalizedLead[]; duplicados: NormalizedLead[] } {
  const seen = new Set(existingKeys)
  const unicos: NormalizedLead[] = []
  const duplicados: NormalizedLead[] = []

  for (const item of incoming) {
    const keys = collectDedupeKeys(item)
    const primary = keys[0] || buildDedupeKey(item)
    const withKey = { ...item, dedupeKey: primary }
    if (keys.some((k) => seen.has(k))) {
      duplicados.push(withKey)
      continue
    }
    keys.forEach((k) => seen.add(k))
    unicos.push(withKey)
  }

  return { unicos, duplicados }
}

export function matchExistingId(
  lead: NormalizedLead,
  existing: Array<{ id: string; keys: string[] }>
): string | null {
  const keys = new Set(collectDedupeKeys(lead))
  for (const row of existing) {
    if (row.keys.some((k) => keys.has(k))) return row.id
  }
  return null
}
