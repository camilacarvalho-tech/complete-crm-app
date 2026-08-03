/**
 * Integração ERP — arquitetura only (V1).
 * Amanhã: queries reais em empresas/{empresaId}/fluxoCaixa|contasPagar|estoque...
 */

export interface ErpContextApi {
  listarContasPagar: (empresaId: string) => Promise<unknown[]>
  listarRecebimentos: (empresaId: string) => Promise<unknown[]>
  fluxoCaixa: (empresaId: string, dias?: number) => Promise<unknown>
  listarEstoque: (empresaId: string) => Promise<unknown[]>
  listarCompras: (empresaId: string) => Promise<unknown[]>
  listarVendas: (empresaId: string) => Promise<unknown[]>
  resumoFinanceiro: (empresaId: string) => Promise<unknown>
  listarRh: (empresaId: string) => Promise<unknown[]>
}

const notReady = async (_empresaId: string): Promise<unknown[]> => {
  console.info('[Nexus AI] ERP context preparado — implementação V1.1')
  return []
}

export const erpContextApi: ErpContextApi = {
  listarContasPagar: notReady,
  listarRecebimentos: notReady,
  fluxoCaixa: async () => {
    console.info('[Nexus AI] ERP fluxoCaixa preparado')
    return { ready: false }
  },
  listarEstoque: notReady,
  listarCompras: notReady,
  listarVendas: notReady,
  resumoFinanceiro: async () => ({ ready: false }),
  listarRh: notReady,
}
