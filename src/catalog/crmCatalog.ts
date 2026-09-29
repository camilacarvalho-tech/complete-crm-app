import {
  CANONICAL_ORIGINS,
  PRODUCT_CATALOG,
  canonicalOrigin,
  canonicalOriginLabel,
  findProduct,
  operationLabel,
  operationsFor,
} from './productCatalog.ts'

export const UFS_BRASIL = [
  { uf: 'AC', nome: 'ACRE' },
  { uf: 'AL', nome: 'ALAGOAS' },
  { uf: 'AP', nome: 'AMAPÁ' },
  { uf: 'AM', nome: 'AMAZONAS' },
  { uf: 'BA', nome: 'BAHIA' },
  { uf: 'CE', nome: 'CEARÁ' },
  { uf: 'DF', nome: 'DISTRITO FEDERAL' },
  { uf: 'ES', nome: 'ESPÍRITO SANTO' },
  { uf: 'GO', nome: 'GOIÁS' },
  { uf: 'MA', nome: 'MARANHÃO' },
  { uf: 'MT', nome: 'MATO GROSSO' },
  { uf: 'MS', nome: 'MATO GROSSO DO SUL' },
  { uf: 'MG', nome: 'MINAS GERAIS' },
  { uf: 'PA', nome: 'PARÁ' },
  { uf: 'PB', nome: 'PARAÍBA' },
  { uf: 'PR', nome: 'PARANÁ' },
  { uf: 'PE', nome: 'PERNAMBUCO' },
  { uf: 'PI', nome: 'PIAUÍ' },
  { uf: 'RJ', nome: 'RIO DE JANEIRO' },
  { uf: 'RN', nome: 'RIO GRANDE DO NORTE' },
  { uf: 'RS', nome: 'RIO GRANDE DO SUL' },
  { uf: 'RO', nome: 'RONDÔNIA' },
  { uf: 'RR', nome: 'RORAIMA' },
  { uf: 'SC', nome: 'SANTA CATARINA' },
  { uf: 'SP', nome: 'SÃO PAULO' },
  { uf: 'SE', nome: 'SERGIPE' },
  { uf: 'TO', nome: 'TOCANTINS' },
] as const

export const LEAD_ORIGINS = CANONICAL_ORIGINS

export const ATTENDANCE_STAGES = [
  { id: 'novo_lead', label: 'NOVO LEAD' },
  { id: 'triagem', label: 'TRIAGEM' },
  { id: 'em_atendimento', label: 'EM ATENDIMENTO' },
  { id: 'aguardando_cliente', label: 'AGUARDANDO CLIENTE' },
  { id: 'qualificado', label: 'QUALIFICADO' },
  { id: 'simulacao', label: 'SIMULAÇÃO' },
  { id: 'proposta', label: 'PROPOSTA' },
  { id: 'documentacao', label: 'DOCUMENTAÇÃO' },
  { id: 'em_analise', label: 'EM ANÁLISE' },
  { id: 'aprovado', label: 'APROVADO' },
  { id: 'contrato', label: 'CONTRATO' },
  { id: 'finalizado', label: 'FINALIZADO' },
  { id: 'perdido', label: 'PERDIDO' },
  { id: 'cancelado', label: 'CANCELADO' },
] as const

export const CONVENIOS_PADRAO = [
  { code: 'servidor_municipal', label: 'SERVIDOR MUNICIPAL' },
  { code: 'servidor_estadual', label: 'SERVIDOR ESTADUAL' },
  { code: 'servidor_federal', label: 'SERVIDOR FEDERAL' },
  { code: 'exercito', label: 'EXÉRCITO' },
  { code: 'marinha', label: 'MARINHA' },
  { code: 'aeronautica', label: 'AERONÁUTICA' },
  { code: 'gov_sp', label: 'GOVERNO DE SÃO PAULO' },
  { code: 'gov_rj', label: 'GOVERNO DO RIO DE JANEIRO' },
  { code: 'gov_mg', label: 'GOVERNO DE MINAS GERAIS' },
  { code: 'gov_pr', label: 'GOVERNO DO PARANÁ' },
  { code: 'gov_rs', label: 'GOVERNO DO RIO GRANDE DO SUL' },
  { code: 'inss', label: 'INSS' },
  { code: 'siape', label: 'SIAPE' },
  { code: 'clt', label: 'CLT' },
] as const

export const INSS_OPERACOES = operationsFor('INSS').map((o) => o.label)

export const PRODUCT_TREE = PRODUCT_CATALOG.map((p) => ({
  code: p.code,
  nome: p.label,
  categoria: p.categoria,
  sub: p.operations.map((o) => o.label),
}))

export function productLabel(code?: string): string {
  const found = findProduct(code)
  if (found) return found.label
  const op = operationLabel(code)
  if (op && op !== String(code || '').trim()) return op
  const raw = String(code || '').trim()
  return raw || '—'
}

export function productSubs(code?: string): string[] {
  return operationsFor(code).map((o) => o.label)
}

export const BANCOS_DIGITACAO = ['FACTA', 'NOVO SAQUE', 'ICRED', 'BANCO PAN'] as const

export function originLabel(code?: string): string {
  return canonicalOriginLabel(code)
}

export function originCode(value?: string): string {
  return canonicalOrigin(value)
}
