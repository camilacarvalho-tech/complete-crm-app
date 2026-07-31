export interface Cliente {
  id: string;
  // Dados pessoais
  nome: string;
  cpf: string;
  rg: string;
  whatsapp: string;
  telefone: string;
  email: string;
  // Endereço
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  // Produto
  modalidade: string;
  status: string;
  bancoCrm: string;
  origem: string;
  dataContato: string;
  observacoes?: string;
  // Dados bancários
  banco: string;
  agencia: string;
  tipoConta: string;
  numeroConta: string;
  valorSolicitado: string;
  // Senhas
  senhaGov: string;
  loginGov: string;
  senhaSiape: string;
  matriculaSiape: string;
  senhaPrefeitura: string;
  matriculaPrefeitura: string;
  senhaAppBanco: string;
  senhaInss: string;
  // Documentos (URLs do Firebase Storage)
  docRg?: string;
  docCnh?: string;
  docHolerite?: string;
  docExtratoConsignado?: string;
  docComprovResidencia?: string;
}

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  origem: string;
  status: 'novo' | 'contato' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';
  valor: number;
  probabilidade: number;
  dataContato: string;
  proximaAcao?: string;
  observacoes?: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'ligacao' | 'email' | 'reuniao' | 'follow-up' | 'outro';
  prioridade: 'baixa' | 'media' | 'alta';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  dataVencimento: string;
  clienteId?: string;
  leadId?: string;
  responsavel: string;
}

export interface Atividade {
  id: string;
  tipo: 'email' | 'ligacao' | 'reuniao' | 'nota' | 'status';
  titulo: string;
  descricao: string;
  data: string;
  clienteId?: string;
  leadId?: string;
  usuario: string;
}

export interface Meta {
  id: string;
  titulo: string;
  valor: number;
  valorAtual: number;
  periodo: 'mensal' | 'trimestral' | 'anual';
  tipo: 'vendas' | 'leads' | 'reunioes' | 'contratos';
}
