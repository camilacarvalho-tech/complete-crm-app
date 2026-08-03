import { createContext, useContext, useState, ReactNode } from 'react'

interface Lead {
  id: string
  nome: string
  cpf: string
  telefone: string
  email?: string
  cidade: string
  estado: string
  nicho: string
  produto: string
  margem?: number
  status: 'novo' | 'contatado' | 'convertido'
  dataEncontrado: Date
  quente: boolean
}

interface LeadsContextData {
  leads: Lead[]
  adicionarLeads: (novosLeads: Lead[]) => void
  limparLeads: () => void
  marcarComoEnviado: (leadIds: string[]) => void
  leadsParaCampanhas: Lead[]
}

const LeadsContext = createContext<LeadsContextData>({} as LeadsContextData)

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([
    // Leads simulados (depois virão do robô real)
    {
      id: '1',
      nome: 'João Silva Santos',
      cpf: '123.456.789-00',
      telefone: '(11) 98765-4321',
      email: 'joao.silva@email.com',
      cidade: 'São Paulo',
      estado: 'SP',
      nicho: 'correspondente_bancario',
      produto: 'INSS',
      margem: 2500.00,
      status: 'novo',
      dataEncontrado: new Date(),
      quente: true
    },
    {
      id: '2',
      nome: 'Maria Oliveira Costa',
      cpf: '987.654.321-00',
      telefone: '(11) 97654-3210',
      email: 'maria.oliveira@email.com',
      cidade: 'São Paulo',
      estado: 'SP',
      nicho: 'correspondente_bancario',
      produto: 'FGTS',
      margem: 1800.00,
      status: 'novo',
      dataEncontrado: new Date(),
      quente: true
    },
    {
      id: '3',
      nome: 'Pedro Henrique Souza',
      cpf: '456.789.123-00',
      telefone: '(21) 96543-2109',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      nicho: 'odontologia',
      produto: 'Implantes',
      status: 'novo',
      dataEncontrado: new Date(),
      quente: true
    },
    {
      id: '4',
      nome: 'Ana Carolina Lima',
      cpf: '321.654.987-00',
      telefone: '(11) 95432-1098',
      email: 'ana.lima@email.com',
      cidade: 'Campinas',
      estado: 'SP',
      nicho: 'odontologia',
      produto: 'Ortodontia',
      status: 'novo',
      dataEncontrado: new Date(),
      quente: false
    },
    {
      id: '5',
      nome: 'Roberto Carlos Alves',
      cpf: '789.123.456-00',
      telefone: '(11) 94321-0987',
      cidade: 'São Paulo',
      estado: 'SP',
      nicho: 'correspondente_bancario',
      produto: 'CLT',
      margem: 3200.00,
      status: 'novo',
      dataEncontrado: new Date(),
      quente: true
    },
    {
      id: '6',
      nome: 'Juliana Ferreira Matos',
      cpf: '654.321.789-00',
      telefone: '(85) 93210-9876',
      cidade: 'Fortaleza',
      estado: 'CE',
      nicho: 'clinica_medica',
      produto: 'Cardiologia',
      status: 'novo',
      dataEncontrado: new Date(),
      quente: true
    },
    {
      id: '7',
      nome: 'Carlos Eduardo Rocha',
      cpf: '147.258.369-00',
      telefone: '(11) 92109-8765',
      cidade: 'Santo André',
      estado: 'SP',
      nicho: 'academia',
      produto: 'Musculação',
      status: 'novo',
      dataEncontrado: new Date(),
      quente: false
    },
    {
      id: '8',
      nome: 'Fernanda Cristina Dias',
      cpf: '258.369.147-00',
      telefone: '(11) 91098-7654',
      email: 'fernanda.dias@email.com',
      cidade: 'São Bernardo',
      estado: 'SP',
      nicho: 'nutricao',
      produto: 'Emagrecimento',
      status: 'novo',
      dataEncontrado: new Date(),
      quente: true
    },
    {
      id: '9',
      nome: 'Ricardo Gomes Martins',
      cpf: '369.147.258-00',
      telefone: '(11) 90987-6543',
      cidade: 'São Paulo',
      estado: 'SP',
      nicho: 'psicologia',
      produto: 'Terapia Individual',
      status: 'novo',
      dataEncontrado: new Date(),
      quente: true
    },
    {
      id: '10',
      nome: 'Patrícia Santos Almeida',
      cpf: '741.852.963-00',
      telefone: '(11) 98876-5432',
      email: 'patricia.almeida@email.com',
      cidade: 'Guarulhos',
      estado: 'SP',
      nicho: 'correspondente_bancario',
      produto: 'Siape',
      margem: 4100.00,
      status: 'novo',
      dataEncontrado: new Date(),
      quente: true
    }
  ])

  const adicionarLeads = (novosLeads: Lead[]) => {
    setLeads(prev => [...prev, ...novosLeads])
  }

  const limparLeads = () => {
    setLeads([])
  }

  const marcarComoEnviado = (leadIds: string[]) => {
    setLeads(prev =>
      prev.map(lead =>
        leadIds.includes(lead.id)
          ? { ...lead, status: 'contatado' as const }
          : lead
      )
    )
  }

  // Filtrar apenas leads novos para Campanhas
  const leadsParaCampanhas = leads.filter(lead => lead.status === 'novo')

  return (
    <LeadsContext.Provider
      value={{
        leads,
        adicionarLeads,
        limparLeads,
        marcarComoEnviado,
        leadsParaCampanhas
      }}
    >
      {children}
    </LeadsContext.Provider>
  )
}

export function useLeads() {
  const context = useContext(LeadsContext)
  if (!context) {
    throw new Error('useLeads must be used within a LeadsProvider')
  }
  return context
}
