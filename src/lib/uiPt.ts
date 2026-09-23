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
  aguardando_cliente: 'Aguardando cliente',
  documentacao_pendente: 'Documentação pendente',
  erro: 'Erro',
  facebook: 'Facebook',
  instagram: 'Instagram',
  meta_ads: 'Meta Ads',
  google: 'Google',
  google_ads: 'Google Ads',
  trafego_pago: 'Tráfego pago',
  whatsapp: 'WhatsApp',
  manual: 'Manual',
  interna: 'Interna',
  campanha: 'Campanha',
  receita: 'Receita',
  despesa: 'Despesa',
  receber: 'A receber',
  pagar: 'A pagar',
  transferencia: 'Transferência',
  comissao: 'Comissão',
  investimento: 'Investimento',
  marketing: 'Marketing',
  novo_lead: 'Novo lead',
  novo_cliente: 'Novo cliente',
  nova_mensagem: 'Nova mensagem',
  proposta_criada: 'Proposta criada',
  proposta_aprovada: 'Proposta aprovada',
  proposta_recusada: 'Proposta recusada',
  novo_lancamento_financeiro: 'Novo lançamento',
  conta_vencida: 'Conta vencida',
  nova_tarefa: 'Nova tarefa',
  mudanca_pipeline: 'Mudança de etapa',
  horario_agendado: 'Horário agendado',
  'queue.entered': 'Entrou na fila',
  'status.alterado': 'Status alterado',
  'client.created': 'Cliente criado',
  mover: 'Moveu no quadro',
  criar: 'Criou',
  atualizar: 'Atualizou',
  excluir: 'Excluiu',
}

export function textoMisto(value?: string) {
  const raw = String(value || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  if (!raw) return ''
  const letters = raw.replace(/[^A-Za-zÀ-ÿ]/g, '')
  const gritando = letters.length > 2 && letters === letters.toUpperCase()
  const base = gritando ? raw.toLowerCase() : raw
  return base.replace(/(^|[\s\-/])([a-zà-ÿ])/gi, (all, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`)
}

export function labelPt(value?: string) {
  const v = String(value || '').trim()
  if (!v) return '—'
  return STATUS_PT[v] || STATUS_PT[v.toLowerCase()] || textoMisto(v)
}

export function empresaVisivel(nome?: string | null, id?: string | null) {
  const n = String(nome || '').trim()
  if (n && !/homologacao/i.test(n)) return n
  const i = String(id || '').trim()
  if (i && !/homologacao/i.test(i)) return i
  return 'CODE Tecnologia'
}
