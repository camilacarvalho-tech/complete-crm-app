/** Catálogo a partir dos produtos já usados no CRM existente (formulários/dashboard). Sem produtos inventados. */
export const PRODUTOS_RECOMECE_EXISTENTES = [
  { codigo: 'FGTS', nome: 'Antecipação FGTS', categoria: 'crédito' },
  { codigo: 'CLT', nome: 'Crédito CLT', categoria: 'crédito' },
  { codigo: 'INSS', nome: 'INSS', categoria: 'consignado' },
  { codigo: 'INSS_REFIN', nome: 'INSS Refinanciamento', categoria: 'consignado', parent: 'INSS' },
  { codigo: 'REFIN_CASA', nome: 'Refin Casa', categoria: 'refinanciamento', parent: 'INSS' },
  { codigo: 'SIAPE', nome: 'SIAPE', categoria: 'consignado' },
  { codigo: 'MUNICIPAL', nome: 'Servidor Municipal', categoria: 'consignado' },
  { codigo: 'ENERGIA', nome: 'Conta de Energia', categoria: 'crédito' },
  { codigo: 'REFIN_VEIC', nome: 'Refinanciamento Veículo', categoria: 'refinanciamento' },
  { codigo: 'REFIN_IMOV', nome: 'Refinanciamento Imóvel', categoria: 'refinanciamento' },
  { codigo: 'SOLAR', nome: 'Placa Solar', categoria: 'crédito' },
  { codigo: 'PORT', nome: 'Portabilidade', categoria: 'portabilidade' },
  { codigo: 'MARGEM', nome: 'Margem', categoria: 'consignado' },
  { codigo: 'RATING', nome: 'Rating', categoria: 'análise' },
  { codigo: 'CONSIG', nome: 'Consignado', categoria: 'consignado' },
] as const
