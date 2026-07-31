/**
 * Conector V1 — bases públicas empresariais (sem dados pessoais sensíveis).
 */
import type {
  ConnectorFetchContext,
  ConnectorRawRecord,
  LeadConnector,
  NormalizedLead,
} from './types'
import { hashSeed, mulberry32 } from './_utils'

const EMPRESAS = [
  'Alpha Crédito Ltda', 'Beta Soluções Financeiras', 'Gamma Corban ME',
  'Delta Consig SP', 'Epsilon Empréstimos', 'Zeta Benefícios SA',
  'Ômega Correspondente', 'Norte Capital ME', 'Sul Cred Serviços',
]

export const basesPublicasConnector: LeadConnector = {
  meta: {
    id: 'bases_publicas_empresas',
    label: 'Bases públicas (empresas)',
    descricao: '[DEMO — fora do registry V1.1] Dados sintéticos B2B; não usar em produção.',
    autorizado: true,
    enabled: false,
    version: '1.0.0',
    versao: '1.0.0',
    apiVersion: 1,
    tiposSuportados: ['empresa'],
  },

  async fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    const rand = mulberry32(
      hashSeed(
        `b2b|${ctx.filtros.cidade}|${ctx.filtros.estado}|${ctx.filtros.segmento}|${ctx.filtros.palavraChave}`
      )
    )
    const limite = ctx.limite ?? 6
    const cidade = ctx.filtros.cidade.trim() || 'Campinas'
    const estado = (ctx.filtros.estado.trim() || 'SP').toUpperCase()
    const segmento = ctx.filtros.segmento.trim() || 'empresa_b2b'
    const kw = ctx.filtros.palavraChave.trim().toLowerCase()
    const qtd = 3 + Math.floor(rand() * Math.min(limite, 6))
    const now = new Date().toISOString()
    const out: ConnectorRawRecord[] = []

    for (let i = 0; i < qtd; i++) {
      const razaoSocial = EMPRESAS[Math.floor(rand() * EMPRESAS.length)]
      if (kw && !razaoSocial.toLowerCase().includes(kw) && !segmento.includes(kw) && rand() > 0.5) {
        continue
      }

      const cnpjBase = String(10000000 + Math.floor(rand() * 89999999))
      const cnpj = `${cnpjBase.slice(0, 2)}.${cnpjBase.slice(2, 5)}.${cnpjBase.slice(5, 8)}/0001-${String(10 + Math.floor(rand() * 89))}`
      const ddd = 11 + Math.floor(rand() * 80)
      const telefone = `${ddd}3${String(Math.floor(1000000 + rand() * 8999999))}`

      out.push({
        externalId: `cnpj-${cnpj.replace(/\D/g, '')}`,
        fetchedAt: now,
        payload: {
          razaoSocial,
          cnpj,
          telefone,
          email: `contato@${razaoSocial.split(' ')[0].toLowerCase()}.empresa.local`,
          cidade,
          estado,
          segmento,
          palavraChave: kw || null,
          porte: rand() > 0.5 ? 'ME' : 'EPP',
        },
      })
    }

    return out.slice(0, limite)
  },

  normalize(raw): NormalizedLead | null {
    const p = raw.payload
    const nome = String(p.razaoSocial || '').trim()
    const cnpj = String(p.cnpj || '')
    if (!nome || cnpj.replace(/\D/g, '').length < 14) return null

    return {
      connectorId: 'bases_publicas_empresas',
      origemLabel: 'Bases públicas (empresas)',
      dedupeKey: `cnpj:${cnpj.replace(/\D/g, '')}`,
      tipo: 'empresa',
      nome,
      empresaNome: nome,
      cnpj,
      telefone: p.telefone ? String(p.telefone) : undefined,
      email: p.email ? String(p.email) : undefined,
      cidade: String(p.cidade || ''),
      estado: String(p.estado || '').toUpperCase(),
      segmento: String(p.segmento || ''),
      palavraChaveMatch: p.palavraChave ? String(p.palavraChave) : undefined,
      consentimentoLgpd: true,
      baseLegal:
        'Dados empresariais de acesso público / cadastro aberto (sem dados pessoais sensíveis).',
      observacoes: 'Potencial parceiro ou lead B2B',
      externalId: raw.externalId,
      metadados: { porte: p.porte, versaoConector: '1.0.0' },
    }
  },
}
