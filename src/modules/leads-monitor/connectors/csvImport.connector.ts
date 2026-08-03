/**
 * Conector CSV V1.2 — importa leads de arquivo/texto configurado na fonte.
 * Sem scraping: apenas dados fornecidos pelo tenant.
 */
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_CONFIG, COL_FONTES } from '../constants'
import type { IConnector, ConnectorFetchContext, ConnectorRawRecord, NormalizedLead } from './types'
import { SoftSkipError } from '../search/retry'
import { mapCsvRow, parseCsv } from './csvParse'

async function loadCsvText(ctx: ConnectorFetchContext): Promise<string> {
  const pending = await getDoc(doc(db, 'empresas', ctx.empresaId, COL_CONFIG, 'csv_pending'))
  if (pending.exists()) {
    const data = pending.data() as { csvText?: string; consumed?: boolean }
    if (data.csvText && !data.consumed) return data.csvText
  }

  const cfg = await getDoc(doc(db, 'empresas', ctx.empresaId, COL_CONFIG, 'csv_import'))
  if (cfg.exists()) {
    const data = cfg.data() as { csvText?: string }
    if (data.csvText) return data.csvText
  }

  const fontes = await getDocs(collection(db, 'empresas', ctx.empresaId, COL_FONTES))
  for (const d of fontes.docs) {
    const data = d.data() as { tipo?: string; status?: string; config?: { csvText?: string } }
    if (data.tipo === 'csv' && data.status === 'ativa' && data.config?.csvText) {
      return data.config.csvText
    }
  }

  return ''
}

export const csvImportConnector: IConnector = {
  meta: {
    id: 'csv_import',
    label: 'Arquivo CSV',
    descricao: 'Importação de leads/empresas via CSV autorizado pelo tenant',
    autorizado: true,
    enabled: true,
    version: '1.2.0',
    apiVersion: 1,
    tiposSuportados: ['pessoa', 'empresa'],
  },

  async fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    const text = await loadCsvText(ctx)
    if (!text.trim()) {
      throw new SoftSkipError('Nenhum CSV pendente para importar', 'no_csv')
    }
    const rows = parseCsv(text)
    const lim = ctx.limite ?? 200
    const now = new Date().toISOString()
    // Marca pending como consumido (best-effort) para não reprocessar em loop
    try {
      await setDoc(
        doc(db, 'empresas', ctx.empresaId, COL_CONFIG, 'csv_pending'),
        { csvText: text, consumed: true, consumidoEm: serverTimestamp() },
        { merge: true }
      )
    } catch {
      /* ignore */
    }
    return rows.slice(0, lim).map((row, idx) => ({
      externalId: `csv:${idx}:${row.nome || row.email || row.telefone || idx}`,
      payload: mapCsvRow(row),
      fetchedAt: now,
    }))
  },

  normalize(raw, ctx): NormalizedLead | null {
    const p = raw.payload || {}
    const nome = String(p.nome || '').trim()
    if (!nome) return null

    const telefone = String(p.telefone || '').replace(/\D/g, '') || undefined
    const email = String(p.email || '').trim() || undefined
    const cidade = String(p.cidade || ctx.filtros.cidade || '').trim()
    const estado = String(p.estado || ctx.filtros.estado || '')
      .trim()
      .toUpperCase()
    const segmento = String(p.segmento || ctx.filtros.segmento || 'empresa_b2b')
    const consent =
      String(p.consentimentoLgpd || 'true').toLowerCase() === 'true' ||
      String(p.consentimentoLgpd) === '1' ||
      String(p.consentimentoLgpd).toLowerCase() === 'sim'

    if (!consent) return null

    const cnpj = String(p.cnpj || '').replace(/\D/g, '') || undefined
    const dedupeKey = cnpj
      ? `cnpj:${cnpj}`
      : telefone
        ? `tel:${telefone}`
        : email
          ? `email:${email.toLowerCase()}`
          : `nome:${nome.toLowerCase()}:${cidade}`

    return {
      connectorId: this.meta.id,
      connectorVersion: this.meta.version,
      connectorApiVersion: this.meta.apiVersion,
      origemLabel: this.meta.label,
      dedupeKey,
      tipo: cnpj || String(p.site || '') ? 'empresa' : 'pessoa',
      nome,
      telefone,
      email,
      cidade,
      estado,
      segmento,
      palavraChaveMatch: ctx.filtros.palavraChave || undefined,
      empresaNome: nome,
      cnpj,
      consentimentoLgpd: true,
      baseLegal: 'Importação CSV autorizada pelo controlador (LGPD)',
      observacoes: [p.site, p.instagram, p.facebook, p.bairro, p.cep, p.cnae]
        .filter(Boolean)
        .map(String)
        .join(' · ') || undefined,
      metadados: {
        site: p.site,
        instagram: p.instagram,
        facebook: p.facebook,
        bairro: p.bairro,
        cep: p.cep,
        cnae: p.cnae,
        fonte: 'csv',
      },
      externalId: raw.externalId,
    }
  },
}

/** Grava CSV pendente para o próximo fetch do conector. */
export async function savePendingCsv(opts: {
  empresaId: string
  csvText: string
}): Promise<void> {
  await setDoc(doc(db, 'empresas', opts.empresaId, COL_CONFIG, 'csv_pending'), {
    csvText: opts.csvText,
    consumed: false,
    atualizadoEm: serverTimestamp(),
  })
}

/** Atualiza config.csvText de uma fonte CSV específica (opcional). */
export async function saveFonteCsvText(opts: {
  empresaId: string
  fonteId: string
  csvText: string
}): Promise<void> {
  await updateDoc(doc(db, 'empresas', opts.empresaId, COL_FONTES, opts.fonteId), {
    'config.csvText': opts.csvText,
    health: 'idle',
    atualizadoEm: serverTimestamp(),
  })
}
