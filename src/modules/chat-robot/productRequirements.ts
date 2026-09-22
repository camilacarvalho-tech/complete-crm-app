export type RequirementRule = {
  produto: string
  operacao: string
  documents: string[]
  pendingConfig: boolean
  note: string
}

/** Só categorias já existentes no CRM. Sem exigências inventadas. */
const RULES: RequirementRule[] = [
  {
    produto: 'INSS',
    operacao: 'PORTABILIDADE',
    documents: ['RG', 'CPF', 'CNH', 'Documentos de portabilidade', 'Extrato'],
    pendingConfig: false,
    note: 'Documentos já cadastrados no CRM para portabilidade.',
  },
  {
    produto: 'INSS',
    operacao: 'REFINANCIAMENTO',
    documents: ['RG', 'CPF', 'Extrato', 'Contrato'],
    pendingConfig: false,
    note: 'Documentos já cadastrados no CRM para refinanciamento.',
  },
  {
    produto: 'INSS',
    operacao: 'REDUÇÃO DE PARCELA',
    documents: ['RG', 'CPF', 'Extrato'],
    pendingConfig: false,
    note: 'Documentos já cadastrados no CRM.',
  },
  {
    produto: 'INSS',
    operacao: 'MARGEM NOVA',
    documents: ['RG', 'CPF', 'Comprovante de residência', 'Extrato'],
    pendingConfig: false,
    note: 'Documentos já cadastrados no CRM.',
  },
  {
    produto: 'FGTS',
    operacao: '',
    documents: ['RG', 'CPF', 'Documentos bancários'],
    pendingConfig: true,
    note: 'Pendente de configuração da operação FGTS específica.',
  },
]

export function requirementsFor(produto?: string, operacao?: string): RequirementRule {
  const p = String(produto || '').toUpperCase()
  const o = String(operacao || '').toUpperCase()
  const exact = RULES.find((r) => r.produto === p && r.operacao === o)
  if (exact) return exact
  const byProduct = RULES.find((r) => r.produto === p && !r.operacao)
  if (byProduct) return byProduct
  return {
    produto: p || '',
    operacao: o || '',
    documents: ['RG', 'CPF'],
    pendingConfig: true,
    note: 'Pendente de configuração. Sem regra documentada para este produto/operação.',
  }
}

export function detectProductOperation(text: string): { produto: string; operacao: string } {
  const t = String(text || '').toLowerCase()
  let produto = ''
  let operacao = ''
  if (/\binss\b|aposentad|pensionista/.test(t)) produto = 'INSS'
  else if (/\bfgts\b/.test(t)) produto = 'FGTS'
  else if (/consignado/.test(t)) produto = 'CONSIGNADO'
  if (/portabil/.test(t)) operacao = 'PORTABILIDADE'
  else if (/refinanc/.test(t)) operacao = 'REFINANCIAMENTO'
  else if (/redu[cç][aã]o/.test(t)) operacao = 'REDUÇÃO DE PARCELA'
  else if (/margem/.test(t)) operacao = 'MARGEM NOVA'
  return { produto, operacao }
}

export function pickKnownInssFields(data: Record<string, unknown>): Record<string, string> {
  const keys = ['beneficio', 'contratos', 'banco', 'contrato', 'parcela', 'prazo', 'saldo', 'saldoDevedor', 'margem', 'troco']
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = data[k]
    out[k] = v == null || v === '' ? '' : String(v)
  }
  return out
}
