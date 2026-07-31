/**
 * Conector V1 — formulários autorizados (consentimento LGPD).
 * Amostras determinísticas; substituir fetch() por API real sem mudar o núcleo.
 */
import type {
  ConnectorFetchContext,
  ConnectorRawRecord,
  LeadConnector,
  NormalizedLead,
} from './types'
import { hashSeed, mulberry32 } from './_utils'

const NOMES = [
  'Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Alves', 'Elena Costa',
  'Fábio Rocha', 'Gabriela Nunes', 'Henrique Dias', 'Iris Martins', 'João Pereira',
]

const BAIRROS = ['Centro', 'Jardim América', 'Vila Nova', 'Industrial', 'Boa Vista']

export const formulariosConnector: LeadConnector = {
  meta: {
    id: 'formularios_autorizados',
    label: 'Formulários autorizados',
    descricao: '[DEMO — fora do registry V1.1] Leads sintéticos; não usar em produção.',
    autorizado: true,
    enabled: false,
    version: '1.0.0',
    versao: '1.0.0',
    apiVersion: 1,
    tiposSuportados: ['pessoa'],
  },

  async fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    const rand = mulberry32(
      hashSeed(
        `form|${ctx.empresaId}|${ctx.filtros.cidade}|${ctx.filtros.estado}|${ctx.filtros.segmento}|${ctx.filtros.palavraChave}`
      )
    )
    const limite = ctx.limite ?? 8
    const cidade = ctx.filtros.cidade.trim() || 'São Paulo'
    const estado = (ctx.filtros.estado.trim() || 'SP').toUpperCase()
    const segmento = ctx.filtros.segmento.trim() || 'credito_clt'
    const kw = ctx.filtros.palavraChave.trim().toLowerCase()
    const qtd = 4 + Math.floor(rand() * Math.min(limite, 8))
    const now = new Date().toISOString()
    const out: ConnectorRawRecord[] = []

    for (let i = 0; i < qtd; i++) {
      const nome = NOMES[Math.floor(rand() * NOMES.length)]
      if (kw && !nome.toLowerCase().includes(kw) && !segmento.includes(kw) && rand() > 0.55) continue

      const ddd = 11 + Math.floor(rand() * 80)
      const telefone = `${ddd}9${String(Math.floor(10000000 + rand() * 89999999))}`
      const externalId = `form-${telefone}`

      out.push({
        externalId,
        fetchedAt: now,
        payload: {
          nome,
          telefone,
          email: `${nome.split(' ')[0].toLowerCase()}.${i}@lead-autorizado.local`,
          cidade,
          estado,
          segmento,
          palavraChave: kw || null,
          bairro: BAIRROS[Math.floor(rand() * BAIRROS.length)],
          optIn: true,
          canal: 'landing_page',
        },
      })
    }

    return out.slice(0, limite)
  },

  normalize(raw, _ctx): NormalizedLead | null {
    const p = raw.payload
    if (!p.optIn) return null
    const telefone = String(p.telefone || '')
    const nome = String(p.nome || '').trim()
    if (!nome || telefone.replace(/\D/g, '').length < 10) return null

    return {
      connectorId: 'formularios_autorizados',
      origemLabel: 'Formulários autorizados',
      dedupeKey: `form:${telefone.replace(/\D/g, '')}`,
      tipo: 'pessoa',
      nome,
      telefone,
      email: p.email ? String(p.email) : undefined,
      cidade: String(p.cidade || ''),
      estado: String(p.estado || '').toUpperCase(),
      segmento: String(p.segmento || ''),
      palavraChaveMatch: p.palavraChave ? String(p.palavraChave) : undefined,
      consentimentoLgpd: true,
      baseLegal: 'Consentimento do titular (Art. 7º, I, LGPD) — formulário com opt-in.',
      observacoes: p.bairro ? `Interesse declarado · ${p.bairro}` : 'Interesse declarado',
      externalId: raw.externalId,
      metadados: { canal: p.canal, versaoConector: '1.0.0' },
    }
  },
}
