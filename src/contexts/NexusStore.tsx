import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useTenantCollection } from '../hooks/useTenantCollection'
import type { NexusCliente, NexusRecord } from '../types/nexus'

type Col<T extends { id: string }> = ReturnType<typeof useTenantCollection<T>>

interface NexusStoreValue {
  clientes: Col<NexusCliente>
  propostas: Col<NexusRecord>
  digitacoes: Col<NexusRecord>
  campanhas: Col<NexusRecord>
  conversas: Col<NexusRecord>
  mensagens: Col<NexusRecord>
  documentos: Col<NexusRecord>
  transacoes: Col<NexusRecord>
  ligacoes: Col<NexusRecord>
  bancos: Col<NexusRecord>
  automacoes: Col<NexusRecord>
  remarketing: Col<NexusRecord>
  agenda: Col<NexusRecord>
  biblioteca: Col<NexusRecord>
  auditoria: Col<NexusRecord>
  usuariosEmpresa: Col<NexusRecord>
  produtos: Col<NexusRecord>
  estoque: Col<NexusRecord>
  fornecedores: Col<NexusRecord>
  comissoes: Col<NexusRecord>
  contratos: Col<NexusRecord>
  equipes: Col<NexusRecord>
  notificacoes: Col<NexusRecord>
  leticiaRuns: Col<NexusRecord>
  automacaoEventos: Col<NexusRecord>
  convenios: Col<NexusRecord>
  viewsSalvas: Col<NexusRecord>
  etiquetas: Col<NexusRecord>
}

const NexusStoreContext = createContext<NexusStoreValue | undefined>(undefined)

export function NexusStoreProvider({ children }: { children: ReactNode }) {
  const clientes = useTenantCollection<NexusCliente>('clientes', [])
  const propostas = useTenantCollection<NexusRecord>('propostas', [])
  const digitacoes = useTenantCollection<NexusRecord>('digitacoes', [])
  const campanhas = useTenantCollection<NexusRecord>('campanhas', [])
  const conversas = useTenantCollection<NexusRecord>('conversas', [])
  const mensagens = useTenantCollection<NexusRecord>('mensagens', [])
  const documentos = useTenantCollection<NexusRecord>('documentos', [])
  const transacoes = useTenantCollection<NexusRecord>('transacoesFinanceiras', [])
  const ligacoes = useTenantCollection<NexusRecord>('ligacoes', [])
  const bancos = useTenantCollection<NexusRecord>('bancos', [])
  const automacoes = useTenantCollection<NexusRecord>('automacoes', [])
  const remarketing = useTenantCollection<NexusRecord>('remarketingRegras', [])
  const agenda = useTenantCollection<NexusRecord>('agenda', [])
  const biblioteca = useTenantCollection<NexusRecord>('biblioteca', [])
  const auditoria = useTenantCollection<NexusRecord>('auditoria', [])
  const usuariosEmpresa = useTenantCollection<NexusRecord>('usuariosEmpresa', [])
  const produtos = useTenantCollection<NexusRecord>('produtos', [])
  const estoque = useTenantCollection<NexusRecord>('estoque', [])
  const fornecedores = useTenantCollection<NexusRecord>('fornecedores', [])
  const comissoes = useTenantCollection<NexusRecord>('comissoes', [])
  const contratos = useTenantCollection<NexusRecord>('contratos', [])
  const equipes = useTenantCollection<NexusRecord>('equipes', [])
  const notificacoes = useTenantCollection<NexusRecord>('notificacoes', [])
  const leticiaRuns = useTenantCollection<NexusRecord>('leticiaRuns', [])
  const automacaoEventos = useTenantCollection<NexusRecord>('automacaoEventos', [])
  const convenios = useTenantCollection<NexusRecord>('convenios', [])
  const viewsSalvas = useTenantCollection<NexusRecord>('viewsSalvas', [])
  const etiquetas = useTenantCollection<NexusRecord>('etiquetas', [])

  const value = useMemo(
    () => ({
      clientes,
      propostas,
      digitacoes,
      campanhas,
      conversas,
      mensagens,
      documentos,
      transacoes,
      ligacoes,
      bancos,
      automacoes,
      remarketing,
      agenda,
      biblioteca,
      auditoria,
      usuariosEmpresa,
      produtos,
      estoque,
      fornecedores,
      comissoes,
      contratos,
      equipes,
      notificacoes,
      leticiaRuns,
      automacaoEventos,
      convenios,
      viewsSalvas,
      etiquetas,
    }),
    [
      clientes,
      propostas,
      digitacoes,
      campanhas,
      conversas,
      mensagens,
      documentos,
      transacoes,
      ligacoes,
      bancos,
      automacoes,
      remarketing,
      agenda,
      biblioteca,
      auditoria,
      usuariosEmpresa,
      produtos,
      estoque,
      fornecedores,
      comissoes,
      contratos,
      equipes,
      notificacoes,
      leticiaRuns,
      automacaoEventos,
      convenios,
      viewsSalvas,
      etiquetas,
    ]
  )

  return <NexusStoreContext.Provider value={value}>{children}</NexusStoreContext.Provider>
}

export function useNexusStore(): NexusStoreValue {
  const ctx = useContext(NexusStoreContext)
  if (!ctx) throw new Error('useNexusStore deve ser usado dentro de NexusStoreProvider')
  return ctx
}
