/** Etapas oficiais do Pipeline Nexus CRM 2.3 */
export const PIPELINE_ETAPAS = [
  'Novo Lead',
  'Primeiro Contato',
  'Qualificado',
  'Proposta',
  'Negociação',
  'Contrato',
  'Pago',
  'Pós-venda',
] as const

export type PipelineEtapa = (typeof PIPELINE_ETAPAS)[number]

export const PIPELINE_CORES: Record<PipelineEtapa, string> = {
  'Novo Lead': 'purple',
  'Primeiro Contato': 'blue',
  Qualificado: 'cyan',
  Proposta: 'yellow',
  Negociação: 'orange',
  Contrato: 'amber',
  Pago: 'green',
  'Pós-venda': 'teal',
}

export const TAG_COLORS = [
  { id: 'verde', label: 'Verde', bg: 'bg-green-500', text: 'text-green-100' },
  { id: 'azul', label: 'Azul', bg: 'bg-blue-500', text: 'text-blue-100' },
  { id: 'roxo', label: 'Roxo', bg: 'bg-purple-500', text: 'text-purple-100' },
  { id: 'laranja', label: 'Laranja', bg: 'bg-orange-500', text: 'text-orange-100' },
  { id: 'vermelho', label: 'Vermelho', bg: 'bg-red-500', text: 'text-red-100' },
  { id: 'rosa', label: 'Rosa', bg: 'bg-pink-500', text: 'text-pink-100' },
]

export const RESPOSTAS_RAPIDAS = [
  'Olá! Como posso ajudar?',
  'Obrigado pelo contato! Em breve retornamos.',
  'Poderia me enviar seu CPF, por favor?',
  'Segue o link da proposta.',
  'Horário de atendimento: seg–sáb, 07h–20h.',
  'Qualquer dúvida, estou à disposição!',
]

export const MENSAGENS_PRONTAS = [
  {
    titulo: 'Boas-vindas',
    texto: 'Olá! Seja bem-vindo(a) à nossa empresa. Em que posso ajudar hoje?',
  },
  {
    titulo: 'Proposta enviada',
    texto: 'Enviei a proposta para o seu WhatsApp/e-mail. Qualquer dúvida, me avise!',
  },
  {
    titulo: 'Documentos',
    texto: 'Para avançarmos, preciso dos seguintes documentos: RG/CNH, comprovante de residência e CPF.',
  },
  {
    titulo: 'Follow-up',
    texto: 'Olá! Estou passando para saber se teve a chance de analisar nossa proposta.',
  },
]
