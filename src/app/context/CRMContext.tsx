import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cliente, Lead, Tarefa, Atividade, Meta } from '../types';

import app from '../../firebase';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);
interface CRMContextType {
  clientes: Cliente[];
  leads: Lead[];
  tarefas: Tarefa[];
  atividades: Atividade[];
  metas: Meta[];
  adicionarCliente: (cliente: Omit<Cliente, 'id'>) => void;
  atualizarCliente: (id: string, cliente: Partial<Cliente>) => void;
  removerCliente: (id: string) => void;
  adicionarLead: (lead: Omit<Lead, 'id'>) => void;
  atualizarLead: (id: string, lead: Partial<Lead>) => void;
  removerLead: (id: string) => void;
  adicionarTarefa: (tarefa: Omit<Tarefa, 'id'>) => void;
  atualizarTarefa: (id: string, tarefa: Partial<Tarefa>) => void;
  removerTarefa: (id: string) => void;
  adicionarAtividade: (atividade: Omit<Atividade, 'id'>) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const dadosIniciais = {
  clientes: [
    {
      id: '1',
      nome: 'João Silva',
      email: 'joao@empresa.com',
      telefone: '(11) 98765-4321',
      empresa: 'Tech Solutions',
      cargo: 'CEO',
      status: 'ativo' as const,
      valor: 150000,
      dataContato: '2024-01-15',
      observacoes: 'Cliente de longo prazo, muito satisfeito'
    },
    {
      id: '2',
      nome: 'Maria Santos',
      email: 'maria@startup.com',
      telefone: '(11) 91234-5678',
      empresa: 'Startup Inovadora',
      cargo: 'CTO',
      status: 'ativo' as const,
      valor: 80000,
      dataContato: '2024-02-20',
    },
    {
      id: '3',
      nome: 'Pedro Oliveira',
      email: 'pedro@corp.com',
      telefone: '(11) 99999-8888',
      empresa: 'Corp Brasil',
      cargo: 'Diretor',
      status: 'lead' as const,
      valor: 200000,
      dataContato: '2024-03-10',
    }
  ],
  leads: [
    {
      id: '1',
      nome: 'Ana Costa',
      email: 'ana@empresa.com',
      telefone: '(21) 98765-4321',
      empresa: 'Marketing Pro',
      origem: 'Website',
      status: 'qualificado' as const,
      valor: 45000,
      probabilidade: 70,
      dataContato: '2024-03-12',
      proximaAcao: 'Enviar proposta comercial',
    },
    {
      id: '2',
      nome: 'Carlos Ferreira',
      email: 'carlos@vendas.com',
      telefone: '(11) 97777-6666',
      empresa: 'Vendas Ltda',
      origem: 'Indicação',
      status: 'proposta' as const,
      valor: 120000,
      probabilidade: 85,
      dataContato: '2024-03-08',
      proximaAcao: 'Aguardando aprovação',
    },
    {
      id: '3',
      nome: 'Juliana Mendes',
      email: 'juliana@tech.com',
      telefone: '(11) 96666-5555',
      empresa: 'Tech Innovation',
      origem: 'LinkedIn',
      status: 'novo' as const,
      valor: 30000,
      probabilidade: 30,
      dataContato: '2024-03-17',
      proximaAcao: 'Fazer primeira ligação',
    }
  ],
  tarefas: [
    {
      id: '1',
      titulo: 'Ligar para Ana Costa',
      descricao: 'Discutir proposta e esclarecer dúvidas',
      tipo: 'ligacao' as const,
      prioridade: 'alta' as const,
      status: 'pendente' as const,
      dataVencimento: '2024-03-18',
      leadId: '1',
      responsavel: 'Você',
    },
    {
      id: '2',
      titulo: 'Enviar proposta para Carlos',
      descricao: 'Finalizar e enviar proposta detalhada',
      tipo: 'email' as const,
      prioridade: 'alta' as const,
      status: 'em_andamento' as const,
      dataVencimento: '2024-03-19',
      leadId: '2',
      responsavel: 'Você',
    },
    {
      id: '3',
      titulo: 'Reunião de acompanhamento - João Silva',
      descricao: 'Revisão trimestral de resultados',
      tipo: 'reuniao' as const,
      prioridade: 'media' as const,
      status: 'pendente' as const,
      dataVencimento: '2024-03-20',
      clienteId: '1',
      responsavel: 'Você',
    }
  ],
  atividades: [
    {
      id: '1',
      tipo: 'email' as const,
      titulo: 'Email enviado para Ana Costa',
      descricao: 'Apresentação inicial da empresa e serviços',
      data: '2024-03-17T10:30:00',
      leadId: '1',
      usuario: 'Você',
    },
    {
      id: '2',
      tipo: 'ligacao' as const,
      titulo: 'Ligação com Carlos Ferreira',
      descricao: 'Discussão sobre necessidades e orçamento',
      data: '2024-03-16T14:00:00',
      leadId: '2',
      usuario: 'Você',
    },
    {
      id: '3',
      tipo: 'reuniao' as const,
      titulo: 'Reunião com João Silva',
      descricao: 'Apresentação de novos serviços',
      data: '2024-03-15T16:00:00',
      clienteId: '1',
      usuario: 'Você',
    }
  ],
  metas: [
    {
      id: '1',
      titulo: 'Meta de Vendas - Março',
      valor: 500000,
      valorAtual: 230000,
      periodo: 'mensal' as const,
      tipo: 'vendas' as const,
    },
    {
      id: '2',
      titulo: 'Novos Leads - Março',
      valor: 50,
      valorAtual: 32,
      periodo: 'mensal' as const,
      tipo: 'leads' as const,
    },
    {
      id: '3',
      titulo: 'Contratos Fechados - Trimestre',
      valor: 15,
      valorAtual: 8,
      periodo: 'trimestral' as const,
      tipo: 'contratos' as const,
    }
  ]
};

export function CRMProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    const saved = localStorage.getItem('crm_clientes');
    return saved ? JSON.parse(saved) : dadosIniciais.clientes;
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('crm_leads');
    return saved ? JSON.parse(saved) : dadosIniciais.leads;
  });

  const [tarefas, setTarefas] = useState<Tarefa[]>(() => {
    const saved = localStorage.getItem('crm_tarefas');
    return saved ? JSON.parse(saved) : dadosIniciais.tarefas;
  });

  const [atividades, setAtividades] = useState<Atividade[]>(() => {
    const saved = localStorage.getItem('crm_atividades');
    return saved ? JSON.parse(saved) : dadosIniciais.atividades;
  });

  const [metas, setMetas] = useState<Meta[]>(() => {
    const saved = localStorage.getItem('crm_metas');
    return saved ? JSON.parse(saved) : dadosIniciais.metas;
  });

  useEffect(() => {
    localStorage.setItem('crm_clientes', JSON.stringify(clientes));
  }, [clientes]);

  useEffect(() => {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('crm_tarefas', JSON.stringify(tarefas));
  }, [tarefas]);

  useEffect(() => {
    localStorage.setItem('crm_atividades', JSON.stringify(atividades));
  }, [atividades]);

  useEffect(() => {
    localStorage.setItem('crm_metas', JSON.stringify(metas));
  }, [metas]);

  const adicionarCliente = (cliente: Omit<Cliente, 'id'>) => {
    const novoCliente = { ...cliente, id: Date.now().toString() };
    setClientes([...clientes, novoCliente]);
  };

  const atualizarCliente = (id: string, clienteAtualizado: Partial<Cliente>) => {
    setClientes(clientes.map(c => c.id === id ? { ...c, ...clienteAtualizado } : c));
  };

  const removerCliente = (id: string) => {
    setClientes(clientes.filter(c => c.id !== id));
  };

  const adicionarLead = (lead: Omit<Lead, 'id'>) => {
    const novoLead = { ...lead, id: Date.now().toString() };
    setLeads([...leads, novoLead]);
  };

  const atualizarLead = (id: string, leadAtualizado: Partial<Lead>) => {
    setLeads(leads.map(l => l.id === id ? { ...l, ...leadAtualizado } : l));
  };

  const removerLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id));
  };

  const adicionarTarefa = (tarefa: Omit<Tarefa, 'id'>) => {
    const novaTarefa = { ...tarefa, id: Date.now().toString() };
    setTarefas([...tarefas, novaTarefa]);
  };

  const atualizarTarefa = (id: string, tarefaAtualizada: Partial<Tarefa>) => {
    setTarefas(tarefas.map(t => t.id === id ? { ...t, ...tarefaAtualizada } : t));
  };

  const removerTarefa = (id: string) => {
    setTarefas(tarefas.filter(t => t.id !== id));
  };

  const adicionarAtividade = (atividade: Omit<Atividade, 'id'>) => {
    const novaAtividade = { ...atividade, id: Date.now().toString() };
    setAtividades([novaAtividade, ...atividades]);
  };

  return (
    <CRMContext.Provider
      value={{
        clientes,
        leads,
        tarefas,
        atividades,
        metas,
        adicionarCliente,
        atualizarCliente,
        removerCliente,
        adicionarLead,
        atualizarLead,
        removerLead,
        adicionarTarefa,
        atualizarTarefa,
        removerTarefa,
        adicionarAtividade,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM deve ser usado dentro de CRMProvider');
  }
  return context;
}
