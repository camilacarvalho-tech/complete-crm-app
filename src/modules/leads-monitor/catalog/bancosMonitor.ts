/** Catálogo local para o Monitor. Sem endpoint, token ou chamada real. */
export type BancoApiStatus = 'catalog_only'

export interface BancoMonitorProduto {
  bankId: string
  bankName: string
  productId: string
  productName: string
  apiStatus: BancoApiStatus
  apiEnabled: false
}

export const BANCOS_MONITOR: BancoMonitorProduto[] = [
  {
    bankId: 'facta',
    bankName: 'FACTA',
    productId: 'v8_novo_saque',
    productName: 'V8 — Novo Saque',
    apiStatus: 'catalog_only',
    apiEnabled: false,
  },
  {
    bankId: 'bmg',
    bankName: 'BMG',
    productId: 'produtos',
    productName: 'Produtos',
    apiStatus: 'catalog_only',
    apiEnabled: false,
  },
  {
    bankId: 'itau',
    bankName: 'Itaú',
    productId: 'produtos',
    productName: 'Produtos',
    apiStatus: 'catalog_only',
    apiEnabled: false,
  },
  {
    bankId: 'crefaz',
    bankName: 'Crefaz',
    productId: 'credito_pessoal',
    productName: 'Crédito Pessoal',
    apiStatus: 'catalog_only',
    apiEnabled: false,
  },
  {
    bankId: 'icred',
    bankName: 'iCred',
    productId: 'produtos',
    productName: 'Produtos',
    apiStatus: 'catalog_only',
    apiEnabled: false,
  },
]

export const BANCO_TODOS = 'todos'

export function bancoOptionLabel(b: BancoMonitorProduto) {
  return `${b.bankName} — ${b.productName}`
}

export function bancoCatalogEntry(bankId?: string) {
  if (!bankId || bankId === BANCO_TODOS) return null
  return BANCOS_MONITOR.find((b) => b.bankId === bankId) || null
}
