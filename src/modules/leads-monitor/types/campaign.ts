import type { PesquisaSalva } from '../types'

/** Campanha = pesquisa salva já persistida em leadsMonitorPesquisas. */
export type CampanhaMonitor = PesquisaSalva & {
  descricao?: string
  objetivo?: string
}

export const CAMPANHA_OBJETIVOS = [
  { id: 'CREDITO_CLT', label: 'Crédito CLT' },
  { id: 'INSS', label: 'INSS' },
  { id: 'SERVIDOR', label: 'Servidor público' },
  { id: 'FGTS', label: 'FGTS' },
  { id: 'EMPRESTIMOS', label: 'Empréstimos' },
  { id: 'OUTROS', label: 'Prospecção empresarial' },
] as const
