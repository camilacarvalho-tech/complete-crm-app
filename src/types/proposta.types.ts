export type PropostaStatus = 'rascunho' | 'enviada' | 'aceita' | 'recusada'

export interface Proposta {
  id: string
  clienteId: string
  clienteNome: string
  valor: number
  modalidade: string
  status: PropostaStatus
  templateId?: string
  conteudo: string
  criadoEm: Date | null
  enviadoEm?: Date | null
}

export interface PropostaInput {
  clienteId: string
  clienteNome: string
  valor: number
  modalidade: string
  status: PropostaStatus
  templateId?: string
  conteudo: string
}

export const PROPOSTA_TEMPLATES = [
  {
    id: 'consignado',
    nome: 'Consignado INSS',
    conteudo: `Prezado(a) {{cliente}},

Segue nossa proposta de crédito consignado INSS no valor de R$ {{valor}}.

Modalidade: {{modalidade}}
Condições sujeitas à análise bancária.

Atenciosamente,
Nexus CRM – CodeFlow Tecnologia`,
  },
  {
    id: 'fgts',
    nome: 'Antecipação FGTS',
    conteudo: `Olá {{cliente}},

Proposta de antecipação FGTS no valor de R$ {{valor}}.

Modalidade: {{modalidade}}
Documentação necessária será solicitada após aceite.

Nexus CRM`,
  },
  {
    id: 'personalizado',
    nome: 'Personalizado',
    conteudo: `Proposta comercial para {{cliente}}

Valor: R$ {{valor}}
Modalidade: {{modalidade}}

[Edite o texto conforme necessário]`,
  },
]

export function aplicarTemplate(conteudo: string, vars: { cliente: string; valor: string; modalidade: string }) {
  return conteudo
    .replace(/\{\{cliente\}\}/g, vars.cliente)
    .replace(/\{\{valor\}\}/g, vars.valor)
    .replace(/\{\{modalidade\}\}/g, vars.modalidade)
}
