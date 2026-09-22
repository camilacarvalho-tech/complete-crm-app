/** Status da fila de enriquecimento → atendimento. Não substitui PERSON_LEAD. */
export type PersonPipelineStatus =
  | 'aguardando_enriquecimento'
  | 'enriquecendo'
  | 'enriquecido'
  | 'enriquecimento_parcial'
  | 'erro_enriquecimento'
  | 'aguardando_validacao'
  | 'pronto_atendimento'

export type PersonAtendimentoStatus = 'nao_enviado' | 'na_fila' | 'em_atendimento'

export function pipelineFromEnrichment(
  enrichmentStatus: string,
  validForAtendimento: boolean
): PersonPipelineStatus {
  if (enrichmentStatus === 'PROCESSING' || enrichmentStatus === 'QUEUED') {
    return enrichmentStatus === 'PROCESSING' ? 'enriquecendo' : 'aguardando_enriquecimento'
  }
  if (enrichmentStatus === 'ERROR') return 'erro_enriquecimento'
  if (enrichmentStatus === 'NO_PROVIDER' || enrichmentStatus === 'NOT_ENRICHED') {
    return 'aguardando_enriquecimento'
  }
  if (enrichmentStatus === 'PARTIAL') {
    return validForAtendimento ? 'aguardando_validacao' : 'enriquecimento_parcial'
  }
  if (enrichmentStatus === 'ENRICHED') {
    return validForAtendimento ? 'aguardando_validacao' : 'enriquecido'
  }
  return validForAtendimento ? 'pronto_atendimento' : 'enriquecido'
}

export function isValidForAtendimento(person: {
  nome?: string
  personName?: string
  cpf?: string
  telefone?: string
  phone?: string
  whatsapp?: string
}): boolean {
  const nome = String(person.nome || person.personName || '').trim()
  const letters = (nome.match(/[A-Za-zÀ-ÿ]/g) || []).length
  if (letters < 3) return false
  const cpf = String(person.cpf || '').replace(/\D/g, '')
  const tel = String(person.telefone || person.phone || '').replace(/\D/g, '')
  const wa = String(person.whatsapp || '').replace(/\D/g, '')
  return cpf.length === 11 || tel.length >= 10 || wa.length >= 10
}
