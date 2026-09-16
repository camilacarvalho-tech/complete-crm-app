/**
 * Normalização de campos comerciais (telefone, CNPJ, nome, endereço, CEP, domínio).
 * Não inventa dados — só padroniza o que já existe.
 */

export function digitsOnly(value?: string): string {
  return (value || '').replace(/\D/g, '')
}

export function normalizeCompanyName(nome?: string): string {
  return String(nome || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeCep(cep?: string): string {
  const d = digitsOnly(cep)
  if (d.length !== 8) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function formatCnpj(cnpj?: string): string {
  const d = digitsOnly(cnpj)
  if (d.length !== 14) return d
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatPhoneBr(telefone?: string): string {
  const n = digitsOnly(telefone)
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  if (n.length === 13 && n.startsWith('55')) {
    return formatPhoneBr(n.slice(2))
  }
  return telefone?.trim() || ''
}

/** Padrão de exibição internacional BR: +55 14 3322-4214. Não inventa dígitos. */
export function formatPhoneBrIntl(telefone?: string): string {
  let n = digitsOnly(telefone)
  if (n.startsWith('55') && (n.length === 12 || n.length === 13)) n = n.slice(2)
  if (n.length === 11) return `+55 ${n.slice(0, 2)} ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `+55 ${n.slice(0, 2)} ${n.slice(2, 6)}-${n.slice(6)}`
  return ''
}

export function whatsappMeUrl(telefone?: string): string {
  let n = digitsOnly(telefone)
  if (!n) return ''
  if (!n.startsWith('55') && (n.length === 10 || n.length === 11)) n = `55${n}`
  if (n.length < 12) return ''
  return `https://wa.me/${n}`
}

export function hostnameFromUrl(website?: string): string {
  if (!website) return ''
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`)
    return url.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

export function extractCnpj(text?: string): string | null {
  if (!text) return null
  const match = text.replace(/\s/g, '').match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/)
  if (!match) return null
  const d = digitsOnly(match[0])
  return d.length === 14 ? d : null
}

export function normalizeAddress(endereco?: string): string {
  return String(endereco || '')
    .replace(/\s+/g, ' ')
    .trim()
}
