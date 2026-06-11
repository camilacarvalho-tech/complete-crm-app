import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';

import {
  getFirestore,
  collection,
  onSnapshot
} from 'firebase/firestore';

import {
  Cliente,
  Lead,
  Tarefa,
  Atividade,
  Meta
} from '../types';

import app from '../../firebase';

const db = getFirestore(app);

interface CRMContextType {

  clientes: Cliente[];
  leads: Lead[];
  tarefas: Tarefa[];
  atividades: Atividade[];
  metas: Meta[];

  adicionarCliente: (
    cliente: Omit<Cliente, 'id'>
  ) => void;

  atualizarCliente: (
    id: string,
    cliente: Partial<Cliente>
  ) => void;

  removerCliente: (
    id: string
  ) => void;

  adicionarLead: (
    lead: Omit<Lead, 'id'>
  ) => void;

  atualizarLead: (
    id: string,
    lead: Partial<Lead>
  ) => void;

  removerLead: (
    id: string
  ) => void;

  adicionarTarefa: (
    tarefa: Omit<Tarefa, 'id'>
  ) => void;

  atualizarTarefa: (
    id: string,
    tarefa: Partial<Tarefa>
  ) => void;

  removerTarefa: (
    id: string
  ) => void;

  adicionarAtividade: (
    atividade: Omit<Atividade, 'id'>
  ) => void;
}

const CRMContext = createContext<
  CRMContextType | undefined
>(undefined);

export function CRMProvider({
  children
}: {
  children: ReactNode
}) {

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);

  // FIREBASE REALTIME
  useEffect(() => {

    const unsubscribe = onSnapshot(
      collection(db, 'leads'),
      (snapshot) => {

        const lista: any[] = [];

        snapshot.forEach((doc) => {

          lista.push({
            id: doc.id,
            ...doc.data(),
            status: doc.data().status || 'novo'
          });

        });

        console.log(
          'CRM CONECTADO:',
          lista
        );

        setLeads(lista);

      }
    );

    return () => unsubscribe();

  }, []);

  // CLIENTES
  const adicionarCliente = (
    cliente: Omit<Cliente, 'id'>
  ) => {

    const novoCliente = {
      ...cliente,
      id: Date.now().toString()
    };

    setClientes([
      ...clientes,
      novoCliente
    ]);
  };

  const atualizarCliente = (
    id: string,
    clienteAtualizado: Partial<Cliente>
  ) => {

    setClientes(
      clientes.map((cliente) =>
        cliente.id === id
          ? {
              ...cliente,
              ...clienteAtualizado
            }
          : cliente
      )
    );
  };

  const removerCliente = (
    id: string
  ) => {

    setClientes(
      clientes.filter(
        (cliente) =>
          cliente.id !== id
      )
    );
  };

  // LEADS
  const adicionarLead = (
    lead: Omit<Lead, 'id'>
  ) => {

    const novoLead = {
      ...lead,
      id: Date.now().toString()
    };

    setLeads([
      ...leads,
      novoLead
    ]);
  };

  const atualizarLead = (
    id: string,
    leadAtualizado: Partial<Lead>
  ) => {

    setLeads(
      leads.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              ...leadAtualizado
            }
          : lead
      )
    );
  };

  const removerLead = (
    id: string
  ) => {

    setLeads(
      leads.filter(
        (lead) =>
          lead.id !== id
      )
    );
  };

  // TAREFAS
  const adicionarTarefa = (
    tarefa: Omit<Tarefa, 'id'>
  ) => {

    const novaTarefa = {
      ...tarefa,
      id: Date.now().toString()
    };

    setTarefas([
      ...tarefas,
      novaTarefa
    ]);
  };

  const atualizarTarefa = (
    id: string,
    tarefaAtualizada: Partial<Tarefa>
  ) => {

    setTarefas(
      tarefas.map((tarefa) =>
        tarefa.id === id
          ? {
              ...tarefa,
              ...tarefaAtualizada
            }
          : tarefa
      )
    );
  };

  const removerTarefa = (
    id: string
  ) => {

    setTarefas(
      tarefas.filter(
        (tarefa) =>
          tarefa.id !== id
      )
    );
  };

  // ATIVIDADES
  const adicionarAtividade = (
    atividade: Omit<Atividade, 'id'>
  ) => {

    const novaAtividade = {
      ...atividade,
      id: Date.now().toString()
    };

    setAtividades([
      novaAtividade,
      ...atividades
    ]);
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

        adicionarAtividade

      }}
    >

      {children}

    </CRMContext.Provider>

  );
}

export function useCRM() {

  const context = useContext(CRMContext);

  if (!context) {

    throw new Error(
      'useCRM deve ser usado dentro de CRMProvider'
    );

  }

  return context;
}