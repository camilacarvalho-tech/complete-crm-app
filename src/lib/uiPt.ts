export const STATUS_PT: Record<string, string> = {
  todas: 'Todas',
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  em_analise: 'Em análise',
  aprovada: 'Aprovada',
  recusada: 'Reprovada',
  reprovada: 'Reprovada',
  cancelada: 'Cancelada',
  aguardando_assinatura: 'Aguardando assinatura',
  intencao_enviada: 'Intenção enviada',
  operacao_finalizada: 'Operação finalizada',
  finalizada: 'Finalizada',
  nova: 'Nova',
  em_digitacao: 'Em digitação',
  pendencia: 'Pendência',
  paga: 'Paga',
  agendada: 'Agendada',
  em_execucao: 'Em execução',
  pausada: 'Pausada',
  ativa: 'Ativa',
  aberto: 'Aberto',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  compromisso: 'Compromisso',
  tarefa: 'Tarefa',
  'follow-up': 'Follow-up',
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  vencimento: 'Vencimento',
  not_configured: 'Não configurado',
  online: 'Online',
  error: 'Erro',
  enviando: 'Enviando',
  em_atendimento: 'Em atendimento',
  aguardando_triagem: 'Aguardando triagem',
  triagem_andamento: 'Triagem em andamento',
  aguardando_humano: 'Aguardando humano',
  recebido: 'Recebido',
  validado: 'Validado',
  gerado: 'Gerado',
  assinado: 'Assinado',
  concluida: 'Concluída',
  aguardando_funcionario: 'Aguardando funcionário',
  finalizado: 'Finalizado',
  perdido: 'Perdido',
  enviado: 'Enviada',
  entregue: 'Entregue',
  lida: 'Lida',
  erro: 'Erro',
}

export function labelPt(value?: string) {
  const v = String(value || '').trim()
  if (!v) return '—'
  return STATUS_PT[v] || STATUS_PT[v.toLowerCase()] || v.replace(/_/g, ' ')
}

export function empresaVisivel(nome?: string | null, id?: string | null) {
  const n = String(nome || '').trim()
  if (n && !/homologacao/i.test(n)) return n
  const i = String(id || '').trim()
  if (i && !/homologacao/i.test(i)) return i
  return 'CODE Tecnologia'
}
