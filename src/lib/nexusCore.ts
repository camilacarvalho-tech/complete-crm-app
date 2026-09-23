import { PIPELINE_STAGES, type UserRole } from '../types/nexus'

export function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate()
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && value && 'seconds' in value) {
    return new Date(Number((value as { seconds: number }).seconds) * 1000)
  }
  return null
}

export type PeriodKey = 'hoje' | 'ontem' | '7d' | '30d' | 'mes' | 'mes_anterior' | 'custom'

export function periodRange(key: PeriodKey, custom?: { from?: string; to?: string }): { from: Date; to: Date } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  if (key === 'hoje') return { from: startOfDay(now), to: endOfDay(now) }
  if (key === 'ontem') {
    const y = new Date(now)
    y.setDate(now.getDate() - 1)
    return { from: startOfDay(y), to: endOfDay(y) }
  }
  if (key === '7d') {
    const from = new Date(now)
    from.setDate(now.getDate() - 6)
    return { from: startOfDay(from), to: endOfDay(now) }
  }
  if (key === '30d') {
    const from = new Date(now)
    from.setDate(now.getDate() - 29)
    return { from: startOfDay(from), to: endOfDay(now) }
  }
  if (key === 'mes') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) }
  if (key === 'mes_anterior') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { from, to }
  }
  const from = custom?.from ? startOfDay(new Date(custom.from)) : startOfDay(now)
  const to = custom?.to ? endOfDay(new Date(custom.to)) : endOfDay(now)
  return { from, to }
}

export function previousRange(current: { from: Date; to: Date }): { from: Date; to: Date } {
  const span = current.to.getTime() - current.from.getTime()
  const to = new Date(current.from.getTime() - 1)
  const from = new Date(to.getTime() - span)
  return { from, to }
}

export function inRange(value: unknown, from: Date, to: Date): boolean {
  const d = toDate(value)
  if (!d) return false
  return d >= from && d <= to
}

export function createdOf(item: { criadoEm?: unknown; created_at?: unknown; data?: unknown }): unknown {
  return item.criadoEm ?? item.created_at ?? item.data
}

export function digits(value?: string): string {
  return (value || '').replace(/\D/g, '')
}

export function normalizeEmail(value?: string): string {
  return (value || '').trim().toLowerCase()
}

export function findSimilarClientes<T extends { id: string; cpf?: string; telefone?: string; whatsapp?: string; email?: string; nome?: string; empresaNome?: string }>(
  list: T[],
  candidate: { cpf?: string; telefone?: string; whatsapp?: string; email?: string; nome?: string; empresaNome?: string },
  excludeId?: string
): T[] {
  const cpf = digits(candidate.cpf)
  const tel = digits(candidate.telefone || candidate.whatsapp)
  const email = normalizeEmail(candidate.email)
  const nome = String(candidate.nome || '').trim().toLowerCase()
  const empresa = String(candidate.empresaNome || '').trim().toLowerCase()
  return list.filter((item) => {
    if (excludeId && item.id === excludeId) return false
    if (cpf && digits(item.cpf) === cpf && cpf.length >= 11) return true
    if (tel.length >= 10 && (digits(item.telefone) === tel || digits(item.whatsapp) === tel)) return true
    if (email && normalizeEmail(item.email) === email) return true
    if (
      nome &&
      empresa &&
      String(item.nome || '').trim().toLowerCase() === nome &&
      String(item.empresaNome || '').trim().toLowerCase() === empresa
    ) {
      return true
    }
    return false
  })
}

const STAGE_ALIASES: Record<string, string> = {
  primeiro_contato: 'triagem',
  qualificacao: 'qualificado',
  digitacao: 'em_analise',
  aguardando_banco: 'em_analise',
  pagamento: 'contrato',
  concluido: 'finalizado',
}

export function normalizeStage(id?: string): string {
  const raw = String(id || '').trim()
  if (STAGE_ALIASES[raw]) return STAGE_ALIASES[raw]
  return raw
}

export function stageLabel(id?: string): string {
  const n = normalizeStage(id)
  return PIPELINE_STAGES.find((s) => s.id === n || s.label === n || s.label === id)?.label || n || 'NOVO LEAD'
}

export function stageIdFromLegacy(status?: string, pipeline?: string): string {
  const raw = (pipeline || status || 'Lead').toLowerCase()
  if (raw.includes('cancel')) return 'cancelado'
  if (raw.includes('perdid') || raw.includes('recus')) return 'perdido'
  if (raw.includes('pago') || raw.includes('conclu') || raw.includes('finaliz')) return 'finalizado'
  if (raw.includes('contrato')) return 'contrato'
  if (raw.includes('aprov')) return 'aprovado'
  if (raw.includes('digit') || raw.includes('banco') || raw.includes('analise')) return 'em_analise'
  if (raw.includes('proposta')) return 'proposta'
  if (raw.includes('doc')) return 'documentacao'
  if (raw.includes('simul')) return 'simulacao'
  if (raw.includes('qualif')) return 'qualificado'
  if (raw.includes('aguard')) return 'aguardando_cliente'
  if (raw.includes('triagem') || raw.includes('contato')) return 'triagem'
  if (raw.includes('atend')) return 'em_atendimento'
  return 'novo_lead'
}

const ADMIN_ROLES: UserRole[] = ['MASTER', 'SUPER_ADMIN', 'ADMIN', 'GESTOR']

export function canAccessPath(role: string | undefined, path: string): boolean {
  const r = (role || 'VENDEDOR').toUpperCase() as UserRole
  if (ADMIN_ROLES.includes(r) || r === 'SUPERVISOR') return true
  if (r === 'CONSULTA') {
    return !['/configuracoes', '/empresas', '/nexus-ai-financeiro'].includes(path)
  }
  if (r === 'FINANCEIRO') {
    return ['/', '/financeiro', '/fluxo-caixa', '/faturamento', '/notas-fiscais', '/dre', '/contas-pagar', '/contas-receber', '/relatorios', '/clientes', '/nexus-ai-financeiro', '/marketing-roi', '/diagnostico', '/auditoria'].includes(path)
  }
  if (r === 'MARKETING') {
    return ['/', '/campanhas', '/remarketing', '/marketing-roi', '/leads-monitor', '/nexus-ai', '/relatorios', '/clientes', '/whatsapp', '/automacoes'].includes(path)
  }
  if (['VENDEDOR', 'ATENDENTE', 'OPERADOR'].includes(r)) {
    return !['/empresas', '/configuracoes', '/financeiro', '/fluxo-caixa', '/faturamento', '/notas-fiscais', '/nexus-ai-financeiro', '/auditoria'].includes(path)
  }
  return true
}

const FINANCE_ROLES = ['MASTER', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'FINANCEIRO', 'SUPERVISOR']
const INTEGRATION_ROLES = ['MASTER', 'SUPER_ADMIN', 'ADMIN', 'GESTOR']

export function canSeeFinance(role: string | undefined): boolean {
  return FINANCE_ROLES.includes((role || '').toUpperCase())
}

export function canManageIntegrations(role: string | undefined): boolean {
  return INTEGRATION_ROLES.includes((role || '').toUpperCase())
}

export function canMutate(role: string | undefined): boolean {
  const r = (role || 'VENDEDOR').toUpperCase()
  return r !== 'CONSULTA'
}

export function money(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function pct(part: number, total: number): string {
  if (!total) return '0%'
  return `${((part / total) * 100).toFixed(1)}%`
}
