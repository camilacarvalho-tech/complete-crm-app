/**
 * CREDFLOW PLATFORM 2.0 - DATABASE TYPES
 * Sistema Multi-Tenant com isolamento por empresa_id
 */

// ============================================
// ENUMS E CONSTANTES
// ============================================

export enum PerfilUsuario {
  MASTER = 'master',           // CEO/Dona da plataforma - acesso global
  EMPRESARIO = 'empresario',   // Dono da empresa cliente - acesso à sua empresa
  FUNCIONARIO = 'funcionario'  // Atendente/colaborador - acesso aos seus registros
}

export enum StatusCliente {
  LEAD = 'lead',
  EM_ATENDIMENTO = 'em_atendimento',
  DOC_RECEBIDA = 'doc_recebida',
  ANALISE_BANCARIA = 'analise_bancaria',
  APROVADO = 'aprovado',
  PAGO = 'pago',
  SEM_CONTATO = 'sem_contato',
  REMARKETING = 'remarketing',
  RECUSADO = 'recusado'
}

export enum NichoEmpresa {
  CORRESPONDENTE_BANCARIO = 'correspondente_bancario',
  CLINICA_MEDICA = 'clinica_medica',
  ODONTOLOGIA = 'odontologia',
  PSICOLOGIA = 'psicologia',
  NUTRICAO = 'nutricao',
  ACADEMIA = 'academia'
}

export enum StatusEmpresa {
  ATIVO = 'ativo',
  INADIMPLENTE = 'inadimplente',
  CANCELADO = 'cancelado',
  TRIAL = 'trial'
}

export enum CanalOrigem {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  GOOGLE = 'google',
  LANDING_PAGE = 'landing_page',
  INDICACAO = 'indicacao',
  ORGANICO = 'organico',
  TIKTOK = 'tiktok'
}

export enum TipoLancamento {
  ENTRADA = 'entrada',
  SAIDA = 'saida'
}

export enum StatusLancamento {
  PAGO = 'pago',
  PENDENTE = 'pendente',
  ATRASADO = 'atrasado'
}

export enum StatusConversa {
  ABERTA = 'aberta',
  EM_ATENDIMENTO = 'em_atendimento',
  AGUARDANDO_CLIENTE = 'aguardando_cliente',
  RESOLVIDA = 'resolvida'
}

export enum StatusCampanha {
  ATIVA = 'ativa',
  PAUSADA = 'pausada',
  FINALIZADA = 'finalizada'
}

export enum TipoCampanha {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  META_ADS = 'meta_ads',
  GOOGLE_ADS = 'google_ads',
  LIGACAO = 'ligacao',
  AUTOMACAO = 'automacao'
}

export enum PrioridadeAnotacao {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta'
}

export enum StatusAnotacao {
  PENDENTE = 'pendente',
  CONCLUIDA = 'concluida'
}

export enum StatusRemarketing {
  NAO_INICIADO = 'nao_iniciado',
  EM_CAMPANHA = 'em_campanha',
  RECUPERADO = 'recuperado',
  DESCARTADO = 'descartado'
}

// ============================================
// ENTIDADES PRINCIPAIS
// ============================================

/**
 * EMPRESAS (Tenants)
 * Cada empresa é um tenant isolado no sistema
 */
export interface Empresa {
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cpf?: string  // Se for MEI ou autônomo
  
  // Dados do responsável
  responsavel: string
  telefone: string
  email: string
  
  // Segmentação
  nicho: NichoEmpresa
  planoId: string
  
  // Status e datas
  status: StatusEmpresa
  dataInicio: Date
  dataVencimento: Date
  
  // Financeiro
  valorPlano: number
  qtdFuncionariosInclusos: number
  valorFuncionarioExtra: number
  
  // Endereço
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  
  // Configurações do robô/chatbot
  nomeRobo?: string
  avatarRobo?: string
  promptRobo?: string
  canaisRoboAtivos?: CanalOrigem[]
  horarioRobo?: string
  
  // Metadata
  criadoEm: Date
  atualizadoEm: Date
}

/**
 * USUÁRIOS
 * Usuários vinculados a empresas (multi-tenant)
 */
export interface Usuario {
  id: string  // UID do Firebase Auth
  empresaId: string  // Chave de isolamento multi-tenant
  
  // Dados pessoais
  nome: string
  email: string
  telefone?: string
  avatar?: string
  
  // Perfil e permissões
  perfil: PerfilUsuario
  verFilaGeral?: boolean  // Se funcionário pode ver leads não atribuídos
  verFinanceiroEquipe?: boolean  // Se funcionário pode ver financeiro da equipe
  verRelatoriosEmpresa?: boolean  // Se funcionário pode ver relatórios gerais
  
  // Metadata
  ativo: boolean
  criadoEm: Date
  atualizadoEm: Date
  ultimoAcesso?: Date
}

/**
 * MÓDULOS DISPONÍVEIS
 * Lista de módulos que podem ser ativados por empresa
 */
export interface Modulo {
  id: string
  nome: string
  descricao: string
  icone: string
  nichos: NichoEmpresa[]  // Quais nichos podem usar este módulo
  obrigatorio: boolean  // Se é core (sempre ativo)
}

/**
 * EMPRESA_MODULOS (Relação N:N)
 * Quais módulos estão ativos para cada empresa
 */
export interface EmpresaModulo {
  id: string
  empresaId: string
  moduloId: string
  ativo: boolean
  criadoEm: Date
}

/**
 * CLIENTES
 * Leads/Clientes do CRM (isolados por empresa)
 */
export interface Cliente {
  id: string
  empresaId: string  // Chave de isolamento
  
  // Dados pessoais
  nome: string
  cpf?: string
  rg?: string
  dataNascimento?: Date
  telefone: string
  email?: string
  
  // Endereço
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  
  // Dados bancários do cliente
  banco?: string
  agencia?: string
  conta?: string
  tipoConta?: string
  pix?: string
  
  // Status e funil
  status: StatusCliente
  modalidade?: string  // Produto/serviço de interesse
  origem: CanalOrigem
  campanhaId?: string
  
  // Atendimento
  atendenteId?: string  // Quem está atendendo
  criadoPor: string  // Quem criou o registro
  
  // Campos extras por nicho (JSON flexível)
  camposExtras?: Record<string, any>
  
  // Metadata
  criadoEm: Date
  atualizadoEm: Date
  dataUltimaInteracao?: Date
  diasSemContato?: number
}

/**
 * CONVERSAS (Chat Center)
 * Conversas omnichannel isoladas por empresa
 */
export interface Conversa {
  id: string
  empresaId: string
  clienteId: string
  
  canal: CanalOrigem
  status: StatusConversa
  atendenteId?: string
  
  // Metadata
  criadoEm: Date
  atualizadoEm: Date
  resolvida?: boolean
  dataResolucao?: Date
}

/**
 * MENSAGENS
 * Mensagens dentro de conversas
 */
export interface Mensagem {
  id: string
  conversaId: string
  
  remetente: string  // 'cliente' | 'atendente' | 'robo'
  remetenteId?: string  // ID do usuário se for atendente
  nomeRemetente: string  // Ex: "Robô Leticia" ou "Atendente João"
  
  conteudo: string
  tipo: 'texto' | 'audio' | 'imagem' | 'documento' | 'link'
  anexoUrl?: string
  
  lida: boolean
  criadoEm: Date
}

/**
 * CAMPANHAS
 * Campanhas de marketing isoladas por empresa
 */
export interface Campanha {
  id: string
  empresaId: string
  
  // Dados básicos
  nome: string
  descricao?: string
  objetivo: string  // 'conversao' | 'mensagens' | 'trafego' | 'leads'
  tipo: TipoCampanha
  
  // Relacionamentos
  produtoId?: string  // Produto/serviço vinculado
  responsavelId: string
  
  // Período
  dataInicio: Date
  dataFim?: Date
  status: StatusCampanha
  
  // Financeiro
  orcamento?: number
  valorInvestido: number
  
  // Público
  publicoSelecionado: string[]  // IDs dos clientes
  publicoTotal: number
  
  // Métricas de envio
  smsEnviados: number
  whatsappEnviados: number
  emailsEnviados: number
  
  // Métricas de engajamento
  leadsAlcancados: number
  leadsGerados: number
  taxaAbertura: number  // %
  taxaResposta: number  // %
  conversoes: number
  
  // Métricas de anúncios
  impressoes?: number
  cliques?: number
  cpl?: number  // Custo por Lead
  cpc?: number  // Custo por Clique
  ctr?: number  // Taxa de Clique
  roi?: number  // Retorno sobre Investimento
  
  // Rastreamento
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  pixelId?: string
  
  // Tags e segmentação
  tags?: string[]
  
  // Metadata
  criadoEm: Date
  atualizadoEm: Date
}

/**
 * PRODUTOS
 * Produtos/serviços oferecidos (dinâmico por nicho)
 */
export interface Produto {
  id: string
  empresaId: string
  nicho: NichoEmpresa
  
  categoria: string  // Ex: INSS, FGTS, Consultas, Tratamentos
  nome: string
  descricao?: string
  valor?: number
  
  ativo: boolean
  criadoEm: Date
}

/**
 * SMS_DISPAROS
 * Disparos de SMS em massa
 */
export interface SmsDisparo {
  id: string
  empresaId: string
  campanhaId?: string
  
  nomeCampanha: string
  mensagem: string
  dataDisparo: Date
  
  // Estatísticas
  quantidadeEnviada: number
  entregues: number
  falhas: number
  cliques?: number
  conversoes: number
  
  // Metadata
  criadoPor: string
  criadoEm: Date
}

/**
 * SMS_RESPOSTAS
 * Respostas de clientes a SMS
 */
export interface SmsResposta {
  id: string
  empresaId: string
  smsDisparoId: string
  
  nome?: string
  cpf?: string
  telefone: string
  mensagemEnviada: string
  dataEnvio: Date
  
  status: 'entregue' | 'falhou' | 'pendente'
  respondeu: boolean
  resposta?: string
  dataResposta?: Date
  
  // Conversão
  transformadoEmLead: boolean
  clienteId?: string
  atendenteId?: string
}

/**
 * FINANCEIRO_LANCAMENTOS
 * Lançamentos financeiros (isolados por empresa)
 */
export interface FinanceiroLancamento {
  id: string
  empresaId: string
  
  tipo: TipoLancamento
  categoria: string  // Comissão, Salário, Marketing, Aluguel, Imposto, etc.
  centroCusto?: string
  descricao: string
  
  valor: number
  formaPagamento: string  // Pix, Boleto, Cartão, Dinheiro, Transferência
  
  dataLancamento: Date
  vencimento: Date
  status: StatusLancamento
  
  // Relacionamentos
  clienteId?: string
  empresaClienteId?: string  // Se for B2B
  
  // Recorrência
  recorrente: boolean
  periodicidade?: string  // mensal, trimestral, anual
  
  // Metadata
  criadoPor: string
  criadoEm: Date
  atualizadoEm: Date
}

/**
 * COMISSÕES
 * Comissões de atendentes (isoladas por empresa)
 */
export interface Comissao {
  id: string
  empresaId: string
  usuarioId: string
  
  valor: number
  percentual: number
  referencia: string  // Mês/ano ou descrição
  
  clienteId?: string
  pago: boolean
  dataPagamento?: Date
  
  criadoEm: Date
}

/**
 * CONTRATOS
 * Contratos de empresas B2B
 */
export interface Contrato {
  id: string
  empresaId: string
  
  arquivoPdf?: string  // URL do Firebase Storage
  dataAssinatura?: Date
  dataRenovacao?: Date
  assinado: boolean
  
  // Histórico de versões
  versao: number
  versaoAnteriorId?: string
  
  criadoEm: Date
  atualizadoEm: Date
}

/**
 * ANOTAÇÕES
 * Anotações/tarefas internas da empresa
 */
export interface Anotacao {
  id: string
  empresaId: string
  
  titulo: string
  conteudo: string
  categoria?: string
  tags?: string[]
  
  clienteId?: string  // Opcional: vincula a um cliente
  responsavelId: string
  
  prioridade: PrioridadeAnotacao
  status: StatusAnotacao
  
  dataVencimento?: Date
  fixarNoTopo: boolean
  compartilharComEquipe: boolean
  
  criadoEm: Date
  atualizadoEm: Date
}

/**
 * REMARKETING
 * Leads em remarketing (isolados por empresa)
 */
export interface Remarketing {
  id: string
  empresaId: string
  clienteId: string
  
  motivo: string  // 'recusado' | 'sem_contato' | 'perdido' | 'manual'
  dataEntrada: Date
  ultimaTentativa?: Date
  tentativasRealizadas: number
  
  status: StatusRemarketing
  
  // Campanha de reengajamento
  campanhaId?: string
  canalReengajamento?: CanalOrigem
  
  criadoEm: Date
}

/**
 * AUDITORIA_LOGS
 * Logs de auditoria para rastreamento
 */
export interface AuditoriaLog {
  id: string
  usuarioId: string
  empresaId?: string  // Pode ser null para ações globais do Master
  
  acao: string  // 'criar', 'editar', 'excluir', 'login', 'logout'
  entidade: string  // 'cliente', 'usuario', 'lancamento', etc.
  entidadeId?: string
  
  detalhes?: Record<string, any>  // JSON com dados antes/depois
  ip?: string
  
  timestamp: Date
}

/**
 * CONTATOS_CAMPANHA
 * Relacionamento entre clientes e campanhas
 */
export interface ContatoCampanha {
  id: string
  campanhaId: string
  clienteId: string
  empresaId: string
  
  // Dados do contato
  nome: string
  cpf?: string
  telefone: string
  email?: string
  cidade?: string
  estado?: string
  
  // Status de envio
  statusEnvio: 'enviado' | 'entregue' | 'falhou' | 'agendado' | 'pendente'
  dataEnvio?: Date
  dataEntrega?: Date
  dataResposta?: Date
  
  // Resposta
  respondeu: boolean
  resposta?: string
  
  criadoEm: Date
}

/**
 * MENSAGENS_CAMPANHA
 * Templates de mensagens para campanhas
 */
export interface MensagemCampanha {
  id: string
  campanhaId: string
  empresaId: string
  
  tipo: TipoCampanha
  titulo?: string  // Para emails
  conteudo: string
  variaveis: string[]  // Ex: ['nome', 'cpf', 'cidade']
  
  // Anexos
  anexos?: {
    tipo: 'imagem' | 'pdf' | 'video' | 'audio'
    url: string
    nome: string
  }[]
  
  status: 'rascunho' | 'ativo'
  criadoEm: Date
}

/**
 * AUTOMAÇÕES
 * Fluxos de automação de marketing
 */
export interface Automacao {
  id: string
  empresaId: string
  
  nome: string
  gatilho: 'cadastro_lead' | 'mudanca_status' | 'data_especifica' | 'inatividade'
  fluxo: {
    ordem: number
    acao: 'enviar_sms' | 'enviar_whatsapp' | 'enviar_email' | 'criar_tarefa' | 'mover_funil' | 'avisar_vendedor'
    esperar?: number  // minutos
    mensagemId?: string
    condicao?: string
  }[]
  
  status: 'ativa' | 'pausada'
  responsavelId: string
  
  // Estatísticas
  executada: number
  sucesso: number
  falhas: number
  
  criadoEm: Date
  atualizadoEm: Date
}

/**
 * IA PROSPECÇÃO - CONSULTA DE MARGEM
 * Consultas automáticas de margem consignável via IA
 */
export interface ConsultaMargem {
  id: string
  empresaId: string
  clienteId?: string  // Opcional: vincula a um cliente existente
  
  // Dados do prospect
  cpf: string
  nome?: string
  dataNascimento?: Date
  telefone?: string
  
  // Resultado da consulta
  temMargem: boolean
  margemDisponivel?: number
  margemTotal?: number
  margemUtilizada?: number
  banco?: string
  convenio?: string
  situacao?: string  // 'ativo' | 'aposentado' | 'pensionista'
  
  // Detalhes adicionais
  salario?: number
  margem30?: number  // 30% do salário
  margem35?: number  // 35% do salário
  valorMaximoEmprestimo?: number
  prazoMaximo?: number
  taxaMedia?: number
  
  // Status da prospecção
  status: 'pendente' | 'consultado' | 'com_margem' | 'sem_margem' | 'erro' | 'contatado' | 'convertido'
  observacoes?: string
  
  // Ações tomadas
  whatsappEnviado: boolean
  propostaGerada: boolean
  atendenteId?: string
  dataContato?: Date
  
  // Metadata
  consultadoEm: Date
  criadoEm: Date
  atualizadoEm: Date
}

/**
 * LOTE DE CONSULTAS IA
 * Lote de CPFs para consulta em massa
 */
export interface LoteConsultaIA {
  id: string
  empresaId: string
  
  nome: string
  descricao?: string
  
  // Estatísticas
  totalCPFs: number
  consultados: number
  comMargem: number
  semMargem: number
  erros: number
  
  // Valores agregados
  margemTotalEncontrada: number
  conversoes: number
  
  status: 'processando' | 'concluido' | 'erro' | 'cancelado'
  
  responsavelId: string
  criadoEm: Date
  concluidoEm?: Date
}

// ============================================
// TIPOS AUXILIARES
// ============================================

/**
 * Filtros para Dashboard
 */
export interface FiltrosDashboard {
  periodo: 'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado'
  dataInicio?: Date
  dataFim?: Date
  empresaId?: string  // Para Master visualizar empresa específica
  origem?: CanalOrigem
  atendenteId?: string
  produtoId?: string
}

/**
 * KPIs do Dashboard
 */
export interface KPIsDashboard {
  leads: number
  clientesAtivos: number
  vendas: number
  taxaConversao: number
  receita: number
  lucro: number
  ticketMedio: number
  cpl: number
}

/**
 * Estatísticas de Campanha
 */
export interface EstatisticasCampanha {
  impressoes?: number
  cliques?: number
  leadsGerados: number
  conversoes: number
  valorInvestido: number
  cpl: number
  cpc: number
  ctr: number
  roi: number
}
