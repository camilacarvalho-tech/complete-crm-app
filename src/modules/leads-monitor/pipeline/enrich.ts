/**
 * Enriquecimento com dados empresariais públicos (BrasilAPI / Receita).
 * Não inventa e-mail, CNPJ, porte ou telefone.
 */
import type { NormalizedLead } from '../connectors/types'
import { digitsOnly, extractCnpj, formatCnpj, formatPhoneBr } from './normalizeFields'

export interface EnrichedLead extends NormalizedLead {
  dadosEnriquecidos?: {
    telefoneFormatado?: string
    razaoSocial?: string
    nomeFantasia?: string
    situacaoCadastral?: string
    cnaePrincipal?: string
    cnaesSecundarios?: string[]
    porteEmpresa?: string
    dataAbertura?: string
    cnpjValidado?: boolean
    scoreEnriquecimento?: number
    fonteEnriquecimento?: string[]
    observacao?: string
  }
}

interface ReceitaPublica {
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string
  descricao_situacao_cadastral?: string
  cnae_fiscal?: number
  cnae_fiscal_descricao?: string
  cnaes_secundarios?: Array<{ codigo?: number; descricao?: string }>
  porte?: string
  data_inicio_atividade?: string
  ddd_telefone_1?: string
}

async function lookupBrasilApi(cnpj: string): Promise<ReceitaPublica | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: ctrl.signal,
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as ReceitaPublica
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function resolveCnpj(lead: NormalizedLead): string | null {
  const fromField = digitsOnly(lead.cnpj)
  if (fromField.length === 14) return fromField
  return (
    extractCnpj(lead.nome) ||
    extractCnpj(lead.endereco) ||
    extractCnpj(lead.observacoes) ||
    extractCnpj(String(lead.metadados?.cnpj || ''))
  )
}

export async function enrichLead(
  lead: NormalizedLead,
  _empresaId: string,
  _opts?: { useLlm?: boolean }
): Promise<EnrichedLead> {
  const fontes: string[] = []
  const telefoneFormatado = formatPhoneBr(lead.telefone) || undefined
  const cnpj = resolveCnpj(lead)
  let receita: ReceitaPublica | null = null
  if (cnpj) {
    receita = await lookupBrasilApi(cnpj)
    if (receita) fontes.push('brasilapi_cnpj')
  }

  const cnaesSec = (receita?.cnaes_secundarios || [])
    .map((item) => [item.codigo, item.descricao].filter(Boolean).join(' '))
    .filter(Boolean)

  const cnpjValidado = Boolean(receita?.cnpj)
  const scoreEnriquecimento =
    (telefoneFormatado ? 20 : 0) +
    (lead.website ? 20 : 0) +
    (cnpjValidado ? 40 : 0) +
    (lead.endereco ? 20 : 0)

  return {
    ...lead,
    telefone: telefoneFormatado || lead.telefone,
    cnpj: cnpjValidado ? formatCnpj(cnpj || '') : lead.cnpj,
    cnpjValidado,
    empresaNome: receita?.razao_social || lead.empresaNome || lead.nome,
    dadosEnriquecidos: {
      telefoneFormatado,
      razaoSocial: receita?.razao_social || undefined,
      nomeFantasia: receita?.nome_fantasia || undefined,
      situacaoCadastral: receita?.descricao_situacao_cadastral || undefined,
      cnaePrincipal: receita
        ? [receita.cnae_fiscal, receita.cnae_fiscal_descricao].filter(Boolean).join(' ')
        : undefined,
      cnaesSecundarios: cnaesSec.length ? cnaesSec : undefined,
      porteEmpresa: receita?.porte || undefined,
      dataAbertura: receita?.data_inicio_atividade || undefined,
      cnpjValidado,
      scoreEnriquecimento,
      fonteEnriquecimento: fontes.length ? fontes : ['sem_cnpj_publico'],
      observacao: cnpjValidado
        ? 'CNPJ validado em base pública (BrasilAPI).'
        : 'CNPJ não identificado — lead permanece não validado na Receita.',
    },
  }
}

export async function enrichLeadsBatch(
  leads: NormalizedLead[],
  empresaId: string,
  opts?: { useLlm?: boolean }
): Promise<EnrichedLead[]> {
  const out: EnrichedLead[] = []
  for (const lead of leads) {
    out.push(await enrichLead(lead, empresaId, opts))
  }
  return out
}
