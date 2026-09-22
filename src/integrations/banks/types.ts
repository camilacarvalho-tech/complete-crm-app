export const BANK_ADAPTER_IDS = ['facta', 'novo_saque', 'icred', 'toke_real'] as const
export type BankAdapterId = (typeof BANK_ADAPTER_IDS)[number]

export const BANK_ADAPTER_LABELS: Record<BankAdapterId, string> = {
  facta: 'FACTA',
  novo_saque: 'NOVO SAQUE',
  icred: 'ICRED',
  toke_real: 'TOKE REAL',
}

export type SimulationStatus = 'Aguardando API' | 'Dados retornados pela instituição' | 'Erro de API'

export interface SimulationOffer {
  banco: string
  bancoId: BankAdapterId
  status: SimulationStatus
  produto: string
  operacao: string
  valorLiberado: number | null
  parcela: number | null
  prazo: number | null
  taxaMensal: number | null
  taxaAnual: number | null
  saldoDevedor: number | null
  margem: number | null
  troco: number | null
  protocolo: string | null
  contrato: string | null
  origem: string
  timestamp: string
  message: string
}

export interface InstitutionAdapter {
  id: BankAdapterId
  name: string
  simulate(input: SimulationInput): Promise<SimulationOffer>
  isConfigured(): boolean
}

export interface SimulationInput {
  clienteId?: string
  clienteNome?: string
  cpf?: string
  produto?: string
  operacao?: string
  origem?: string
}

export function emptyOffer(adapter: InstitutionAdapter, input: SimulationInput, extra?: Partial<SimulationOffer>): SimulationOffer {
  return {
    banco: adapter.name,
    bancoId: adapter.id,
    status: extra?.status || 'Aguardando API',
    produto: input.produto || '',
    operacao: input.operacao || '',
    valorLiberado: extra?.valorLiberado ?? null,
    parcela: extra?.parcela ?? null,
    prazo: extra?.prazo ?? null,
    taxaMensal: extra?.taxaMensal ?? null,
    taxaAnual: extra?.taxaAnual ?? null,
    saldoDevedor: extra?.saldoDevedor ?? null,
    margem: extra?.margem ?? null,
    troco: extra?.troco ?? null,
    protocolo: extra?.protocolo ?? null,
    contrato: extra?.contrato ?? null,
    origem: input.origem || 'digitacao',
    timestamp: extra?.timestamp || new Date().toISOString(),
    message: extra?.message || 'Aguardando API',
  }
}

function readVite(key: string): string {
  try {
    return String((import.meta as { env?: Record<string, string> }).env?.[key] || '').trim()
  } catch {
    return ''
  }
}

/** Só URL pública. Chaves ficam no backend. */
export function publicBankApiUrl(id: BankAdapterId): string {
  const map: Record<BankAdapterId, string> = {
    facta: 'VITE_FACTA_API_URL',
    novo_saque: 'VITE_NOVO_SAQUE_API_URL',
    icred: 'VITE_ICRED_API_URL',
    toke_real: 'VITE_TOKE_REAL_API_URL',
  }
  return readVite(map[id])
}
