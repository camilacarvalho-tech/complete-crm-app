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
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { Cliente, Lead, Tarefa, Atividade, Meta } from '../types';
import app from '../../firebase';

const db = getFirestore(app);
const API_URL = "http://127.0.0.1:8000/leads";

interface CRMContextType {
  clientes: Cliente[];
  leads: Lead[];
  tarefas: Tarefa[];
  atividades: Atividade[];
  metas: Meta[];
  adicionarCliente: (cliente: Omit<Cliente, 'id'>) => Promise<string>;
  atualizarCliente: (id: string, cliente: Partial<Cliente>) => Promise<void>;
  removerCliente: (id: string) => Promise<void>;
  adicionarLead: (lead: Omit<Lead, 'id'>) => void;
  atualizarLead: (id: string, lead: Partial<Lead>) => void;
  removerLead: (id: string) => void;
  adicionarTarefa: (tarefa: Omit<Tarefa, 'id'>) => void;
  atualizarTarefa: (id: string, tarefa: Partial<Tarefa>) => void;
  removerTarefa: (id: string) => void;
  adicionarAtividade: (atividade: Omit<Atividade, 'id'>) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export function CRMProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);

  // Clientes — escuta em tempo real do Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const lista: Cliente[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Cliente, 'id'>)
      }));
      setClientes(lista);
    });
    return () => unsub();
  }, []);

  // Leads — carrega da API legada
  useEffect(() => {
    async function carregarLeads() {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        setLeads(data);
      } catch (error) {
        console.error("Erro ao carregar leads:", error);
      }
    }
    carregarLeads();
  }, []);

  // Clientes — Firestore
  const adicionarCliente = async (cliente: Omit<Cliente, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'clientes'), {
      ...cliente,
      criadoEm: serverTimestamp()
    });
    return docRef.id;
  };

  const atualizarCliente = async (id: string, clienteAtualizado: Partial<Cliente>) => {
    await updateDoc(doc(db, 'clientes', id), clienteAtualizado);
  };

  const removerCliente = async (id: string) => {
    await deleteDoc(doc(db, 'clientes', id));
  };

  // Leads — estado local
  const adicionarLead = (lead: Omit<Lead, 'id'>) => {
    setLeads((prev) => [...prev, { ...lead, id: Date.now().toString() }]);
  };
  const atualizarLead = (id: string, leadAtualizado: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...leadAtualizado } : l)));
  };
  const removerLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  // Tarefas
  const adicionarTarefa = (tarefa: Omit<Tarefa, 'id'>) => {
    setTarefas((prev) => [...prev, { ...tarefa, id: Date.now().toString() }]);
  };
  const atualizarTarefa = (id: string, tarefaAtualizada: Partial<Tarefa>) => {
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, ...tarefaAtualizada } : t)));
  };
  const removerTarefa = (id: string) => {
    setTarefas((prev) => prev.filter((t) => t.id !== id));
  };

  // Atividades
  const adicionarAtividade = (atividade: Omit<Atividade, 'id'>) => {
    setAtividades((prev) => [{ ...atividade, id: Date.now().toString() }, ...prev]);
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
    throw new Error('useCRM deve ser usado dentro de CRMProvider');
  }
  return context;
}
