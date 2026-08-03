/**
 * SCRIPT DE SEED - POPULAR BANCO DE DADOS
 * Execute apenas UMA VEZ para criar módulos iniciais do sistema
 */

import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { Modulo, NichoEmpresa } from '../types/database.types'

/**
 * MÓDULOS DO SISTEMA
 * Define quais módulos existem e quais nichos podem usá-los
 */
const MODULOS_SISTEMA: Omit<Modulo, 'id'>[] = [
  // ============================================
  // CORE (sempre ativo para todos)
  // ============================================
  {
    nome: 'Dashboard',
    descricao: 'Visão geral do negócio com KPIs e gráficos',
    icone: 'LayoutDashboard',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'CRM / Clientes',
    descricao: 'Gestão de leads e clientes',
    icone: 'Users',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Pipeline',
    descricao: 'Funil de vendas estilo Kanban',
    icone: 'KanbanSquare',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Chat Center',
    descricao: 'Central de conversas omnichannel',
    icone: 'MessageSquare',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Campanhas',
    descricao: 'Gestão de campanhas de marketing',
    icone: 'Megaphone',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'SMS',
    descricao: 'Disparos e respostas de SMS',
    icone: 'Smartphone',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Financeiro',
    descricao: 'Controle financeiro e fluxo de caixa',
    icone: 'DollarSign',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Relatórios',
    descricao: 'Relatórios e Business Intelligence',
    icone: 'BarChart3',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Empresas/Contratos',
    descricao: 'Gestão de empresas clientes (B2B)',
    icone: 'Building2',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Anotações',
    descricao: 'Anotações e tarefas internas',
    icone: 'StickyNote',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Remarketing',
    descricao: 'Reengajamento de leads frios',
    icone: 'RefreshCw',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },
  {
    nome: 'Configurações',
    descricao: 'Configurações da empresa e usuários',
    icone: 'Settings',
    nichos: Object.values(NichoEmpresa),
    obrigatorio: true
  },

  // ============================================
  // CORRESPONDENTE BANCÁRIO
  // ============================================
  {
    nome: 'Bancos/Convênios',
    descricao: 'Cadastro de bancos e convênios parceiros',
    icone: 'Landmark',
    nichos: [NichoEmpresa.CORRESPONDENTE_BANCARIO],
    obrigatorio: false
  },

  // ============================================
  // CLÍNICAS MÉDICAS
  // ============================================
  {
    nome: 'Agenda Médica',
    descricao: 'Agendamento de consultas por profissional',
    icone: 'Calendar',
    nichos: [
      NichoEmpresa.CLINICA_MEDICA,
      NichoEmpresa.ODONTOLOGIA,
      NichoEmpresa.PSICOLOGIA,
      NichoEmpresa.NUTRICAO
    ],
    obrigatorio: false
  },
  {
    nome: 'Prontuário Eletrônico',
    descricao: 'Prontuário médico digital',
    icone: 'FileText',
    nichos: [NichoEmpresa.CLINICA_MEDICA],
    obrigatorio: false
  },
  {
    nome: 'Convênios',
    descricao: 'Gestão de convênios médicos',
    icone: 'CreditCard',
    nichos: [
      NichoEmpresa.CLINICA_MEDICA,
      NichoEmpresa.ODONTOLOGIA,
      NichoEmpresa.PSICOLOGIA,
      NichoEmpresa.NUTRICAO
    ],
    obrigatorio: false
  },
  {
    nome: 'Exames',
    descricao: 'Solicitação e resultado de exames',
    icone: 'Activity',
    nichos: [NichoEmpresa.CLINICA_MEDICA],
    obrigatorio: false
  },
  {
    nome: 'Profissionais',
    descricao: 'Cadastro de médicos e profissionais',
    icone: 'UserCog',
    nichos: [
      NichoEmpresa.CLINICA_MEDICA,
      NichoEmpresa.ODONTOLOGIA,
      NichoEmpresa.PSICOLOGIA,
      NichoEmpresa.NUTRICAO
    ],
    obrigatorio: false
  },
  {
    nome: 'Estoque',
    descricao: 'Controle de materiais e insumos',
    icone: 'Package',
    nichos: [NichoEmpresa.CLINICA_MEDICA, NichoEmpresa.ODONTOLOGIA],
    obrigatorio: false
  },

  // ============================================
  // ODONTOLOGIA
  // ============================================
  {
    nome: 'Odontograma',
    descricao: 'Mapa dentário interativo',
    icone: 'Smile',
    nichos: [NichoEmpresa.ODONTOLOGIA],
    obrigatorio: false
  },
  {
    nome: 'Tratamentos',
    descricao: 'Plano de tratamento e procedimentos',
    icone: 'Stethoscope',
    nichos: [NichoEmpresa.ODONTOLOGIA],
    obrigatorio: false
  },
  {
    nome: 'Radiografias',
    descricao: 'Upload e visualização de radiografias',
    icone: 'Image',
    nichos: [NichoEmpresa.ODONTOLOGIA],
    obrigatorio: false
  },

  // ============================================
  // PSICOLOGIA
  // ============================================
  {
    nome: 'Sessões',
    descricao: 'Controle de sessões individuais/casal',
    icone: 'Clock',
    nichos: [NichoEmpresa.PSICOLOGIA],
    obrigatorio: false
  },
  {
    nome: 'Prontuário Psicológico',
    descricao: 'Evolução sigilosa por sessão',
    icone: 'Shield',
    nichos: [NichoEmpresa.PSICOLOGIA],
    obrigatorio: false
  },
  {
    nome: 'Recibos',
    descricao: 'Emissão automática de recibos',
    icone: 'Receipt',
    nichos: [NichoEmpresa.PSICOLOGIA, NichoEmpresa.NUTRICAO],
    obrigatorio: false
  },

  // ============================================
  // NUTRIÇÃO
  // ============================================
  {
    nome: 'Avaliação Antropométrica',
    descricao: 'Medidas, IMC e evolução corporal',
    icone: 'TrendingUp',
    nichos: [NichoEmpresa.NUTRICAO],
    obrigatorio: false
  },
  {
    nome: 'Plano Alimentar',
    descricao: 'Montagem de cardápio e dieta',
    icone: 'Apple',
    nichos: [NichoEmpresa.NUTRICAO],
    obrigatorio: false
  },
  {
    nome: 'Receitas',
    descricao: 'Biblioteca de receitas saudáveis',
    icone: 'Book',
    nichos: [NichoEmpresa.NUTRICAO],
    obrigatorio: false
  },

  // ============================================
  // ACADEMIAS
  // ============================================
  {
    nome: 'Planos/Mensalidades',
    descricao: 'Gestão de planos e cobranças',
    icone: 'CreditCard',
    nichos: [NichoEmpresa.ACADEMIA],
    obrigatorio: false
  },
  {
    nome: 'Avaliações Físicas',
    descricao: 'Medidas e evolução física',
    icone: 'Activity',
    nichos: [NichoEmpresa.ACADEMIA],
    obrigatorio: false
  },
  {
    nome: 'Treinos',
    descricao: 'Fichas de treino por aluno',
    icone: 'Dumbbell',
    nichos: [NichoEmpresa.ACADEMIA],
    obrigatorio: false
  },
  {
    nome: 'Personal Trainers',
    descricao: 'Gestão de personal trainers',
    icone: 'UserCheck',
    nichos: [NichoEmpresa.ACADEMIA],
    obrigatorio: false
  }
]

/**
 * Executa o seed do banco de dados
 */
export const seedDatabase = async () => {
  console.log('🌱 Iniciando seed do banco de dados...')

  try {
    const modulosRef = collection(db, 'modulos')
    let count = 0

    for (const modulo of MODULOS_SISTEMA) {
      await addDoc(modulosRef, {
        ...modulo,
        criadoEm: new Date()
      })
      count++
      console.log(`✅ Módulo criado: ${modulo.nome}`)
    }

    console.log(`\n🎉 Seed completo! ${count} módulos criados.`)
    console.log('\n📋 MÓDULOS CORE (obrigatórios para todos):')
    MODULOS_SISTEMA.filter((m) => m.obrigatorio).forEach((m) =>
      console.log(`   - ${m.nome}`)
    )

    console.log('\n📦 MÓDULOS OPCIONAIS (por nicho):')
    MODULOS_SISTEMA.filter((m) => !m.obrigatorio).forEach((m) =>
      console.log(`   - ${m.nome} (${m.nichos.join(', ')})`)
    )

    return { success: true, count }
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error)
    return { success: false, error }
  }
}

/**
 * Função para limpar módulos (cuidado!)
 */
export const clearModulos = async () => {
  console.warn('⚠️ Esta função irá EXCLUIR TODOS os módulos do banco!')
  // Implementar apenas se necessário
}

// Para executar via console do navegador:
// import { seedDatabase } from './scripts/seed-database'
// seedDatabase()
