import { useState } from 'react';
import { 
  Settings, BookOpen, HelpCircle, ChevronRight,
  Monitor, Users, DollarSign, Package, ShoppingCart,
  FileText, Building, Shield, Bell, Globe, Database
} from 'lucide-react';

interface GuiaModulo {
  id: string;
  titulo: string;
  icone: any;
  cor: string;
  descricao: string;
  passos: string[];
  dicas: string[];
}

const GUIAS_MODULOS: GuiaModulo[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    icone: Monitor,
    cor: 'from-blue-500 to-cyan-600',
    descricao: 'Visão geral do sistema com métricas e indicadores importantes',
    passos: [
      'Acesse o Dashboard no menu lateral esquerdo',
      'Visualize os cards de resumo com métricas principais',
      'Analise os gráficos de desempenho e tendências',
      'Use os filtros de período para ajustar a visualização',
      'Clique em "Atualizar" para obter dados em tempo real'
    ],
    dicas: [
      'Os cards mostram dados dos últimos 30 dias por padrão',
      'Gráficos podem ser exportados clicando no ícone de download',
      'Números em verde indicam crescimento positivo'
    ]
  },
  {
    id: 'crm',
    titulo: 'CRM - Clientes',
    icone: Users,
    cor: 'from-purple-500 to-pink-600',
    descricao: 'Gestão completa de clientes e relacionamento',
    passos: [
      'Acesse "Clientes" no menu Nexus CRM',
      'Clique em "Novo Cliente" para cadastrar',
      'Preencha todos os dados: nome, CPF/CNPJ, telefone, email',
      'Adicione informações complementares: endereço, empresa, observações',
      'Defina o funil de vendas, responsável e status',
      'Salve o cadastro clicando em "Salvar Cliente"',
      'Use a busca para encontrar clientes rapidamente',
      'Filtre por funil, status ou responsável'
    ],
    dicas: [
      'CPF e CNPJ são validados automaticamente',
      'WhatsApp é integrado - clique no ícone para conversar',
      'Histórico de interações fica salvo no perfil do cliente',
      'Use tags para categorizar clientes'
    ]
  },
  {
    id: 'atendimento',
    titulo: 'Nexus Atendimento',
    icone: FileText,
    cor: 'from-green-500 to-teal-600',
    descricao: 'Central de atendimento integrada com WhatsApp',
    passos: [
      'Acesse "Nexus Atendimento" no menu',
      'Visualize todas as conversas ativas na lista',
      'Clique em uma conversa para abrir o chat',
      'O formulário do cliente abre automaticamente',
      'Digite sua mensagem no campo inferior',
      'Envie textos, emojis ou arquivos',
      'Marque conversas como "Lida" ou "Pendente"',
      'Use respostas rápidas para agilizar'
    ],
    dicas: [
      'Conversas não lidas aparecem em destaque',
      'Ctrl+Enter envia a mensagem rapidamente',
      'Histórico completo fica salvo automaticamente',
      'Robô de atendimento pode ser ativado nas configurações'
    ]
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro',
    icone: DollarSign,
    cor: 'from-yellow-500 to-orange-600',
    descricao: 'Gestão financeira completa: fluxo de caixa, recebimentos e pagamentos',
    passos: [
      'Acesse "Financeiro" no menu',
      'Para registrar receitas: vá em "Recebimentos" > "Novo"',
      'Preencha cliente, categoria, valor, data e forma de pagamento',
      'Para despesas: vá em "Contas a Pagar" > "Novo"',
      'Preencha fornecedor, valor, vencimento e observações',
      'Acompanhe o fluxo de caixa em tempo real',
      'Gere relatórios DRE para análise gerencial',
      'Exporte dados para Excel ou PDF'
    ],
    dicas: [
      'DRE calcula automaticamente lucro bruto e líquido',
      'Formas de pagamento podem ser personalizadas',
      'Valores em atraso aparecem destacados em vermelho',
      'Recorrências mensais podem ser configuradas'
    ]
  },
  {
    id: 'estoque',
    titulo: 'Estoque',
    icone: Package,
    cor: 'from-indigo-500 to-purple-600',
    descricao: 'Controle de estoque e movimentações',
    passos: [
      'Acesse "Estoque" no menu',
      'Clique em "Novo Produto" para cadastrar',
      'Informe código, nome, categoria e unidade',
      'Defina quantidade inicial e estoque mínimo',
      'Configure valores de compra e venda',
      'Associe um fornecedor ao produto',
      'O sistema alerta quando atingir estoque mínimo',
      'Registre entradas e saídas automaticamente'
    ],
    dicas: [
      'Códigos de barras podem ser escaneados',
      'Relatórios de giro de estoque disponíveis',
      'Alertas por email quando estoque baixo',
      'Integração com compras e vendas'
    ]
  },
  {
    id: 'compras',
    titulo: 'Compras',
    icone: ShoppingCart,
    cor: 'from-red-500 to-pink-600',
    descricao: 'Gestão de compras e pedidos a fornecedores',
    passos: [
      'Acesse "Compras" no menu',
      'Clique em "Nova Compra"',
      'Selecione o fornecedor',
      'Adicione produtos clicando em "Adicionar Item"',
      'Informe quantidade e valor unitário',
      'Sistema calcula total automaticamente',
      'Escolha forma de pagamento e condições',
      'Salve para registrar e atualizar estoque'
    ],
    dicas: [
      'Pedidos podem ser salvos como rascunho',
      'Histórico de compras por fornecedor disponível',
      'Estoque atualiza automaticamente ao confirmar',
      'Gere ordens de compra em PDF'
    ]
  },
  {
    id: 'vendas',
    titulo: 'Vendas',
    icone: DollarSign,
    cor: 'from-green-500 to-emerald-600',
    descricao: 'Registro e controle de vendas',
    passos: [
      'Acesse "Vendas" no menu',
      'Clique em "Nova Venda"',
      'Selecione o cliente',
      'Adicione produtos e quantidades',
      'Sistema calcula total e aplica descontos',
      'Escolha forma de pagamento',
      'Defina o vendedor responsável',
      'Confirme para finalizar a venda',
      'Estoque é baixado automaticamente'
    ],
    dicas: [
      'Vendas geram automaticamente recebimentos',
      'Comissões de vendedores são calculadas',
      'Notas fiscais podem ser emitidas',
      'Relatório de vendas por período disponível'
    ]
  },
  {
    id: 'rh',
    titulo: 'RH - Recursos Humanos',
    icone: Users,
    cor: 'from-purple-500 to-pink-600',
    descricao: 'Gestão de funcionários, folha de pagamento e documentos',
    passos: [
      'Acesse "RH" no menu',
      'Clique em "Novo Funcionário"',
      'Preencha dados pessoais: nome, CPF, RG, data nascimento',
      'Adicione dados profissionais: cargo, departamento, salário',
      'Matrícula é gerada automaticamente',
      'Marque benefícios oferecidos',
      'Defina situação: Ativo, Férias, Afastado',
      'Para documentos: acesse "Documentos" e faça upload (RG, CPF, etc)',
      'Acompanhe folha de pagamento no resumo'
    ],
    dicas: [
      'Folha de pagamento calcula automaticamente',
      'Alertas de aniversariantes e admissões',
      'Documentos aceitos: PDF, JPG, PNG, DOCX',
      'Histórico completo de cada funcionário'
    ]
  },
  {
    id: 'empresas',
    titulo: 'Empresas e Contratos',
    icone: Building,
    cor: 'from-blue-500 to-indigo-600',
    descricao: 'Gestão de empresas clientes e contratos de serviço',
    passos: [
      'Acesse "Empresas" > "Contratos"',
      'Clique em "Novo Contrato"',
      'Informe empresa e CNPJ',
      'Selecione o plano: Básico, Profissional, Empresarial, etc',
      'Defina valor mensal do contrato',
      'Configure datas de início e término',
      'Marque se renovação é automática',
      'Anexe PDF do contrato assinado',
      'Acompanhe status: Ativo, Pendente, Vencido'
    ],
    dicas: [
      'Contratos vencidos são alertados automaticamente',
      'Receita mensal calculada em tempo real',
      'Histórico de contratos por empresa',
      'Relatórios de contratos ativos disponíveis'
    ]
  },
  {
    id: 'usuarios',
    titulo: 'Usuários e Permissões',
    icone: Shield,
    cor: 'from-red-500 to-orange-600',
    descricao: 'Controle de acesso e permissões do sistema',
    passos: [
      'Acesse "Configurações" > "Usuários"',
      'Clique em "Novo Usuário"',
      'Preencha nome, email e senha',
      'Defina perfil: Admin, Gerente, Vendedor, Atendente',
      'Configure permissões específicas por módulo',
      'Ative ou desative acesso quando necessário',
      'Redefina senhas via email',
      'Acompanhe últimos acessos em "Logs"'
    ],
    dicas: [
      'Admins têm acesso total ao sistema',
      'Permissões podem ser customizadas',
      'Senhas devem ter mínimo 8 caracteres',
      'Logs registram todas as atividades dos usuários'
    ]
  },
  {
    id: 'backup',
    titulo: 'Backup e Segurança',
    icone: Database,
    cor: 'from-gray-600 to-gray-800',
    descricao: 'Backup automático e segurança dos dados',
    passos: [
      'Acesse "Configurações" > "Backup"',
      'Configure frequência de backups automáticos',
      'Clique em "Fazer Backup Agora" para backup manual',
      'Baixe cópia local dos dados em JSON',
      'Configure backup na nuvem (Firebase/Google Drive)',
      'Teste restauração de backups periodicamente',
      'Ative autenticação de dois fatores',
      'Revise logs de acesso regularmente'
    ],
    dicas: [
      'Backups automáticos ocorrem diariamente',
      'Mantenha cópias locais em HD externo',
      'Dados são criptografados automaticamente',
      'Restauração pode ser feita em até 30 dias'
    ]
  },
  {
    id: 'integracoes',
    titulo: 'Integrações',
    icone: Globe,
    cor: 'from-teal-500 to-cyan-600',
    descricao: 'Integre o sistema com WhatsApp, APIs e outros serviços',
    passos: [
      'Acesse "Configurações" > "Integrações"',
      'Para WhatsApp: conecte QR Code do WhatsApp Web',
      'Para APIs: gere token de acesso',
      'Configure webhooks para automações',
      'Integre com ferramentas externas: Zapier, Make',
      'Configure notificações por email e SMS',
      'Teste conexões antes de ativar',
      'Monitore status das integrações'
    ],
    dicas: [
      'WhatsApp desconecta após 14 dias sem uso',
      'APIs têm limite de requisições por dia',
      'Webhooks devem usar HTTPS',
      'Documentação completa disponível na plataforma'
    ]
  }
];

export function Configuracoes() {
  const [moduloSelecionado, setModuloSelecionado] = useState<GuiaModulo | null>(null);
  const [busca, setBusca] = useState('');

  const modulosFiltrados = GUIAS_MODULOS.filter(modulo =>
    modulo.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    modulo.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Configurações e Tutoriais</h2>
            <p className="text-sm text-gray-500">Aprenda a usar cada módulo do Nexus CRM</p>
          </div>
        </div>
      </div>

      {/* Banner de Boas-Vindas */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">Bem-vindo ao Centro de Ajuda</h3>
            <p className="text-blue-100 mb-4">
              Aqui você encontra guias passo a passo para utilizar cada funcionalidade do Nexus CRM. 
              Selecione um módulo abaixo para ver instruções detalhadas.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <HelpCircle className="w-5 h-5" />
              <span>Precisa de ajuda? Entre em contato com o suporte técnico</span>
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="relative">
          <BookOpen className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar módulo ou funcionalidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Grid de Módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modulosFiltrados.map((modulo) => {
          const Icone = modulo.icone;
          return (
            <button
              key={modulo.id}
              onClick={() => setModuloSelecionado(modulo)}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 bg-gradient-to-br ${modulo.cor} rounded-lg shadow-md group-hover:scale-110 transition-transform`}>
                  <Icone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">
                    {modulo.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {modulo.descricao}
                  </p>
                  <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                    <span>Ver tutorial</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal de Tutorial */}
      {moduloSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className={`sticky top-0 bg-gradient-to-r ${moduloSelecionado.cor} text-white p-6 rounded-t-2xl`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <moduloSelecionado.icone className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{moduloSelecionado.titulo}</h3>
                    <p className="text-sm opacity-90">{moduloSelecionado.descricao}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModuloSelecionado(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all"
                >
                  <Settings className="w-5 h-5 rotate-90" />
                </button>
              </div>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 space-y-6">
              {/* Passo a Passo */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Passo a Passo
                </h4>
                <div className="space-y-3">
                  {moduloSelecionado.passos.map((passo, index) => (
                    <div key={index} className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <p className="text-sm text-gray-700 pt-1">{passo}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dicas */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  Dicas Importantes
                </h4>
                <div className="space-y-2">
                  {moduloSelecionado.dicas.map((dica, index) => (
                    <div key={index} className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{dica}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-between rounded-b-2xl border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Precisa de mais ajuda? Entre em contato com o suporte
              </p>
              <button
                onClick={() => setModuloSelecionado(null)}
                className={`px-5 py-2.5 bg-gradient-to-r ${moduloSelecionado.cor} text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-lg`}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
