/**
 * Etapa 3 — Deduplicação.
 */
import type { NormalizedLead } from '../connectors/types'

function digits(v?: string) {
  return (v || '').replace(/\D/g, '')
}

export function buildDedupeKey(
  lead: Pick<NormalizedLead, 'dedupeKey' | 'telefone' | 'email' | 'cnpj' | 'nome'>
): string {
  if (lead.dedupeKey) return lead.dedupeKey.toLowerCase()
  const cnpj = digits(lead.cnpj)
  if (cnpj.length >= 14) return `cnpj:${cnpj}`
  const tel = digits(lead.telefone)
  if (tel.length >= 10) return `tel:${tel}`
  const email = (lead.email || '').trim().toLowerCase()
  if (email.includes('@')) return `email:${email}`
  return `nome:${(lead.nome || '').trim().toLowerCase()}`
}

export function deduplicateLeads(
  incoming: NormalizedLead[],
  existingKeys: Set<string>
): { unicos: NormalizedLead[]; duplicados: NormalizedLead[] } {
  const seen = new Set(existingKeys)
  const unicos: NormalizedLead[] = []
  const duplicados: NormalizedLead[] = []

  for (const item of incoming) {
    const key = buildDedupeKey(item)
    const withKey = { ...item, dedupeKey: key }
    if (seen.has(key)) {
      duplicados.push(withKey)
      continue
    }
    seen.add(key)
    unicos.push(withKey)
  }

  return { unicos, duplicados }
}
