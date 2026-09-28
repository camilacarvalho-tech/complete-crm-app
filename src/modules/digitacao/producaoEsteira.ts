/** Esteira da Central de Digitação. O frontend só usa estes estados. */

export const ESTEIRA = [
  'NOVO',
  'VALIDACAO',
  'SIMULACAO',
  'DOCUMENTACAO',
  'AGUARDANDO_DIGITACAO',
  'EM_DIGITACAO',
  'FINALIZADA_DIGITACAO',
  'DIGITACAO',
  'ENVIADA',
  'EM_ANALISE',
  'PENDENCIA',
  'APROVADA',
  'REPROVADA',
  'PAGA',
  'FINALIZADA',
  'CANCELADA',
] as const

export type EsteiraStatus = (typeof ESTEIRA)[number]

export const ESTEIRA_LABEL: Record<EsteiraStatus, string> = {
  NOVO: 'Novo',
  VALIDACAO: 'Em validação',
  SIMULACAO: 'Simulação',
  DOCUMENTACAO: 'Documentação',
  AGUARDANDO_DIGITACAO: 'Aguardando digitação',
  EM_DIGITACAO: 'Em digitação',
  FINALIZADA_DIGITACAO: 'Digitação finalizada',
  DIGITACAO: 'Digitação',
  ENVIADA: 'Enviada',
  EM_ANALISE: 'Em análise',
  PENDENCIA: 'Pendência',
  APROVADA: 'Aprovada',
  REPROVADA: 'Reprovada',
  PAGA: 'Paga',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
}

const ALIAS: Record<string, EsteiraStatus> = {
  novo: 'NOVO',
  em_validacao: 'VALIDACAO',
  validacao: 'VALIDACAO',
  simulacao: 'SIMULACAO',
  documentacao: 'DOCUMENTACAO',
  digitacao: 'DIGITACAO',
  em_digitacao: 'EM_DIGITACAO',
  aguardando_digitacao: 'AGUARDANDO_DIGITACAO',
  finalizada_digitacao: 'FINALIZADA_DIGITACAO',
  enviada: 'ENVIADA',
  enviado: 'ENVIADA',
  em_analise: 'EM_ANALISE',
  pendencia: 'PENDENCIA',
  pendente: 'PENDENCIA',
  aprovada: 'APROVADA',
  aprovado: 'APROVADA',
  reprovada: 'REPROVADA',
  recusada: 'REPROVADA',
  nao_aprovado: 'REPROVADA',
  paga: 'PAGA',
  pago: 'PAGA',
  finalizada: 'FINALIZADA',
  finalizado: 'FINALIZADA',
  cancelada: 'CANCELADA',
  cancelado: 'CANCELADA',
}

export function statusEsteira(value: unknown): EsteiraStatus | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  if ((ESTEIRA as readonly string[]).includes(raw)) return raw as EsteiraStatus
  return ALIAS[raw.toLowerCase()] || null
}

export const CARDS_ESTEIRA = [
  { id: 'novas', label: 'Novas', statuses: ['NOVO'] },
  { id: 'validacao', label: 'Em validação', statuses: ['VALIDACAO'] },
  { id: 'digitacao', label: 'Em digitação', statuses: ['DIGITACAO', 'AGUARDANDO_DIGITACAO', 'EM_DIGITACAO'] },
  { id: 'enviadas', label: 'Enviadas', statuses: ['ENVIADA'] },
  { id: 'analise', label: 'Em análise', statuses: ['EM_ANALISE'] },
  { id: 'pendencias', label: 'Pendências', statuses: ['PENDENCIA'] },
  { id: 'aprovadas', label: 'Aprovadas', statuses: ['APROVADA'] },
  { id: 'pagas', label: 'Pagas', statuses: ['PAGA'] },
  { id: 'finalizadas', label: 'Finalizadas', statuses: ['FINALIZADA', 'FINALIZADA_DIGITACAO'] },
] as const

export type CardEsteiraId = (typeof CARDS_ESTEIRA)[number]['id']

export const TIMELINE_ESTEIRA = [
  { id: 'NOVO', label: 'Lead' },
  { id: 'VALIDACAO', label: 'Validação' },
  { id: 'SIMULACAO', label: 'Simulação' },
  { id: 'DOCUMENTACAO', label: 'Documentação' },
  { id: 'DIGITACAO', label: 'Digitação' },
  { id: 'ENVIADA', label: 'Enviada' },
  { id: 'EM_ANALISE', label: 'Análise' },
  { id: 'APROVADA', label: 'Aprovação' },
  { id: 'PAGA', label: 'Pagamento' },
  { id: 'FINALIZADA', label: 'Finalização' },
] as const

export type HistoricoEsteira = {
  propostaId: string
  statusAnterior: string
  statusNovo: string
  dataHora: string
  usuario: string
  operador?: string
  evento?: string
  observacao: string
}

export type PendenciaProposta = {
  id: string
  tipo: string
  motivo?: string
  descricao: string
  responsavel: string
  prazo: string
  prioridade?: string
  status: 'ABERTA' | 'RESOLVIDA'
  criadoEm: string
  resolvidoEm: string
}

export type SimulacaoSalva = {
  id: string
  produto: string
  banco: string
  valor: number | null
  prazo: number | null
  parcela: number | null
  taxa: number | null
  criadoEm: string
}

export type DocumentoProposta = {
  id: string
  nome: string
  tipo: string
  tamanho: number
  status: string
  criadoEm: string
}

export type PropostaProd = {
  id: string
  clienteId?: string
  leadId?: string
  conversaId?: string
  clienteNome?: string
  cpf?: string
  telefone?: string
  cidade?: string
  uf?: string
  nascimento?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  convenio?: string
  numeroContrato?: string
  numeroOperacao?: string
  metaSource?: string
  metaMedium?: string
  metaCampaign?: string
  metaCampaignId?: string
  metaAdset?: string
  metaAdsetId?: string
  metaAd?: string
  metaAdId?: string
  origem?: string
  tipoOperacao?: string
  observacoes?: string
  valorSolicitado?: number | null
  valorLiberado?: number | null
  margem?: number | null
  prioridade?: string
  produto?: string
  banco?: string
  operadorId?: string
  operadorNome?: string
  assumidoEm?: string
  valor?: number | null
  prazo?: number | null
  parcela?: number | null
  status?: string
  numeroProposta?: string
  criadoEm?: string
  atualizadoEm?: string
  historicoEsteira?: HistoricoEsteira[]
  pendencias?: PendenciaProposta[]
  simulacoes?: SimulacaoSalva[]
  documentosProposta?: DocumentoProposta[]
  analiseDesde?: string
}

function digits(value: unknown): string {
  return String(value || '').replace(/\D/g, '')
}

export function cpfMascarado(value: unknown): string {
  return digits(value).length === 11 ? '***.***.***-**' : '—'
}

export function contarCards(items: { status?: unknown }[]): Record<CardEsteiraId, number> {
  const out = Object.fromEntries(CARDS_ESTEIRA.map((c) => [c.id, 0])) as Record<CardEsteiraId, number>
  for (const item of items) {
    const st = statusEsteira(item.status)
    if (!st) continue
    for (const card of CARDS_ESTEIRA) {
      if ((card.statuses as readonly string[]).includes(st)) out[card.id] += 1
    }
  }
  return out
}

export function mudarStatus(
  rec: PropostaProd,
  statusNovo: string,
  usuario: string,
  observacao: string,
  dataHora: string,
): { ok: boolean; motivo?: string; historico: HistoricoEsteira[]; status?: EsteiraStatus } {
  const proximo = statusEsteira(statusNovo)
  if (!proximo) return { ok: false, motivo: 'Estado fora da esteira', historico: rec.historicoEsteira || [] }
  const anterior = statusEsteira(rec.status)
  const linha: HistoricoEsteira = {
    propostaId: rec.id,
    statusAnterior: anterior || String(rec.status || ''),
    statusNovo: proximo,
    dataHora,
    usuario,
    operador: usuario,
    evento: observacao.trim() || 'Status alterado',
    observacao: observacao.trim(),
  }
  return { ok: true, status: proximo, historico: [...(rec.historicoEsteira || []), linha] }
}

export function abrirPendencia(
  rec: PropostaProd,
  entrada: Omit<PendenciaProposta, 'id' | 'status' | 'criadoEm' | 'resolvidoEm'> & { id: string; criadoEm: string },
): PendenciaProposta[] {
  const item: PendenciaProposta = {
    ...entrada,
    status: 'ABERTA',
    resolvidoEm: '',
  }
  return [...(rec.pendencias || []), item]
}

export function resolverPendencia(
  rec: PropostaProd,
  pendenciaId: string,
  usuario: string,
  dataHora: string,
): { pendencias: PendenciaProposta[]; historico: HistoricoEsteira[]; ok: boolean } {
  const atual = rec.pendencias || []
  const alvo = atual.find((p) => p.id === pendenciaId && p.status === 'ABERTA')
  if (!alvo) return { ok: false, pendencias: atual, historico: rec.historicoEsteira || [] }
  const pendencias = atual.map((p) => (p.id === pendenciaId ? { ...p, status: 'RESOLVIDA' as const, resolvidoEm: dataHora } : p))
  const linha: HistoricoEsteira = {
    propostaId: rec.id,
    statusAnterior: statusEsteira(rec.status) || String(rec.status || ''),
    statusNovo: statusEsteira(rec.status) || String(rec.status || ''),
    dataHora,
    usuario,
    observacao: 'PENDÊNCIA RESOLVIDA',
  }
  return { ok: true, pendencias, historico: [...(rec.historicoEsteira || []), linha] }
}

export function assumirProposta(
  rec: PropostaProd,
  operadorId: string,
  operadorNome: string,
  agora: string,
): { ok: boolean; motivo?: string; patch?: Pick<PropostaProd, 'operadorId' | 'operadorNome' | 'assumidoEm' | 'status'> } {
  const ocupado = String(rec.operadorId || '')
  const emCurso = statusEsteira(rec.status) === 'EM_DIGITACAO'
  if (ocupado && ocupado !== operadorId && emCurso) {
    return { ok: false, motivo: 'Esta digitação já foi atribuída a outro operador.' }
  }
  if (ocupado === operadorId && emCurso) return { ok: true, patch: { operadorId, operadorNome: rec.operadorNome || operadorNome, assumidoEm: rec.assumidoEm || agora, status: 'EM_DIGITACAO' } }
  return {
    ok: true,
    patch: { operadorId, operadorNome, assumidoEm: agora, status: 'EM_DIGITACAO' },
  }
}

export function registrarSimulacao(
  rec: PropostaProd,
  entrada: Omit<SimulacaoSalva, 'id' | 'criadoEm' | 'taxa'> & { id: string; criadoEm: string; taxa?: number | null },
): SimulacaoSalva[] {
  const item: SimulacaoSalva = {
    id: entrada.id,
    produto: entrada.produto,
    banco: entrada.banco,
    valor: entrada.valor,
    prazo: entrada.prazo,
    parcela: entrada.parcela,
    taxa: entrada.taxa == null ? null : entrada.taxa,
    criadoEm: entrada.criadoEm,
  }
  return [...(rec.simulacoes || []), item]
}

export function anexarDocumento(rec: PropostaProd, doc: DocumentoProposta): DocumentoProposta[] {
  return [...(rec.documentosProposta || []), doc]
}

export function filaDigitacao(items: PropostaProd[]): PropostaProd[] {
  return items
    .filter((item) => {
      const st = statusEsteira(item.status)
      return st === 'AGUARDANDO_DIGITACAO' || st === 'DIGITACAO'
    })
    .slice()
    .sort((a, b) => String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')))
}

export type FiltroProducao = {
  banco?: string
  produto?: string
  status?: string
  operador?: string
  data?: string
  cidade?: string
  origem?: string
  numero?: string
  busca?: string
  visao?: 'todas' | 'minhas' | 'pendentes' | 'analise' | 'aprovadas' | 'pagas'
  operadorAtualId?: string
  card?: CardEsteiraId | ''
}

export function filtrarPropostas(items: PropostaProd[], filtro: FiltroProducao): PropostaProd[] {
  const busca = String(filtro.busca || '').trim().toLowerCase()
  const buscaDig = digits(busca)
  return items.filter((item) => {
    const st = statusEsteira(item.status)
    if (filtro.card) {
      const card = CARDS_ESTEIRA.find((c) => c.id === filtro.card)
      if (!card || !st || !(card.statuses as readonly string[]).includes(st)) return false
    }
    if (filtro.visao === 'minhas' && String(item.operadorId || '') !== String(filtro.operadorAtualId || '')) return false
    if (filtro.visao === 'pendentes' && st !== 'PENDENCIA') return false
    if (filtro.visao === 'analise' && st !== 'EM_ANALISE') return false
    if (filtro.visao === 'aprovadas' && st !== 'APROVADA') return false
    if (filtro.visao === 'pagas' && st !== 'PAGA') return false
    if (filtro.banco && String(item.banco || '').toLowerCase() !== filtro.banco.toLowerCase()) return false
    if (filtro.produto && String(item.produto || '').toLowerCase() !== filtro.produto.toLowerCase()) return false
    if (filtro.status && st !== statusEsteira(filtro.status)) return false
    if (filtro.operador && String(item.operadorId || '') !== filtro.operador && String(item.operadorNome || '').toLowerCase() !== filtro.operador.toLowerCase()) return false
    if (filtro.data && !String(item.atualizadoEm || item.criadoEm || '').startsWith(filtro.data)) return false
    if (filtro.cidade && !String(item.cidade || '').toLowerCase().includes(filtro.cidade.toLowerCase())) return false
    if (filtro.origem && !String(item.origem || '').toLowerCase().includes(filtro.origem.toLowerCase())) return false
    if (filtro.numero && !String(item.numeroProposta || item.id).toLowerCase().includes(filtro.numero.toLowerCase())) return false
    if (busca) {
      const nome = String(item.clienteNome || '').toLowerCase()
      const tel = digits(item.telefone)
      const cpf = digits(item.cpf)
      const num = String(item.numeroProposta || item.id).toLowerCase()
      const ok = nome.includes(busca) || num.includes(busca) || (buscaDig && (tel.includes(buscaDig) || cpf.includes(buscaDig)))
      if (!ok) return false
    }
    return true
  })
}

export function minhaProducao(items: PropostaProd[], operadorId: string, hoje: string) {
  const minhas = items.filter((item) => String(item.operadorId || '') === operadorId)
  const doDia = minhas.filter((item) => String(item.criadoEm || item.atualizadoEm || '').startsWith(hoje))
  const contar = (st: EsteiraStatus) => minhas.filter((item) => statusEsteira(item.status) === st).length
  const aprovadas = contar('APROVADA')
  const reprovadas = contar('REPROVADA')
  const decisoes = aprovadas + reprovadas
  const tempos: number[] = []
  for (const item of minhas) {
    const hist = item.historicoEsteira || []
    const entrou = hist.find((h) => h.statusNovo === 'EM_ANALISE')
    const saiu = hist.find((h) => h.statusAnterior === 'EM_ANALISE' && h.statusNovo !== 'EM_ANALISE')
    if (!entrou || !saiu) continue
    const a = Date.parse(entrou.dataHora)
    const b = Date.parse(saiu.dataHora)
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) tempos.push((b - a) / 3600000)
  }
  return {
    propostasHoje: doDia.length,
    emDigitacao: minhas.filter((item) => {
      const st = statusEsteira(item.status)
      return st === 'EM_DIGITACAO' || st === 'DIGITACAO' || st === 'AGUARDANDO_DIGITACAO'
    }).length,
    emAnalise: contar('EM_ANALISE'),
    pendencias: minhas.reduce((n, item) => n + (item.pendencias || []).filter((p) => p.status === 'ABERTA').length, 0),
    aprovadas,
    pagas: contar('PAGA'),
    finalizadas: minhas.filter((item) => {
      const st = statusEsteira(item.status)
      return st === 'FINALIZADA' || st === 'FINALIZADA_DIGITACAO'
    }).length,
    taxaAprovacao: decisoes > 0 ? aprovadas / decisoes : null,
    tempoMedioAnaliseHoras: tempos.length ? tempos.reduce((s, n) => s + n, 0) / tempos.length : null,
  }
}

export function indiceTimeline(status: unknown): number {
  const st = statusEsteira(status)
  if (!st) return -1
  if (st === 'AGUARDANDO_DIGITACAO' || st === 'EM_DIGITACAO' || st === 'FINALIZADA_DIGITACAO') {
    return TIMELINE_ESTEIRA.findIndex((s) => s.id === 'DIGITACAO')
  }
  if (st === 'PENDENCIA' || st === 'REPROVADA') return TIMELINE_ESTEIRA.findIndex((s) => s.id === 'EM_ANALISE')
  return TIMELINE_ESTEIRA.findIndex((s) => s.id === st)
}

export function tipoNotificacao(status: EsteiraStatus): 'pendencia' | 'aprovacao' | 'reprovacao' | 'pagamento' | 'nova' | null {
  if (status === 'PENDENCIA') return 'pendencia'
  if (status === 'APROVADA') return 'aprovacao'
  if (status === 'REPROVADA') return 'reprovacao'
  if (status === 'PAGA') return 'pagamento'
  if (status === 'NOVO') return 'nova'
  return null
}

export const MENSAGEM_BANCO_LOCAL = 'Operação ainda não implementada para este banco.'
export const SIMULACAO_INDISPONIVEL = 'Simulação indisponível para este produto/banco.'
export const NAO_INFORMADO = 'Não informado.'

export const ORIGENS_LEAD = [
  'Facebook',
  'Instagram',
  'Indicação',
  'Cliente',
  'Base',
  'Ligação',
  'WhatsApp',
  'Site',
  'Google',
  'Campanha',
  'Leads Monitor',
  'Outros',
] as const

export const PRODUTOS_DIGITACAO = [
  { code: 'INSS', label: 'INSS' },
  { code: 'FGTS', label: 'FGTS' },
  { code: 'CLT', label: 'Crédito CLT' },
  { code: 'ESTADUAL', label: 'Servidor Público' },
  { code: 'MUNICIPAL', label: 'Servidor Prefeitura' },
  { code: 'REFIN_CARRO', label: 'Refinanciamento' },
  { code: 'CREDITO_PESSOAL', label: 'Crédito Pessoal' },
  { code: 'CASA', label: 'Crédito Imobiliário' },
  { code: 'OUTROS', label: 'Outros' },
] as const

export const BANCOS_DIGITACAO = ['FACTA', 'NOVO SAQUE', 'ICRED', 'TOKE REAL'] as const

export const DOCS_ESPERADOS = ['RG', 'CPF', 'Comprovante de endereço', 'Comprovante de renda', 'Contracheque', 'Extrato', 'Documento adicional'] as const

export function produtoDigitacao(code: string): (typeof PRODUTOS_DIGITACAO)[number] | null {
  return PRODUTOS_DIGITACAO.find((p) => p.code === code || p.label === code) || null
}

export function bancoDigitacao(nome: string): (typeof BANCOS_DIGITACAO)[number] | null {
  const hit = BANCOS_DIGITACAO.find((b) => b.toLowerCase() === String(nome || '').trim().toLowerCase())
  return hit || null
}

export function prepararBanco(adapter: { sendProposal?: unknown; validate?: unknown; createProposal?: unknown; getStatus?: unknown }): { status: 'NOT_IMPLEMENTED'; mensagem: string } {
  const tem = ['validate', 'createProposal', 'sendProposal', 'getStatus'].some((k) => typeof (adapter as Record<string, unknown>)[k] === 'function')
  if (!tem) return { status: 'NOT_IMPLEMENTED', mensagem: MENSAGEM_BANCO_LOCAL }
  return { status: 'NOT_IMPLEMENTED', mensagem: MENSAGEM_BANCO_LOCAL }
}

export type NovaDigitacaoInput = {
  clienteNome: string
  cpf: string
  telefone: string
  nascimento?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  convenio?: string
  cidade: string
  uf: string
  leadId: string
  metaSource?: string
  metaMedium?: string
  metaCampaign?: string
  metaCampaignId?: string
  metaAdset?: string
  metaAdsetId?: string
  metaAd?: string
  metaAdId?: string
  clienteId: string
  conversaId: string
  produto: string
  banco: string
  tipoOperacao: string
  origem: string
  observacoes: string
  valorSolicitado: number | null
  valorLiberado: number | null
  prazo: number | null
  parcela: number | null
  margem: number | null
  documentos: DocumentoProposta[]
  usuario: string
  dataHora: string
  numeroProposta: string
}

export function montarNovaDigitacao(input: NovaDigitacaoInput): { ok: boolean; motivo?: string; registro?: PropostaProd } {
  if (!input.clienteNome.trim() && !input.clienteId.trim()) return { ok: false, motivo: 'Informe o cliente.' }
  const produto = produtoDigitacao(input.produto)
  if (!produto) return { ok: false, motivo: 'Selecione o produto.' }
  const banco = bancoDigitacao(input.banco)
  if (!banco) return { ok: false, motivo: 'Selecione o banco.' }
  const historico: HistoricoEsteira[] = [{
    propostaId: input.numeroProposta,
    statusAnterior: '',
    statusNovo: 'DIGITACAO',
    dataHora: input.dataHora,
    usuario: input.usuario,
    observacao: 'Adicionada à fila de digitação',
  }]
  return {
    ok: true,
    registro: {
      id: input.numeroProposta.trim() || `dig-${input.dataHora}`,
      clienteNome: input.clienteNome.trim(),
      cpf: input.cpf,
      telefone: input.telefone,
      cidade: input.cidade,
      uf: input.uf,
      nascimento: input.nascimento || '',
      cep: input.cep || '',
      logradouro: input.logradouro || '',
      numero: input.numero || '',
      complemento: input.complemento || '',
      bairro: input.bairro || '',
      convenio: input.convenio || '',
      numeroContrato: '',
      numeroOperacao: '',
      metaSource: input.metaSource || '',
      metaMedium: input.metaMedium || '',
      metaCampaign: input.metaCampaign || '',
      metaCampaignId: input.metaCampaignId || '',
      metaAdset: input.metaAdset || '',
      metaAdsetId: input.metaAdsetId || '',
      metaAd: input.metaAd || '',
      metaAdId: input.metaAdId || '',
      leadId: input.leadId,
      clienteId: input.clienteId,
      conversaId: input.conversaId,
      produto: produto.code,
      banco,
      tipoOperacao: input.tipoOperacao,
      origem: input.origem,
      observacoes: input.observacoes,
      valorSolicitado: input.valorSolicitado,
      valorLiberado: input.valorLiberado,
      valor: input.valorSolicitado,
      prazo: input.prazo,
      parcela: input.parcela,
      margem: input.margem,
      documentosProposta: input.documentos,
      status: 'DIGITACAO',
      numeroProposta: input.numeroProposta,
      prioridade: '',
      operadorId: '',
      operadorNome: '',
      historicoEsteira: historico,
      pendencias: [],
      simulacoes: [],
      criadoEm: input.dataHora,
      atualizadoEm: input.dataHora,
    },
  }
}

export function filaOperacional(items: PropostaProd[]): PropostaProd[] {
  return items
    .filter((item) => {
      const st = statusEsteira(item.status)
      return st === 'DIGITACAO' || st === 'AGUARDANDO_DIGITACAO' || st === 'EM_DIGITACAO'
    })
    .slice()
    .sort((a, b) => String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')))
}

export function tempoAguardando(criadoEm: string | undefined, agora: string): string {
  const a = Date.parse(String(criadoEm || ''))
  const b = Date.parse(agora)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return '—'
  const min = Math.floor((b - a) / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h} h`
  return `${Math.floor(h / 24)} d`
}

export const MINHA_DIGITACAO = [
  { id: 'fazer', label: 'A fazer', statuses: ['DIGITACAO', 'AGUARDANDO_DIGITACAO'] },
  { id: 'andamento', label: 'Em andamento', statuses: ['EM_DIGITACAO'] },
  { id: 'pendentes', label: 'Pendentes', statuses: ['PENDENCIA'] },
  { id: 'enviadas', label: 'Enviadas', statuses: ['ENVIADA'] },
  { id: 'analise', label: 'Em análise', statuses: ['EM_ANALISE'] },
  { id: 'aprovadas', label: 'Aprovadas', statuses: ['APROVADA'] },
  { id: 'reprovadas', label: 'Reprovadas', statuses: ['REPROVADA'] },
  { id: 'finalizadas', label: 'Finalizadas', statuses: ['FINALIZADA', 'FINALIZADA_DIGITACAO'] },
] as const

export function contarMinhaDigitacao(items: PropostaProd[], operadorId: string): Record<(typeof MINHA_DIGITACAO)[number]['id'], number> {
  const minhas = items.filter((item) => String(item.operadorId || '') === operadorId)
  const out = Object.fromEntries(MINHA_DIGITACAO.map((c) => [c.id, 0])) as Record<(typeof MINHA_DIGITACAO)[number]['id'], number>
  for (const item of minhas) {
    const st = statusEsteira(item.status)
    if (!st) continue
    for (const card of MINHA_DIGITACAO) {
      if ((card.statuses as readonly string[]).includes(st)) out[card.id] += 1
    }
  }
  return out
}

export function naMinhaFila(items: PropostaProd[], operadorId: string): number {
  return items.filter((item) => {
    if (String(item.operadorId || '') !== operadorId) return false
    const st = statusEsteira(item.status)
    return st === 'DIGITACAO' || st === 'AGUARDANDO_DIGITACAO' || st === 'EM_DIGITACAO'
  }).length
}

export function mascaraCpf(value: unknown): string {
  const d = digits(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function mascaraTelefone(value: unknown): string {
  const d = digits(value).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function mascaraCep(value: unknown): string {
  const d = digits(value).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function moedaBr(value: unknown): string {
  if (value == null || value === '') return NAO_INFORMADO
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return NAO_INFORMADO
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function lerMoeda(value: string): number | null {
  const limpo = String(value || '').replace(/[^\d,.-]/g, '').trim()
  if (!limpo) return null
  const n = Number(limpo.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function textoOuNao(value: unknown): string {
  const s = String(value ?? '').trim()
  return s || NAO_INFORMADO
}

export function rotuloOrigem(input: {
  origem?: string
  metaSource?: string
  metaMedium?: string
  metaCampaign?: string
}): string {
  const blob = `${input.metaSource || ''} ${input.metaMedium || ''} ${input.origem || ''}`.toLowerCase()
  if (/instagram/.test(blob)) return 'Instagram'
  if (/facebook|\bfb\b/.test(blob)) return 'Facebook'
  const campanha = String(input.metaCampaign || '').trim()
  if (campanha) return campanha
  const origem = String(input.origem || '').trim()
  if (!origem) return NAO_INFORMADO
  if (origem.toLowerCase() === 'whatsapp' || origem.toLowerCase() === 'atendimento') return 'WhatsApp'
  if (origem.toLowerCase() === 'leads_monitor') return 'Leads Monitor'
  return origem
}

export function aplicarEnderecoCep<T extends { logradouro?: string; bairro?: string; cidade?: string; uf?: string }>(
  atual: T,
  resposta: { ok: boolean; logradouro?: string; bairro?: string; cidade?: string; uf?: string },
): { ok: boolean; mensagem?: string; endereco: T } {
  if (!resposta.ok) return { ok: false, mensagem: 'CEP não encontrado.', endereco: atual }
  return {
    ok: true,
    endereco: {
      ...atual,
      logradouro: resposta.logradouro || atual.logradouro || '',
      bairro: resposta.bairro || atual.bairro || '',
      cidade: resposta.cidade || atual.cidade || '',
      uf: resposta.uf || atual.uf || '',
    },
  }
}

export function informarContrato(
  rec: PropostaProd,
  numeros: { numeroProposta?: string; numeroContrato?: string; numeroOperacao?: string },
  usuario: string,
  dataHora: string,
): { ok: boolean; motivo?: string; registro?: PropostaProd } {
  const numeroProposta = String(numeros.numeroProposta || '').trim()
  const numeroContrato = String(numeros.numeroContrato || '').trim()
  const numeroOperacao = String(numeros.numeroOperacao || '').trim()
  if (!numeroProposta && !numeroContrato && !numeroOperacao) {
    return { ok: false, motivo: 'Informe o número recebido do banco.' }
  }
  const anterior = rec.historicoEsteira || []
  const linha: HistoricoEsteira = {
    propostaId: rec.id,
    statusAnterior: statusEsteira(rec.status) || String(rec.status || ''),
    statusNovo: statusEsteira(rec.status) || String(rec.status || ''),
    dataHora,
    usuario,
    operador: usuario,
    evento: 'Contrato informado',
    observacao: 'Contrato informado',
  }
  return {
    ok: true,
    registro: {
      ...rec,
      numeroProposta,
      numeroContrato,
      numeroOperacao,
      historicoEsteira: [...anterior, linha],
      atualizadoEm: dataHora,
    },
  }
}

export function registroVisivel(item: { clienteNome?: string }): boolean {
  return !/lead\s+homolog/i.test(String(item.clienteNome || ''))
}

export function checklistDocumentos(docs: DocumentoProposta[]): { tipo: string; status: 'OK' | 'Pendente'; doc?: DocumentoProposta }[] {
  return DOCS_ESPERADOS.map((tipo) => {
    const doc = docs.find((d) => d.tipo === tipo)
    return doc ? { tipo, status: 'OK' as const, doc } : { tipo, status: 'Pendente' as const }
  })
}
