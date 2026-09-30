export function digits(value?: string): string {
  return (value || '').replace(/\D/g, '')
}

/** Celular do Brasil com ou sem 55 vira o mesmo número. */
export function chaveTelefoneBr(value?: string): string {
  let d = digits(value)
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2)
  return d
}

export function mesmoTelefoneBr(a?: string, b?: string): boolean {
  const x = chaveTelefoneBr(a)
  const y = chaveTelefoneBr(b)
  return x.length >= 10 && x === y
}

export function normalizeEmail(value?: string): string {
  return (value || '').trim().toLowerCase()
}

export function toUpperCode(value?: string): string {
  return (value || '').trim().toUpperCase()
}

export function toTitleCase(value?: string): string {
  return (value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (['de', 'da', 'do', 'das', 'dos', 'e'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

export function normalizePersonName(value?: string): string {
  return toTitleCase(value)
}

export function normalizeCompanyName(value?: string): string {
  return (value || '').trim()
}

export function redactCpf(value?: string): string {
  const d = digits(value)
  if (!d) return ''
  if (d.length < 2) return '***.***.***-**'
  return `***.***.***-${d.slice(-2)}`
}

export function maskCpf(value?: string): string {
  const d = digits(value).slice(0, 11)
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) => (e ? `${a}.${b}.${c}-${e}` : `${a}.${b}.${c}`))
}

export function maskCnpj(value?: string): string {
  const d = digits(value).slice(0, 14)
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d4, e) => (e ? `${a}.${b}.${c}/${d4}-${e}` : `${a}.${b}.${c}/${d4}`))
}

export function maskPhone(value?: string): string {
  const d = digits(value)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

export function normalizeDocument(value?: string): string {
  const d = digits(value)
  if (d.length <= 11) return maskCpf(d)
  return maskCnpj(d)
}
