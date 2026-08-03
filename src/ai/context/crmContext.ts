/**
 * Integração CRM — arquitetura only (V1).
 * Amanhã: queries reais em empresas/{empresaId}/clientes|tarefas|campanhas...
 */

export interface CrmContextApi {
  listarClientes: (empresaId: string, limite?: number) => Promise<unknown[]>
  listarLeads: (empresaId: string) => Promise<unknown[]>
  listarOportunidades: (empresaId: string) => Promise<unknown[]>
  listarTarefas: (empresaId: string) => Promise<unknown[]>
  listarAgenda: (empresaId: string, data?: string) => Promise<unknown[]>
  listarCampanhas: (empresaId: string) => Promise<unknown[]>
}

const notReady = async (_empresaId: string): Promise<unknown[]> => {
  console.info('[Nexus AI] CRM context preparado — implementação V1.1')
  return []
}

export const crmContextApi: CrmContextApi = {
  listarClientes: notReady,
  listarLeads: notReady,
  listarOportunidades: notReady,
  listarTarefas: notReady,
  listarAgenda: notReady,
  listarCampanhas: notReady,
}
