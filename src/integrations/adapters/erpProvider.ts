/**
 * Escolha Mock vs NX ERP real. O erpBridge não importa este arquivo para enviar leads.
 * Sync real de leads permanece no mock até o próximo comando.
 */
import { erpMockAdapter } from './erpMockAdapter'
import { nxErpAdapter } from './nxErpAdapter'
import type { ErpCampaignAdapter } from './erpTypes'
import type { ErpRuntimeMode } from '../erp/connectionStatus'

export function resolveErpRuntimeMode(): ErpRuntimeMode {
  return 'mock'
}

export function selectErpAdapter(mode: ErpRuntimeMode): ErpCampaignAdapter {
  return mode === 'real' ? nxErpAdapter : erpMockAdapter
}

export function getErpAdapter(): ErpCampaignAdapter {
  return selectErpAdapter(resolveErpRuntimeMode())
}

export function getNxErpHealthAdapter(): ErpCampaignAdapter {
  return nxErpAdapter
}
