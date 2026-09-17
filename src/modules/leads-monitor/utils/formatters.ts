export {
  digits,
  maskCpf,
  maskCnpj,
  maskPhone,
  redactCpf,
  normalizeEmail,
  normalizePersonName,
  normalizeCompanyName,
  toUpperCode,
  toTitleCase,
} from '../../../lib/format'

export function formatCep(value?: string): string {
  const d = (value || '').replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function faixaScoreLabel(score?: number): string {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'Não informado'
  if (n >= 70) return 'Alta prioridade'
  if (n >= 40) return 'Média prioridade'
  return 'Baixa prioridade'
}
