import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { MENU_ITEMS } from '../config/menuConfig'
import { labelPt } from './uiPt'

/** Módulos reais do menu, mais Clínica para o mesmo histórico central. */
export const AUDIT_MODULES = [...MENU_ITEMS.map((m) => m.label), 'Clínica']

const MODULO_ALIAS: Record<string, string> = {
  clientes: 'Clientes',
  cliente: 'Clientes',
  propostas: 'Propostas',
  proposta: 'Propostas',
  digitacao: 'Digitação',
  digitação: 'Digitação',
  kanban: 'Kanban',
  pipeline: 'Kanban',
  atendimento: 'Chat Clientes',
  whatsapp: 'Chat Clientes',
  documentos: 'Chat Clientes',
  chat: 'Chat Clientes',
  'chat interno': 'Chat Interno',
  comunicacao: 'Chat Interno',
  campanhas: 'Campanhas',
  remarketing: 'Remarketing',
  'mkt roi': 'MKT ROI',
  marketing: 'MKT ROI',
  automacao: 'Automação',
  automação: 'Automação',
  leticia: 'Automação',
  'leads monitor': 'Leads Monitor',
  leads_monitor: 'Leads Monitor',
  'nexus ai': 'Nexus AI',
  financeiro: 'Financeiro',
  configuracoes: 'Configurações',
  configurações: 'Configurações',
  auditoria: 'Auditoria',
  clinica: 'Clínica',
  clínica: 'Clínica',
}

export type AuditLogInput = {
  empresaId: string | null
  empresaNome?: string
  funcionarioId?: string
  funcionarioNome?: string
  usuarioId?: string
  usuarioNome?: string
  modulo: string
  submodulo?: string
  entidadeTipo?: string
  entidade?: string
  entidadeId?: string
  clienteId?: string
  clienteNome?: string
  cpfCliente?: string
  acao: string
  descricao?: string
  dadosAntes?: unknown
  dadosDepois?: unknown
  antes?: unknown
  depois?: unknown
  origem?: string
  ip?: string
  metadata?: Record<string, unknown>
}

export function moduloAuditoria(value?: string) {
  const raw = String(value || '').trim()
  if (!raw) return '—'
  if (AUDIT_MODULES.includes(raw)) return raw
  return MODULO_ALIAS[raw.toLowerCase()] || labelPt(raw)
}

export const auditService = {
  async log(entry: AuditLogInput) {
    if (!entry.empresaId) return
    const funcionarioId = entry.funcionarioId || entry.usuarioId || ''
    const funcionarioNome = entry.funcionarioNome || entry.usuarioNome || ''
    const modulo = moduloAuditoria(entry.modulo)
    const acao = entry.acao
    try {
      await addDoc(collection(db, 'empresas', entry.empresaId, 'auditoria'), {
        empresaId: entry.empresaId,
        empresaNome: entry.empresaNome || '',
        funcionarioId,
        funcionarioNome,
        usuarioId: funcionarioId,
        usuarioNome: funcionarioNome,
        modulo,
        submodulo: entry.submodulo || '',
        entidadeTipo: entry.entidadeTipo || entry.entidade || '',
        entidade: entry.entidadeTipo || entry.entidade || '',
        entidadeId: entry.entidadeId || '',
        clienteId: entry.clienteId || '',
        clienteNome: entry.clienteNome || '',
        cpfCliente: entry.cpfCliente || '',
        acao,
        descricao: entry.descricao || labelPt(acao),
        dadosAntes: entry.dadosAntes ?? entry.antes ?? null,
        dadosDepois: entry.dadosDepois ?? entry.depois ?? null,
        antes: entry.dadosAntes ?? entry.antes ?? null,
        depois: entry.dadosDepois ?? entry.depois ?? null,
        origem: entry.origem || (funcionarioNome ? 'FUNCIONÁRIO' : 'SISTEMA'),
        ip: entry.ip || '',
        metadata: entry.metadata || null,
        quando: serverTimestamp(),
      })
    } catch (error) {
      console.warn('[audit]', error)
    }
  },
}

/** Compatível com as chamadas já existentes. Grava no mesmo histórico central. */
export async function writeAudit(params: {
  empresaId: string | null
  usuarioId?: string
  usuarioNome?: string
  modulo: string
  acao: string
  entidade?: string
  entidadeId?: string
  antes?: unknown
  depois?: unknown
  submodulo?: string
  clienteId?: string
  clienteNome?: string
  cpfCliente?: string
  descricao?: string
  origem?: string
  empresaNome?: string
}) {
  const depois = params.depois && typeof params.depois === 'object' ? params.depois as Record<string, unknown> : {}
  await auditService.log({
    ...params,
    funcionarioId: params.usuarioId,
    funcionarioNome: params.usuarioNome,
    clienteId: params.clienteId || String(depois.clienteId || ''),
    clienteNome: params.clienteNome || String(depois.clienteNome || depois.nome || depois.para || ''),
    cpfCliente: params.cpfCliente || String(depois.cpf || ''),
    dadosAntes: params.antes,
    dadosDepois: params.depois,
  })
}
