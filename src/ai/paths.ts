/** Paths multi-tenant: empresas/{empresaId}/ai/... */

export function aiRoot(empresaId: string) {
  return ['empresas', empresaId, 'ai'] as const
}

export function aiCollection(empresaId: string, name: string) {
  return [...aiRoot(empresaId), name] as const
}

export const AI_COLLECTIONS = {
  conversas: 'conversas',
  mensagens: 'mensagens',
  memoria: 'memoria',
  conhecimento: 'conhecimento',
  agentes: 'agentes',
  configuracoes: 'configuracoes',
  logs: 'logs',
} as const

/** Doc único de configurações */
export function aiConfigDoc(empresaId: string) {
  return [...aiRoot(empresaId), AI_COLLECTIONS.configuracoes, 'default'] as const
}
