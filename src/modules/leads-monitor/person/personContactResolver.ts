/**
 * Resolve contato pessoal somente a partir do que a fonte entregou.
 * Telefone da empresa nunca vira WhatsApp/telefone da pessoa.
 */
import { digitsOnly } from '../pipeline/normalizeFields'
import type { DiscoveredPersonRaw, PersonContactStatus, PersonContactType } from './personSourceTypes'

export type ResolvedPersonContact = {
  whatsapp: string
  telefone: string
  email: string
  contactType: PersonContactType
  contactStatus: PersonContactStatus
}

function sameAsCompany(value: string, companyPhone?: string): boolean {
  const a = digitsOnly(value)
  const b = digitsOnly(companyPhone)
  return Boolean(a && b && a === b)
}

export function resolvePersonContact(opts: {
  whatsapp?: string
  phone?: string
  email?: string
  companyPhone?: string
  contactTypeHint?: PersonContactType
}): ResolvedPersonContact {
  const waRaw = String(opts.whatsapp || '').trim()
  const phoneRaw = String(opts.phone || '').trim()
  const email = String(opts.email || '').trim()
  const companyHit = sameAsCompany(phoneRaw, opts.companyPhone) || sameAsCompany(waRaw, opts.companyPhone)

  if (companyHit || opts.contactTypeHint === 'COMPANY') {
    return {
      whatsapp: '',
      telefone: '',
      email,
      contactType: 'COMPANY',
      contactStatus: email.includes('@') ? 'EMAIL' : 'NONE',
    }
  }

  const wa = digitsOnly(waRaw).length >= 10 ? waRaw : ''
  const tel = digitsOnly(phoneRaw).length >= 10 ? phoneRaw : ''
  if (wa) {
    return { whatsapp: wa, telefone: tel, email, contactType: 'PERSON', contactStatus: 'WHATSAPP' }
  }
  if (tel) {
    return { whatsapp: '', telefone: tel, email, contactType: 'PERSON', contactStatus: 'PHONE' }
  }
  if (email.includes('@')) {
    return { whatsapp: '', telefone: '', email, contactType: 'PROFESSIONAL', contactStatus: 'EMAIL' }
  }
  return { whatsapp: '', telefone: '', email: '', contactType: 'UNKNOWN', contactStatus: 'NONE' }
}
