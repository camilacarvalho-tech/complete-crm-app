export const BASE_LEGAL_OPCOES = [
  'Consentimento',
  'Legítimo interesse',
  'Cumprimento de obrigação legal/regulatória',
  'Execução de contrato',
  'Exercício regular de direitos',
  'Outra hipótese legal aplicável',
  'Pendente de definição',
] as const

export const RETENTION_STATUS = [
  'Ativo',
  'Em revisão',
  'Expirado',
  'Marcado para exclusão',
  'Excluído',
] as const

export const TITULAR_SOLICITACOES = [
  'Consulta',
  'Correção',
  'Atualização',
  'Exclusão quando aplicável',
  'Oposição quando aplicável',
  'Revogação de consentimento quando aplicável',
  'Outras solicitações',
] as const

export function lgpdText(value?: unknown): string {
  const s = value == null ? '' : String(value).trim()
  return s || 'Não informado'
}

export function governancaFromRecord(input: {
  origemDado?: unknown
  fonteDado?: unknown
  origemLabel?: unknown
  connectorId?: unknown
  finalidadeTratamento?: unknown
  baseLegal?: unknown
  coletadoEm?: unknown
  atualizadoEm?: unknown
  criadoEm?: unknown
  retentionStatus?: unknown
}) {
  return {
    origem: lgpdText(input.origemDado || input.origemLabel),
    fonte: lgpdText(input.fonteDado || input.origemLabel || input.connectorId),
    finalidade: lgpdText(input.finalidadeTratamento),
    baseLegal: lgpdText(input.baseLegal),
    coletadoEm: input.coletadoEm || input.criadoEm || null,
    atualizadoEm: input.atualizadoEm || null,
    retentionStatus: lgpdText(input.retentionStatus),
  }
}
