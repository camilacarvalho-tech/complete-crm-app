/**
 * Contrato oficial do conector (IConnector).
 * O núcleo do Leads Monitor NÃO conhece fontes concretas.
 *
 * Versionamento:
 * - `meta.id` — identidade estável (ex.: integracao_api)
 * - `meta.apiVersion` — geração do contrato (1, 2, …)
 * - `meta.version` — semver da implementação (1.0.0, 1.1.0, …)
 *
 * Empresas podem pinhar `connectorId` + `apiVersion` na config sem quebrar quem ficou em v1.
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
  /** Identidade estável do conector (não muda entre versões). */
  id: string
  label: string
  descricao: string
  /** Somente conectores autorizados entram no pipeline (LGPD). */
  autorizado: boolean
  /**
   * Se false, o conector fica registrado (visível) mas não executa.
   * Preferir override por config da empresa nas versões futuras;
   * o flag de código serve de default / stub.
   */
  enabled: boolean
  /** Semver da implementação (ex.: 1.0.0). */
  version: string
  /**
   * @deprecated Use `version`. Mantido para compatibilidade V1.
   */
  versao?: string
  /** Geração do contrato IConnector (v1, v2…). */
  apiVersion: number
  tiposSuportados: TipoOportunidade[]
  /** Link opcional para docs do conector. */
  docsUrl?: string
}

export interface ConnectorFetchContext {
  /** Tenant obrigatório — nunca omitir (multi-tenant). */
  empresaId: string
  filtros: FiltrosPesquisa
  limite?: number
  /** Se definido, o registry resolve esta apiVersion; senão usa a mais recente registrada. */
  preferredApiVersion?: number
  /** Secrets/credenciais configurados para o conector (apiKey, authToken, etc) */
  secrets?: Record<string, string>
}

/**
 * Lead canônico após normalização — entrada das etapas seguintes do pipeline.
 * Produzido exclusivamente por `IConnector.normalize`.
 */
export interface NormalizedLead {
  connectorId: string
  connectorVersion?: string
  connectorApiVersion?: number
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
 * Interface única obrigatória de toda fonte de leads (IConnector).
 *
 * Fluxo: fetch → normalize → Dedupe → Classify/Score → Aprovação → CRM
 *
 * Para adicionar uma fonte: implementar `IConnector` e `registerConnector(...)`.
 */
export interface IConnector {
  readonly meta: ConnectorMeta
  fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]>
  /**
   * Normaliza o payload da fonte para o modelo canônico.
   * Retorne `null` para descartar (inválido / sem base legal).
   */
  normalize(raw: ConnectorRawRecord, ctx: ConnectorFetchContext): NormalizedLead | null
}

/**
 * @deprecated Use `IConnector`. Alias mantido para não quebrar imports V1.
 */
export type LeadConnector = IConnector

/** Chave de registro versionada: id@apiVersion */
export function connectorRegistryKey(id: string, apiVersion: number): string {
  return `${id}@${apiVersion}`
}
