/**
 * Contrato do conector — única peça que uma nova fonte precisa implementar.
 * O núcleo do Leads Monitor NÃO conhece fontes concretas.
 */

import type { FiltrosPesquisa, TipoOportunidade } from '../types'

/** Registro bruto e opaco da fonte (formato próprio do conector). */
export interface ConnectorRawRecord {
  /** ID estável na origem, se existir */
  externalId?: string
  payload: Record<string, unknown>
  fetchedAt: string
}

export interface ConnectorMeta {
  id: string
  label: string
  descricao: string
  /** Somente conectores autorizados entram no pipeline (LGPD). */
  autorizado: boolean
  /**
   * Se false, o conector fica registrado (visível) mas não executa.
   * Use para stubs / fontes futuras sem alterar o núcleo.
   */
  enabled: boolean
  versao: string
  tiposSuportados: TipoOportunidade[]
}

export interface ConnectorFetchContext {
  empresaId: string
  filtros: FiltrosPesquisa
  limite?: number
}

/**
 * Lead canônico após normalização — entrada das etapas seguintes do pipeline.
 * Produzido exclusivamente por `LeadConnector.normalize`.
 */
export interface NormalizedLead {
  connectorId: string
  origemLabel: string
  dedupeKey: string
  tipo: TipoOportunidade
  nome: string
  telefone?: string
  email?: string
  cidade: string
  estado: string
  segmento: string
  palavraChaveMatch?: string
  empresaNome?: string
  cnpj?: string
  consentimentoLgpd: boolean
  baseLegal: string
  observacoes?: string
  metadados?: Record<string, unknown>
  externalId?: string
}

/**
 * Interface obrigatória de toda fonte de leads.
 *
 * Fluxo do núcleo: Conector.fetch → Conector.normalize → Dedupe → Classificação → Score → Aprovação → CRM
 *
 * Para adicionar uma fonte: implementar `LeadConnector` e chamar `registerConnector(...)`.
 */
export interface LeadConnector {
  readonly meta: ConnectorMeta
  fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]>
  /**
   * Normaliza o payload da fonte para o modelo canônico.
   * Retorne `null` para descartar (inválido / sem base legal).
   */
  normalize(raw: ConnectorRawRecord, ctx: ConnectorFetchContext): NormalizedLead | null
}
