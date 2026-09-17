import { DOCUMENT_CATEGORIES } from '../types/nexus'

export const DOCUMENT_PASTAS = [
  { id: 'identificacao', label: 'Identificação', cats: ['RG', 'CPF', 'CNH'] },
  { id: 'endereco', label: 'Endereço', cats: ['Comprovante de residência'] },
  { id: 'renda', label: 'Renda', cats: ['Comprovante de renda', 'Extrato'] },
  { id: 'bancarios', label: 'Bancários', cats: ['Documentos bancários', 'Documentos de portabilidade'] },
  { id: 'proposta', label: 'Proposta', cats: ['Proposta'] },
  { id: 'contrato', label: 'Contrato', cats: ['Contrato'] },
  { id: 'anexos', label: 'Anexos', cats: ['Outros'] },
] as const


export function inferCategoriaDocumento(nomeArquivo: string, mime?: string): (typeof DOCUMENT_CATEGORIES)[number] {
  const n = nomeArquivo.toLowerCase()
  if (/\brg\b/.test(n)) return 'RG'
  if (/\bcpf\b/.test(n)) return 'CPF'
  if (/\bcnh\b/.test(n)) return 'CNH'
  if (n.includes('resid')) return 'Comprovante de residência'
  if (n.includes('renda')) return 'Comprovante de renda'
  if (n.includes('extrato')) return 'Extrato'
  if (n.includes('portab')) return 'Documentos de portabilidade'
  if (n.includes('banco') || n.includes('bancario') || n.includes('bancário')) return 'Documentos bancários'
  if (n.includes('contrato')) return 'Contrato'
  if (n.includes('proposta')) return 'Proposta'
  if (mime?.startsWith('image/')) return 'Outros'
  return 'Outros'
}
