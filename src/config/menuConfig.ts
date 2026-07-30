/**
 * CONFIGURAÇÃO DO MENU LATERAL DINÂMICO
 * Define quais itens aparecem para cada nicho de empresa
 */

import {
  LayoutDashboard,
  Users,
  GitBranch,
  MessageCircle,
  StickyNote,
  BarChart3,
  Building2,
  DollarSign,
  Target,
  TrendingUp,
  Megaphone,
  Phone,
  Settings,
  Bot,
  Radar,
  // Correspondente Bancário
  Landmark,
  // Saúde
  Calendar,
  FileText,
  Activity,
  Stethoscope,
  CreditCard,
  Package,
  UserCog,
  // Odontologia
  Smile,
  Image,
  // Psicologia
  Clock,
  Shield,
  Receipt,
  // Nutrição
  Apple,
  Book,
  // Academia
  Dumbbell,
  UserCheck,
  CheckSquare,
  FileSignature,
  Zap,
} from 'lucide-react'
import { NichoEmpresa } from '../types/database.types'

export interface MenuItem {
  path: string
  icon: any
  label: string
  labelOriginal?: string // Nome genérico (ex: "Clientes")
  nichos?: NichoEmpresa[] // Se vazio, aparece para todos
  badge?: string
}

/**
 * MENU COMPLETO - TODOS OS ITENS POSSÍVEIS
 * O sistema filtra automaticamente baseado no nicho da empresa
 */
export const MENU_ITEMS: MenuItem[] = [
  // ============================================
  // CORE (aparece para TODOS os nichos)
  // ============================================
  {
    path: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    nichos: [] // Vazio = todos
  },
  
  // ============================================
  // CRM - Nome muda por nicho
  // ============================================
  {
    path: '/clientes',
    icon: Users,
    label: 'Clientes', // Padrão para Correspondente
    labelOriginal: 'Clientes',
    nichos: [NichoEmpresa.CORRESPONDENTE_BANCARIO]
  },
  {
    path: '/clientes',
    icon: Users,
    label: 'Pacientes', // Para área da saúde
    labelOriginal: 'Clientes',
    nichos: [
      NichoEmpresa.CLINICA_MEDICA,
      NichoEmpresa.ODONTOLOGIA,
      NichoEmpresa.PSICOLOGIA,
      NichoEmpresa.NUTRICAO
    ]
  },
  {
    path: '/clientes',
    icon: Users,
    label: 'Alunos', // Para academia
    labelOriginal: 'Clientes',
    nichos: [NichoEmpresa.ACADEMIA]
  },
  
  // ============================================
  // CORE (continuação)
  // ============================================
  {
    path: '/pipeline',
    icon: GitBranch,
    label: 'Pipeline',
    nichos: []
  },
  {
    path: '/tarefas',
    icon: CheckSquare,
    label: 'Agenda Inteligente',
    nichos: []
  },
  {
    path: '/chat-center',
    icon: MessageCircle,
    label: 'Nexus Atendimento',
    nichos: [],
    badge: 'NOVO'
  },
  {
    path: '/campanhas',
    icon: Megaphone,
    label: 'Campanhas',
    nichos: []
  },
  {
    path: '/nexus-ai',
    icon: Bot,
    label: 'Nexus AI',
    nichos: [],
    badge: 'AI'
  },
  {
    path: '/leads-monitor',
    icon: Radar,
    label: 'Leads Monitor',
    nichos: [],
    badge: 'NOVO'
  },
  {
    path: '/ia-prospeccao',
    icon: Bot,
    label: 'IA Prospecção',
    nichos: [], // Vazio = aparece para todos
    badge: 'IA'
  },
  {
    path: '/discadora',
    icon: Phone,
    label: 'VOIP/Discadora',
    nichos: [], // Aparece para todos
    badge: 'NOVO'
  },
  {
    path: '/marketing-roi',
    icon: TrendingUp,
    label: 'Marketing ROI',
    nichos: []
  },
  {
    path: '/documentos',
    icon: FileText,
    label: 'Documentos',
    nichos: []
  },
  {
    path: '/automacoes',
    icon: Zap,
    label: 'Automações',
    nichos: [],
    badge: 'NOVO'
  },
  // ============================================
  // CORRESPONDENTE BANCÁRIO
  // ============================================
  {
    path: '/propostas',
    icon: FileSignature,
    label: 'Propostas',
    nichos: [NichoEmpresa.CORRESPONDENTE_BANCARIO]
  },
  {
    path: '/digitacao',
    icon: FileText,
    label: 'Digitação',
    nichos: [NichoEmpresa.CORRESPONDENTE_BANCARIO],
    badge: 'NOVO'
  },
  {
    path: '/bancos-convenios',
    icon: Landmark,
    label: 'Bancos/Convênios',
    nichos: [NichoEmpresa.CORRESPONDENTE_BANCARIO]
  },
  
  // ============================================
  // SAÚDE (Clínica, Odonto, Psico, Nutri)
  // ============================================
  {
    path: '/agenda',
    icon: Calendar,
    label: 'Agenda',
    nichos: [
      NichoEmpresa.CLINICA_MEDICA,
      NichoEmpresa.ODONTOLOGIA,
      NichoEmpresa.PSICOLOGIA,
      NichoEmpresa.NUTRICAO
    ]
  },
  {
    path: '/convenios',
    icon: CreditCard,
    label: 'Convênios',
    nichos: [
      NichoEmpresa.CLINICA_MEDICA,
      NichoEmpresa.ODONTOLOGIA,
      NichoEmpresa.PSICOLOGIA,
      NichoEmpresa.NUTRICAO
    ]
  },
  {
    path: '/profissionais',
    icon: UserCog,
    label: 'Profissionais',
    nichos: [
      NichoEmpresa.CLINICA_MEDICA,
      NichoEmpresa.ODONTOLOGIA,
      NichoEmpresa.PSICOLOGIA,
      NichoEmpresa.NUTRICAO
    ]
  },
  
  // ============================================
  // CLÍNICA MÉDICA
  // ============================================
  {
    path: '/prontuario',
    icon: FileText,
    label: 'Prontuário',
    nichos: [NichoEmpresa.CLINICA_MEDICA]
  },
  {
    path: '/exames',
    icon: Activity,
    label: 'Exames',
    nichos: [NichoEmpresa.CLINICA_MEDICA]
  },
  {
    path: '/estoque',
    icon: Package,
    label: 'Estoque',
    nichos: [NichoEmpresa.CLINICA_MEDICA, NichoEmpresa.ODONTOLOGIA]
  },
  
  // ============================================
  // ODONTOLOGIA
  // ============================================
  {
    path: '/odontograma',
    icon: Smile,
    label: 'Odontograma',
    nichos: [NichoEmpresa.ODONTOLOGIA]
  },
  {
    path: '/tratamentos',
    icon: Stethoscope,
    label: 'Tratamentos',
    nichos: [NichoEmpresa.ODONTOLOGIA]
  },
  {
    path: '/radiografias',
    icon: Image,
    label: 'Radiografias',
    nichos: [NichoEmpresa.ODONTOLOGIA]
  },

  // ============================================
  // PSICOLOGIA
  // ============================================
  {
    path: '/sessoes',
    icon: Clock,
    label: 'Sessões',
    nichos: [NichoEmpresa.PSICOLOGIA]
  },
  {
    path: '/prontuario-psicologico',
    icon: Shield,
    label: 'Prontuário Psicológico',
    nichos: [NichoEmpresa.PSICOLOGIA]
  },
  {
    path: '/recibos',
    icon: Receipt,
    label: 'Recibos',
    nichos: [NichoEmpresa.PSICOLOGIA, NichoEmpresa.NUTRICAO]
  },
  
  // ============================================
  // NUTRIÇÃO
  // ============================================
  {
    path: '/avaliacao-antropometrica',
    icon: TrendingUp,
    label: 'Avaliação Antropométrica',
    nichos: [NichoEmpresa.NUTRICAO]
  },
  {
    path: '/plano-alimentar',
    icon: Apple,
    label: 'Plano Alimentar',
    nichos: [NichoEmpresa.NUTRICAO]
  },
  {
    path: '/receitas',
    icon: Book,
    label: 'Receitas',
    nichos: [NichoEmpresa.NUTRICAO]
  },
  
  // ============================================
  // ACADEMIA
  // ============================================
  {
    path: '/planos-mensalidades',
    icon: CreditCard,
    label: 'Planos/Mensalidades',
    nichos: [NichoEmpresa.ACADEMIA]
  },
  {
    path: '/avaliacoes-fisicas',
    icon: Activity,
    label: 'Avaliações Físicas',
    nichos: [NichoEmpresa.ACADEMIA]
  },
  {
    path: '/treinos',
    icon: Dumbbell,
    label: 'Treinos',
    nichos: [NichoEmpresa.ACADEMIA]
  },
  {
    path: '/personal-trainers',
    icon: UserCheck,
    label: 'Personal Trainers',
    nichos: [NichoEmpresa.ACADEMIA]
  },
  
  // ============================================
  // CORE (final - aparece para todos)
  // ============================================
  {
    path: '/comunicacao-interna',
    icon: MessageCircle,
    label: 'Nexus Interno',
    nichos: []
  },
  {
    path: '/relatorios',
    icon: BarChart3,
    label: 'Relatórios',
    nichos: []
  },
  {
    path: '/remarketing',
    icon: Target,
    label: 'Remarketing',
    nichos: []
  },
  {
    path: '/empresas',
    icon: Building2,
    label: 'Empresas',
    nichos: []
  },
  {
    path: '/configuracoes',
    icon: Settings,
    label: 'Configurações',
    nichos: []
  }
]

/**
 * FUNÇÃO PARA FILTRAR MENU POR NICHO
 * Retorna apenas os itens que devem aparecer para a empresa logada
 */
export const getMenuByNicho = (nicho: NichoEmpresa | null): MenuItem[] => {
  if (!nicho) {
    // Se não tiver nicho (Master vendo painel geral), mostra apenas CORE
    return MENU_ITEMS.filter(item => item.nichos?.length === 0)
  }

  return MENU_ITEMS.filter(item => {
    // Sem restrição de nicho = aparece para todos
    if (!item.nichos || item.nichos.length === 0) {
      return true
    }
    
    // Tem restrição = verifica se o nicho está na lista
    return item.nichos.includes(nicho)
  })
}

/**
 * FUNÇÃO PARA AGRUPAR MENU POR SEÇÃO
 * Organiza os itens em categorias visuais
 */
export interface MenuSection {
  title: string
  items: MenuItem[]
}

export const getMenuSections = (nicho: NichoEmpresa | null): MenuSection[] => {
  const menuItems = getMenuByNicho(nicho)
  
  const sections: MenuSection[] = [
    {
      title: 'Principal',
      items: menuItems.filter(item => 
        ['/', '/clientes', '/pipeline', '/tarefas', '/chat-center', '/propostas', '/leads-monitor'].includes(item.path)
      )
    },
    {
      title: 'Marketing',
      items: menuItems.filter(item => 
        ['/campanhas', '/remarketing', '/marketing-roi'].includes(item.path)
      )
    },
    {
      title: 'Módulos Específicos',
      items: menuItems.filter(item => {
        const coreItems = ['/', '/clientes', '/pipeline', '/tarefas', '/chat-center', '/propostas',
                          '/campanhas', '/marketing-roi', '/comunicacao-interna', '/relatorios', 
                          '/remarketing', '/empresas', '/configuracoes', '/ia-prospeccao', '/discadora']
        return !coreItems.includes(item.path)
      })
    },
    {
      title: 'Gestão',
      items: menuItems.filter(item => 
        ['/comunicacao-interna', '/relatorios', '/empresas', '/configuracoes'].includes(item.path)
      )
    }
  ]
  
  // Remove seções vazias
  return sections.filter(section => section.items.length > 0)
}

export default MENU_ITEMS
