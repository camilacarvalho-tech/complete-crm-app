/**
 * CNPJ/QSA via BrasilAPI (já usada no Monitor). Não inventa CPF/WhatsApp.
 * QSA ≠ funcionário.
 */
import { digitsOnly } from '../../pipeline/normalizeFields'
import type { DiscoveredPersonRaw } from '../personSourceTypes'
import type { PersonSourceQueryResult } from '../personDiscoveryResult'

function mapQual(qual: string): string {
  const q = qual.toLowerCase()
  if (/admin/.test(q)) return 'ADMINISTRADOR'
  if (/respons/.test(q)) return 'RESPONSAVEL'
  if (/s[oó]cio|socio/.test(q)) return 'SOCIO'
  return 'SOCIO'
}

export async function searchReceitaCnpjQsa(cnpjRaw?: string): Promise<PersonSourceQueryResult> {
  const cnpj = digitsOnly(cnpjRaw)
  if (cnpj.length !== 14) {
    return {
      id: 'receita_cnpj_qsa',
      label: 'Receita CNPJ / QSA',
      kind: 'COMPANY_SOURCE',
      health: 'ATIVA',
      status: 'SKIPPED',
      people: [],
      message: 'CNPJ ausente — QSA não consultado.',
    }
  }
  const sourceUrl = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(sourceUrl, { signal: ctrl.signal })
    if (!res.ok) {
      return {
        id: 'receita_cnpj_qsa',
        label: 'Receita CNPJ / QSA',
        kind: 'COMPANY_SOURCE',
        health: res.status === 404 ? 'ATIVA' : 'ERRO',
        status: 'EMPTY',
        people: [],
        message: res.status === 404 ? 'CNPJ não encontrado.' : `BrasilAPI HTTP ${res.status}`,
      }
    }
    const data = (await res.json()) as {
      qsa?: Array<{ nome?: string; qual?: string; nome_rep_legal?: string; cpf_cnpj_socio?: string }>
    }
    const people: DiscoveredPersonRaw[] = []
    for (const row of data.qsa || []) {
      const personName = String(row.nome || '').trim()
      if (!personName) continue
      const relationToCompany = mapQual(String(row.qual || ''))
      const cpfDigits = digitsOnly(row.cpf_cnpj_socio)
      people.push({
        personName,
        cpf: cpfDigits.length === 11 ? cpfDigits : '',
        phone: '',
        whatsapp: '',
        email: '',
        jobTitle: String(row.qual || '').trim(),
        relationToCompany,
        vinculoVerificado: relationToCompany === 'SOCIO' || relationToCompany === 'ADMINISTRADOR',
        fonteVinculo: 'BrasilAPI / Receita Federal (QSA)',
        source: 'receita_cnpj_qsa',
        sourceType: 'COMPANY_SOURCE',
        sourceUrl,
        contactType: 'UNKNOWN',
        confidence: 75,
      })
    }
    return {
      id: 'receita_cnpj_qsa',
      label: 'Receita CNPJ / QSA',
      kind: 'COMPANY_SOURCE',
      health: 'ATIVA',
      status: people.length ? 'OK' : 'EMPTY',
      people,
      message: people.length ? `${people.length} pessoa(s) no QSA` : 'QSA sem nomes.',
    }
  } catch (e: unknown) {
    return {
      id: 'receita_cnpj_qsa',
      label: 'Receita CNPJ / QSA',
      kind: 'COMPANY_SOURCE',
      health: 'ERRO',
      status: 'EMPTY',
      people: [],
      message: e instanceof Error ? e.message : 'Falha na consulta QSA.',
    }
  } finally {
    clearTimeout(timer)
  }
}
