/**
 * BrasilAPI CNPJ — quadro de sócios/administradores (QSA).
 * Nunca classifica QSA como funcionário.
 */
import { digitsOnly, extractCnpj, formatPhoneBrIntl } from '../../pipeline/normalizeFields'
import type { PeopleSource, PeopleSourceHit, PeopleSourceResult } from '../../services/peopleSearch/types'

function mapQualificacao(qual: string): PeopleSourceHit['relationToCompany'] {
  const q = qual.toLowerCase()
  if (/admin/.test(q)) return 'administrador'
  if (/s[oó]cio|socio/.test(q)) return 'socio'
  return 'nao_confirmado'
}

export const brasilApiQsaSource: PeopleSource = {
  id: 'brasilapi_qsa',
  label: 'BrasilAPI · QSA',
  async search(ctx): Promise<PeopleSourceResult> {
    const op = ctx.opportunity
    const cnpj =
      digitsOnly(op.cnpj) ||
      extractCnpj(op.nome) ||
      extractCnpj(op.observacoes) ||
      extractCnpj(String(op.metadados?.cnpj || '')) ||
      ''
    if (cnpj.length !== 14) {
      return {
        sourceId: 'brasilapi_qsa',
        label: 'BrasilAPI · QSA',
        hits: [],
        skipped: true,
        error: 'CNPJ não identificado — QSA não consultado.',
      }
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: ctrl.signal })
      if (res.status === 404) {
        return {
          sourceId: 'brasilapi_qsa',
          label: 'BrasilAPI · QSA',
          hits: [],
          skipped: true,
          error: 'CNPJ não encontrado na BrasilAPI.',
        }
      }
      if (!res.ok) {
        return {
          sourceId: 'brasilapi_qsa',
          label: 'BrasilAPI · QSA',
          hits: [],
          error: `BrasilAPI HTTP ${res.status}`,
        }
      }
      const data = (await res.json()) as {
        ddd_telefone_1?: string
        qsa?: Array<{ nome?: string; qual?: string }>
      }
      const sourceUrl = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`
      const companyPhone = formatPhoneBrIntl(data.ddd_telefone_1)
      const hits: PeopleSourceHit[] = []
      for (const row of data.qsa || []) {
        const personName = String(row.nome || '').trim()
        if (!personName) continue
        const relationToCompany = mapQualificacao(String(row.qual || ''))
        hits.push({
          personName,
          jobTitle: String(row.qual || '').trim(),
          relationToCompany,
          phone: '',
          phoneType: 'nao_identificado',
          phoneSource: '',
          phoneSourceUrl: '',
          whatsapp: '',
          whatsappSource: '',
          whatsappSourceUrl: '',
          whatsappVerified: false,
          source: 'brasilapi_qsa',
          sourceUrl,
          sourceName: 'BrasilAPI / Receita Federal (QSA)',
          confidence: relationToCompany === 'nao_confirmado' ? 40 : 80,
          linkedinUrl: '',
          instagramUrl: '',
          facebookUrl: '',
        })
      }
      return {
        sourceId: 'brasilapi_qsa',
        label: 'BrasilAPI · QSA',
        hits,
        companyPhone,
      }
    } catch (e: any) {
      return {
        sourceId: 'brasilapi_qsa',
        label: 'BrasilAPI · QSA',
        hits: [],
        error: e?.message || 'Falha ao consultar BrasilAPI.',
      }
    } finally {
      clearTimeout(timer)
    }
  },
}
