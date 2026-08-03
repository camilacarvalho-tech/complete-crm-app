import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  TrendingUp, 
  Megaphone, 
  Package, 
  Settings, 
  Zap,
  Users,
  BarChart3,
  Calendar,
  DollarSign,
  MessageSquare,
  Brain,
  FileText,
  Shield,
  Cloud,
  Workflow,
  CheckCircle,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';

export const LandingPage = () => {
  const [menuAberto, setMenuAberto] = useState(false);

  const recursos = [
    {
      icone: <Users className="w-8 h-8" />,
      titulo: "Gestão de Clientes (CRM)",
      descricao: "Cadastro completo, histórico de atendimentos, leads, oportunidades, pipeline e funil de vendas com status personalizados."
    },
    {
      icone: <BarChart3 className="w-8 h-8" />,
      titulo: "Dashboard Inteligente",
      descricao: "Métricas em tempo real: clientes, leads, conversões, receitas, ticket médio, metas e gráficos comparativos."
    },
    {
      icone: <DollarSign className="w-8 h-8" />,
      titulo: "Financeiro Completo",
      descricao: "Contas a pagar/receber, fluxo de caixa, receitas, despesas, categorias, formas de pagamento e relatórios detalhados."
    },
    {
      icone: <Calendar className="w-8 h-8" />,
      titulo: "Agenda Inteligente",
      descricao: "Compromissos, reuniões, agendamentos, visitas, lembretes automáticos e calendário completo."
    },
    {
      icone: <Building2 className="w-8 h-8" />,
      titulo: "Multiempresa",
      descricao: "Gerencie várias empresas na mesma plataforma, com usuários, clientes, financeiro e relatórios separados."
    },
    {
      icone: <Brain className="w-8 h-8" />,
      titulo: "Inteligência Artificial",
      descricao: "Respostas inteligentes, sugestões de atendimento, resumo de conversas e automação de tarefas."
    },
    {
      icone: <MessageSquare className="w-8 h-8" />,
      titulo: "Central de Atendimento",
      descricao: "WhatsApp Oficial integrado, histórico de conversas, distribuição automática, etiquetas e respostas rápidas."
    },
    {
      icone: <Workflow className="w-8 h-8" />,
      titulo: "Automações",
      descricao: "Follow-up automático, mensagens programadas, mudança de status, criação de tarefas e alertas inteligentes."
    }
  ];

  const planos = [
    {
      nome: "Nexus Start",
      cor: "green",
      preco: "297,00",
      descricao: "Ideal para pequenas empresas",
      recursos: [
        "CRM Completo",
        "Gestão de Clientes",
        "Leads e Oportunidades",
        "Funil de Vendas",
        "Dashboard",
        "Agenda",
        "Relatórios",
        "Multiusuário"
      ]
    },
    {
      nome: "Nexus Professional",
      cor: "blue",
      preco: "497,00",
      descricao: "Tudo do Start +",
      recursos: [
        "Financeiro Completo",
        "WhatsApp Oficial",
        "Landing Pages",
        "APIs e Webhooks",
        "Automações",
        "Relatórios Avançados",
        "Dashboard Financeiro",
        "Integrações"
      ]
    },
    {
      nome: "Nexus Business",
      cor: "purple",
      preco: "697,00",
      descricao: "Tudo do Professional +",
      recursos: [
        "Inteligência Artificial",
        "Multiempresa",
        "Marketing Completo",
        "Central de Atendimento",
        "Gestão Comercial",
        "Fluxos Inteligentes",
        "Meta Ads",
        "Campanhas"
      ]
    },
    {
      nome: "Nexus Enterprise",
      cor: "yellow",
      preco: "900,00",
      descricao: "Plataforma Completa",
      recursos: [
        "Todos os Módulos",
        "CRM + ERP Completo",
        "IA Avançada",
        "Suporte Prioritário",
        "Backup Automático",
        "Segurança Avançada",
        "Atualizações Contínuas",
        "Personalização"
      ],
      destaque: true
    }
  ];

  const servicos = [
    {
      icone: <TrendingUp className="w-12 h-12" />,
      titulo: "Landing Pages",
      descricao: "Páginas de alta conversão, integradas ao Nexus CRM, com captura automática de leads."
    },
    {
      icone: <Megaphone className="w-12 h-12" />,
      titulo: "Gestão de Tráfego Pago",
      descricao: "Campanhas profissionais em Meta Ads, Google Ads, com análise e otimização constante."
    },
    {
      icone: <Package className="w-12 h-12" />,
      titulo: "Pacotes CODE Digital",
      descricao: "Soluções completas: Landing Page + Tráfego Pago + CRM, tudo integrado."
    },
    {
      icone: <Settings className="w-12 h-12" />,
      titulo: "CODE Systems",
      descricao: "Desenvolvimento de sistemas personalizados, sites, aplicativos e integrações."
    }
  ];

  const corPlano = (cor: string) => {
    const cores: any = {
      green: "from-green-500 to-green-600",
      blue: "from-blue-500 to-blue-600",
      purple: "from-purple-500 to-purple-600",
      yellow: "from-yellow-500 to-yellow-600"
    };
    return cores[cor] || cores.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header/Navegação */}
      <nav className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Zap className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">CODE Tecnologia</span>
            </div>

            {/* Menu Desktop */}
            <div className="hidden md:flex space-x-6">
              <a href="#home" className="text-gray-300 hover:text-white transition">Home</a>
              <a href="#sobre" className="text-gray-300 hover:text-white transition">Sobre</a>
              <a href="#nexus" className="text-gray-300 hover:text-white transition">Nexus CRM</a>
              <a href="#servicos" className="text-gray-300 hover:text-white transition">Serviços</a>
              <a href="#planos" className="text-gray-300 hover:text-white transition">Planos</a>
              <a href="#contato" className="text-gray-300 hover:text-white transition">Contato</a>
            </div>

            {/* Botão Menu Mobile */}
            <button 
              onClick={() => setMenuAberto(!menuAberto)}
              className="md:hidden text-white"
            >
              {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Menu Mobile */}
          {menuAberto && (
            <div className="md:hidden pb-4 space-y-2">
              <a href="#home" className="block text-gray-300 hover:text-white py-2">Home</a>
              <a href="#sobre" className="block text-gray-300 hover:text-white py-2">Sobre</a>
              <a href="#nexus" className="block text-gray-300 hover:text-white py-2">Nexus CRM</a>
              <a href="#servicos" className="block text-gray-300 hover:text-white py-2">Serviços</a>
              <a href="#planos" className="block text-gray-300 hover:text-white py-2">Planos</a>
              <a href="#contato" className="block text-gray-300 hover:text-white py-2">Contato</a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            CODE Tecnologia Empresarial
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8">
            Soluções completas para transformar sua empresa
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#nexus"
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2"
            >
              Conheça o Nexus CRM <ArrowRight className="w-5 h-5" />
            </a>
            <a 
              href="#contato"
              className="bg-transparent border-2 border-white hover:bg-white hover:text-slate-900 text-white px-8 py-4 rounded-lg font-semibold text-lg transition"
            >
              Fale Conosco
            </a>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
            Sobre a CODE
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-700/50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-white mb-4">Nossa Missão</h3>
              <p className="text-gray-300 leading-relaxed">
                Transformar a gestão empresarial através da tecnologia, 
                oferecendo soluções inteligentes, integradas e acessíveis 
                para empresas de todos os portes.
              </p>
            </div>
            <div className="bg-slate-700/50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-white mb-4">Nossa Visão</h3>
              <p className="text-gray-300 leading-relaxed">
                Ser referência em tecnologia empresarial, proporcionando 
                ferramentas que aumentam a produtividade, organizam processos 
                e impulsionam resultados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nexus CRM - Destaque Principal */}
      <section id="nexus" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-blue-500/20 px-6 py-3 rounded-full mb-6">
              <Zap className="w-6 h-6 text-blue-400" />
              <span className="text-blue-400 font-semibold">Produto Principal</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Nexus CRM
            </h2>
            <p className="text-2xl md:text-3xl text-gray-300 font-light">
              Tudo o que sua empresa precisa, em um único sistema
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-1 rounded-2xl mb-12">
            <div className="bg-slate-800 p-8 md:p-12 rounded-2xl">
              <p className="text-xl text-gray-300 leading-relaxed text-center">
                O <span className="text-white font-bold">Nexus CRM</span> é uma plataforma completa desenvolvida 
                pela CODE Tecnologia Empresarial para centralizar todos os processos da empresa em um único sistema.
                <br /><br />
                Mais do que um CRM, o Nexus reúne <span className="text-blue-400 font-semibold">CRM + ERP + 
                Inteligência Artificial + Automação + Financeiro + Marketing + Relatórios</span>, proporcionando 
                uma gestão completa, moderna e inteligente.
              </p>
            </div>
          </div>

          {/* Recursos do Nexus */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recursos.map((recurso, index) => (
              <div 
                key={index}
                className="bg-slate-700/50 p-6 rounded-lg hover:bg-slate-700 transition group"
              >
                <div className="text-blue-400 mb-4 group-hover:scale-110 transition">
                  {recurso.icone}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{recurso.titulo}</h3>
                <p className="text-gray-400 text-sm">{recurso.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Planos Nexus CRM
          </h2>
          <p className="text-xl text-gray-400 text-center mb-12">
            Escolha o plano ideal para sua empresa
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {planos.map((plano, index) => (
              <div 
                key={index}
                className={`bg-slate-700/50 rounded-lg overflow-hidden hover:scale-105 transition ${
                  plano.destaque ? 'ring-4 ring-yellow-400' : ''
                }`}
              >
                {plano.destaque && (
                  <div className="bg-yellow-400 text-slate-900 text-center py-2 font-bold">
                    MAIS COMPLETO
                  </div>
                )}
                <div className={`bg-gradient-to-r ${corPlano(plano.cor)} p-6 text-white`}>
                  <h3 className="text-2xl font-bold mb-2">{plano.nome}</h3>
                  <div className="text-4xl font-bold mb-2">
                    R$ {plano.preco}
                    <span className="text-sm font-normal">/mês</span>
                  </div>
                  <p className="text-sm opacity-90">{plano.descricao}</p>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {plano.recursos.map((recurso, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{recurso}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition">
                    Contratar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Outros Serviços CODE */}
      <section id="servicos" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Outros Serviços CODE
          </h2>
          <p className="text-xl text-gray-400 text-center mb-12">
            Soluções completas de marketing e tecnologia
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {servicos.map((servico, index) => (
              <div 
                key={index}
                className="bg-slate-700/50 p-8 rounded-lg text-center hover:bg-slate-700 transition group"
              >
                <div className="text-blue-400 mb-4 flex justify-center group-hover:scale-110 transition">
                  {servico.icone}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{servico.titulo}</h3>
                <p className="text-gray-400">{servico.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
            Por que escolher a CODE?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Segurança</h3>
              <p className="text-gray-400">
                Dados protegidos com criptografia, backup automático e conformidade LGPD
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cloud</h3>
              <p className="text-gray-400">
                Acesse de qualquer lugar, em qualquer dispositivo, com alta disponibilidade
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Workflow className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Integrado</h3>
              <p className="text-gray-400">
                WhatsApp, Meta Ads, Google, APIs e todas as ferramentas que você precisa
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="contato" className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para transformar sua empresa?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Entre em contato e descubra como o Nexus CRM pode revolucionar sua gestão
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              WhatsApp
            </a>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition">
              Agendar Demonstração
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-bold text-white">CODE Tecnologia Empresarial</span>
          </div>
          <p className="text-sm">
            © 2024 CODE Tecnologia. Todos os direitos reservados.
          </p>
          <p className="text-sm mt-2">
            Nexus CRM - A plataforma completa para gestão empresarial
          </p>
        </div>
      </footer>
    </div>
  );
};
