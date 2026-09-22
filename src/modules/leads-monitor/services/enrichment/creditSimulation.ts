/**
 * Consulta/simulação de crédito — só provedor configurado.
 * Sem credencial: todos os valores ficam null. Não inventa parcela/liberado.
 */
import { getBankProvider } from '../../../../integrations/providers'
import { digitsOnly } from '../../pipeline/normalizeFields'

export type CreditSimulationResult = {
  valorLiberado: number | null
  valorParcela: number | null
  quantidadeParcelas: number | null
  taxa: number | null
  bancoOferta: string
  dataConsultaCredito: string
  statusConsultaCredito: 'NOT_CONFIGURED' | 'OK' | 'ERROR' | 'SEM_RETORNO'
  message: string
}

export async function simulateCreditIfConfigured(opts: {
  cpf?: string
  produto?: string
}): Promise<CreditSimulationResult> {
  const empty: CreditSimulationResult = {
    valorLiberado: null,
    valorParcela: null,
    quantidadeParcelas: null,
    taxa: null,
    bancoOferta: '',
    dataConsultaCredito: new Date().toISOString(),
    statusConsultaCredito: 'NOT_CONFIGURED',
    message: 'Nenhuma API de crédito configurada.',
  }
  const cpf = digitsOnly(opts.cpf)
  if (cpf.length !== 11) return { ...empty, statusConsultaCredito: 'SEM_RETORNO', message: 'CPF ausente — simulação não executada.' }
  try {
    const r = await getBankProvider().consultarCpf({ cpf })
    if (!r.ok) {
      return {
        ...empty,
        statusConsultaCredito: r.reason === 'not_configured' ? 'NOT_CONFIGURED' : 'ERROR',
        message: r.message,
      }
    }
    return { ...empty, statusConsultaCredito: 'SEM_RETORNO', message: r.message }
  } catch (e: unknown) {
    return {
      ...empty,
      statusConsultaCredito: 'ERROR',
      message: e instanceof Error ? e.message : 'erro na consulta de crédito',
    }
  }
}
