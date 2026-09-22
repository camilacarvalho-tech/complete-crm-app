/**
 * Montagem da ficha PERSON_LEAD a partir das coleções já existentes.
 * Não inventa dado. Não copia telefone da empresa para a pessoa.
 * Não copia telefone ↔ WhatsApp.
 */
import { qualificationFromScore } from '../catalog/produtosMonitor'
import type { OportunidadeMonitor } from '../types'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { PersonLead, PersonLeadClassification } from '../types/personLead'
import { digitsOnly, normalizeCompanyName } from './normalizeFields'

function text(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function emptyIfMissing(v: unknown): string {
  return text(v)
}

export function isLikelyPhone(value: string): boolean | null {
  const d = digitsOnly(value)
  if (!d) return null
  return d.length >= 10 && d.length <= 13
}

export function isLikelyEmail(value: string): boolean | null {
  const e = text(value).toLowerCase()
  if (!e) return null
  return e.includes('@') && e.includes('.')
}

export function isLikelyCpf(value: string): boolean {
  return digitsOnly(value).length === 11
}

function vinculoVerificadoDe(rel: string): boolean {
  return rel === 'funcionario' || rel === 'socio' || rel === 'administrador' || rel === 'gestor'
}

function personPhoneOnly(person: CompanyPeopleResearch, companyPhone: string): string {
  const tel = emptyIfMissing(person.phone)
  if (!tel) return ''
  const company = digitsOnly(companyPhone)
  if (company && digitsOnly(tel) === company && person.phoneType === 'empresa') return ''
  return tel
}

function personWhatsappOnly(person: CompanyPeopleResearch): string {
  return emptyIfMissing(person.whatsapp)
}

export function personLeadDedupeKeys(
  person: Pick<PersonLead, 'whatsapp' | 'telefone' | 'email' | 'cpf' | 'nome'> & { empresa?: string }
): string[] {
  const keys: string[] = []
  const wa = digitsOnly(person.whatsapp)
  if (wa.length >= 10) keys.push(`wa:${wa}`)
  const tel = digitsOnly(person.telefone)
  if (tel.length >= 10) keys.push(`tel:${tel}`)
  const email = text(person.email).toLowerCase()
  if (email.includes('@')) keys.push(`email:${email}`)
  const cpf = digitsOnly(person.cpf)
  if (cpf.length === 11) keys.push(`cpf:${cpf}`)
  const nome = normalizeCompanyName(person.nome).toLowerCase()
  const emp = normalizeCompanyName(person.empresa || '').toLowerCase()
  if (nome && emp && tel.length >= 10) keys.push(`nomeemptel:${nome}|${emp}|${tel}`)
  if (nome && tel.length >= 10) keys.push(`nometel:${nome}|${tel}`)
  if (nome && emp) keys.push(`nomeemp:${nome}|${emp}`)
  return keys
}

export function toPersonLead(
  person: CompanyPeopleResearch,
  company?: OportunidadeMonitor | null
): PersonLead {
  const extra = person as CompanyPeopleResearch & Record<string, unknown>
  const operacao = emptyIfMissing(extra.operacao) || emptyIfMissing(company?.metadados?.operacao)
  const produto = emptyIfMissing(extra.produto) || emptyIfMissing(company?.metadados?.produto) || operacao
  const tel = personPhoneOnly(person, text(company?.telefone))
  const wa = personWhatsappOnly(person)
  const email = emptyIfMissing(extra.email) || emptyIfMissing((person as { email?: string }).email)
  const cpfDigits = digitsOnly(emptyIfMissing(extra.cpf))
  const cpf = cpfDigits.length === 11 ? cpfDigits : ''
  const scoreRaw = Number(extra.score ?? company?.score)
  const score = Number.isFinite(scoreRaw) ? Math.min(100, Math.max(0, scoreRaw)) : 0
  const rel = emptyIfMissing(person.relationToCompany)
  const isPersonOpportunity = company?.tipo === 'pessoa'
  const isClt = operacao === 'CREDITO_CLT' || rel === 'funcionario' || Boolean(person.jobTitle)
  const tipoBenef = emptyIfMissing(extra.contextoINSSTipo || extra.tipoBeneficiario)
  const isInss = (operacao === 'INSS' || operacao === 'PORTABILIDADE_CONSIGNADO') && (isPersonOpportunity || Boolean(tipoBenef))
  const classif = (emptyIfMissing(extra.classification) ||
    (score ? qualificationFromScore(score) : '')) as PersonLeadClassification

  const enderecoPessoa = emptyIfMissing(extra.endereco)
  const cidadePessoa = emptyIfMissing(extra.cidade)
  const estadoPessoa = emptyIfMissing(extra.estado)
  const cepPessoa = emptyIfMissing(extra.cep)
  const bairroPessoa = emptyIfMissing(extra.bairro)

  return {
    id: person.id,
    nome: emptyIfMissing(person.personName),
    cpf,
    whatsapp: wa,
    telefone: tel,
    email,
    endereco: enderecoPessoa,
    numero: emptyIfMissing(extra.numero),
    complemento: emptyIfMissing(extra.complemento),
    bairro: bairroPessoa,
    cep: cepPessoa,
    cidade: cidadePessoa,
    estado: estadoPessoa,
    empresaId: emptyIfMissing(person.empresaId),
    empresa: emptyIfMissing(person.companyName || company?.nome),
    cnpj: digitsOnly(person.companyCnpj || company?.cnpj),
    cargo: emptyIfMissing(person.jobTitle),
    vinculo: rel,
    vinculoVerificado: Boolean(extra.vinculoVerificado) || vinculoVerificadoDe(rel),
    fonteVinculo: emptyIfMissing(extra.fonteVinculo) || emptyIfMissing(person.sourceName || person.source),
    segmento: emptyIfMissing(extra.segmento) || emptyIfMissing(company?.segmento),
    produto,
    operacao,
    campanhaId: emptyIfMissing(extra.campanhaId) || emptyIfMissing(company?.pesquisaId),
    campanha: emptyIfMissing(extra.campanha) || emptyIfMissing(company?.metadados?.campanha),
    origem: 'leads_monitor',
    fonte: emptyIfMissing(person.sourceName || person.source),
    source: emptyIfMissing(person.source),
    sourceUrl: emptyIfMissing(person.sourceUrl),
    collectedAt: person.foundAt || person.createdAt || extra.collectedAt || null,
    score,
    classification: classif,
    status: emptyIfMissing(person.status),
    contextoCLT: isClt
      ? {
          cargo: emptyIfMissing(person.jobTitle),
          empresa: emptyIfMissing(person.companyName),
          cnpj: digitsOnly(person.companyCnpj),
          vinculo: rel,
          vinculoVerificado: vinculoVerificadoDe(rel),
          fonteVinculo: emptyIfMissing(person.sourceName || person.source),
        }
      : null,
    contextoINSS:
      isInss && tipoBenef
        ? {
            tipoBeneficiario: tipoBenef,
            beneficio: emptyIfMissing(extra.beneficio || extra.especieBeneficio),
            operacao,
            fonteContexto: emptyIfMissing(person.sourceName || company?.origemLabel),
          }
        : null,
    contextoProduto: produto
      ? { produto, operacao, notas: emptyIfMissing(extra.contextoProdutoNotas) }
      : null,
    enrichmentStatus: emptyIfMissing(extra.enrichmentStatus) || 'NOT_ENRICHED',
    enrichmentProviders: Array.isArray(extra.enrichmentProviders)
      ? (extra.enrichmentProviders as string[])
      : person.source
        ? [String(person.source)]
        : [],
    enrichmentFields: Array.isArray(extra.enrichmentFields) ? (extra.enrichmentFields as string[]) : [],
    enrichmentUpdatedAt: extra.enrichmentUpdatedAt || person.updatedAt || null,
    purpose: emptyIfMissing(extra.purpose) || emptyIfMissing(company?.finalidadeTratamento),
    legalBasis: emptyIfMissing(extra.legalBasis) || emptyIfMissing(company?.baseLegal),
    consentStatus: emptyIfMissing(extra.consentStatus),
    optOut: Boolean(extra.optOut),
    blocked: Boolean(extra.blocked),
    deleted: Boolean(extra.deleted),
    corrected: Boolean(extra.corrected),
    telefoneValid: isLikelyPhone(tel),
    whatsappValid: isLikelyPhone(wa),
    emailValid: isLikelyEmail(email),
    personDiscoveryStatus: emptyIfMissing(extra.personDiscoveryStatus),
    contactStatus: emptyIfMissing(extra.contactStatus),
    relationshipStatus: emptyIfMissing(extra.relationshipStatus),
    dataNascimento: emptyIfMissing(extra.dataNascimento),
    originalData:
      extra.originalData && typeof extra.originalData === 'object'
        ? (extra.originalData as Record<string, string>)
        : undefined,
    enrichedData:
      extra.enrichedData && typeof extra.enrichedData === 'object'
        ? (extra.enrichedData as Record<string, string>)
        : undefined,
    enrichmentHistory: Array.isArray(extra.enrichmentHistory)
      ? (extra.enrichmentHistory as PersonLead['enrichmentHistory'])
      : [],
    enrichmentCandidates: Array.isArray(extra.enrichmentCandidates)
      ? (extra.enrichmentCandidates as PersonLead['enrichmentCandidates'])
      : [],
    enrichmentSources: Array.isArray(extra.enrichmentSources)
      ? (extra.enrichmentSources as string[])
      : [],
    enrichmentMetadata: Array.isArray(extra.enrichmentMetadata)
      ? (extra.enrichmentMetadata as PersonLead['enrichmentMetadata'])
      : [],
  }
}

function captureDate(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString()
  if (typeof v === 'object' && v && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString()
    } catch {
      return ''
    }
  }
  return ''
}

export function personLeadExportRow(lead: PersonLead): Record<string, string | number> {
  return {
    Nome: lead.nome,
    CPF: lead.cpf,
    Telefone: lead.telefone,
    WhatsApp: lead.whatsapp,
    Email: lead.email,
    Empresa: lead.empresa,
    CNPJ: lead.cnpj,
    Cargo: lead.cargo,
    Vínculo: lead.vinculo,
    Endereço: lead.endereco,
    CEP: lead.cep,
    Cidade: lead.cidade,
    Estado: lead.estado,
    Produto: lead.produto,
    Operação: lead.operacao,
    Campanha: lead.campanha,
    Origem: lead.origem || '',
    Fonte: lead.fonte,
    Score: lead.score || '',
    Classificação: lead.classification,
    Status:
      lead.contactStatus === 'NONE' || (!lead.whatsapp && !lead.telefone && !lead.email)
        ? lead.status || 'PENDENTE'
        : lead.status,
    'Data de captura': captureDate(lead.collectedAt),
  }
}

/** Campos que o adapter NX ERP poderá enviar no futuro — sem disparar agora. */
export function personLeadToNxErpContact(lead: PersonLead): Record<string, string | number> {
  return {
    nome: lead.nome,
    telefone: lead.telefone,
    whatsapp: lead.whatsapp,
    email: lead.email,
    cpf: lead.cpf,
    produto: lead.produto,
    operacao: lead.operacao,
    campanha: lead.campanha,
    origem: lead.origem,
  }
}

export function persistablePersonLeadSlice(lead: PersonLead): Record<string, unknown> {
  return {
    nome: lead.nome,
    cpf: lead.cpf || null,
    email: lead.email || null,
    endereco: lead.endereco || null,
    numero: lead.numero || null,
    complemento: lead.complemento || null,
    bairro: lead.bairro || null,
    cep: lead.cep || null,
    cidade: lead.cidade || null,
    estado: lead.estado || null,
    produto: lead.produto || null,
    operacao: lead.operacao || null,
    segmento: lead.segmento || null,
    campanhaId: lead.campanhaId || null,
    campanha: lead.campanha || null,
    origem: lead.origem,
    collectedAt: lead.collectedAt,
    score: lead.score,
    classification: lead.classification || null,
    vinculo: lead.vinculo || null,
    vinculoVerificado: lead.vinculoVerificado,
    fonteVinculo: lead.fonteVinculo || null,
    contextoCLT: lead.contextoCLT,
    contextoINSS: lead.contextoINSS,
    dataNascimento: lead.dataNascimento || null,
    originalData: lead.originalData || null,
    enrichedData: lead.enrichedData || null,
    enrichmentHistory: lead.enrichmentHistory || [],
    enrichmentSources: lead.enrichmentSources || [],
    enrichmentStatus: lead.enrichmentStatus || null,
    enrichmentProviders: lead.enrichmentProviders,
    enrichmentFields: lead.enrichmentFields,
    purpose: lead.purpose || null,
    legalBasis: lead.legalBasis || null,
    consentStatus: lead.consentStatus || null,
    optOut: lead.optOut,
    blocked: lead.blocked,
    deleted: lead.deleted,
    corrected: lead.corrected,
    telefoneValid: lead.telefoneValid,
    whatsappValid: lead.whatsappValid,
    emailValid: lead.emailValid,
    personDiscoveryStatus: lead.personDiscoveryStatus || null,
    contactStatus: lead.contactStatus || null,
    relationshipStatus: lead.relationshipStatus || null,
  }
}
