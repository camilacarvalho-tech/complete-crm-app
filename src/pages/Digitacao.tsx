import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PRODUCT_TREE, UFS_BRASIL } from '../catalog/crmCatalog'
import { DIGITACAO_STATUSES, digitacaoStatusId, digitacaoStatusLabel, findProduct, operationLabel, operationsFor, productCatalogLabel } from '../catalog/productCatalog'
import { ErrorBanner, GhostButton, LoadingBlock, SelectInput, TextInput } from '../components/nexus/kit'
import { DetalhesPropostaBox } from '../components/nexus/DetalhesPropostaBox'
import { textoMisto } from '../lib/uiPt'
import { maskCpf } from '../lib/format'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { useEscLayer } from '../hooks/useEscLayer'
import { toDate } from '../lib/nexusCore'
import { simulateAllInstitutions } from '../integrations/banks/registry'
import { ingestSimulationResult } from '../modules/digitacao/simulationToDigitacao'
import {
  buildHistory,
  buildPendencias,
  displayOperationalStatus,
  emptyLabel,
  findExactCliente,
  formatCpfDisplay,
  formatMoney,
  formatPrazo,
  hasSignatureBlock,
  isCompleteCpf,
  proposalsForCliente,
  docsForProposal,
  documentOpenUrl,
  sourcedField,
  waitingInstitution,
  type DeskRecord,
} from '../modules/digitacao/digitacaoDesk'
import type { NexusCliente } from '../types/nexus'
import './digitacaoDesk.css'

function FieldRow({
  label,
  value,
  source,
}: {
  label: string
  value: string
  source?: string
}) {
  return (
    <div className="py-1.5 border-b" style={{ borderColor: 'var(--code-border)' }}>
      <div className="desk-label">{label}</div>
      <div className="desk-value">{value}</div>
      {source ? <div className="text-[11px]" style={{ color: 'var(--code-muted)' }}>Fonte: {source}</div> : null}
    </div>
  )
}

function moneyOrMissing(v: unknown) {
  return formatMoney(v)
}

function urlBanco(...vals: unknown[]): string {
  for (const v of vals) {
    const s = String(v || '').trim()
    if (/^https?:\/\//i.test(s)) return s
  }
  return ''
}

function nomeHomolog(v: unknown) {
  return /lead\s+homolog/i.test(String(v || ''))
}

function bancoToke(v: unknown) {
  return /toke\s*real/i.test(String(v || ''))
}

const FILTROS_ICRED = [
  { id: 'todas', label: 'Todos' },
  { id: 'analise', label: 'Análise documental' },
  { id: 'video', label: 'Vídeo chamada' },
  { id: 'averbacao', label: 'Averbação/Reserva' },
  { id: 'assinatura', label: 'Assinatura' },
  { id: 'pagamento', label: 'Pagamento' },
]

function grupoDigitacao(item: DeskRecord) {
  const blob = `${item.status || ''} ${item.operacao || ''} ${item.ultimoHistorico || ''} ${item.mensagemSimulacao || ''}`.toLowerCase()
  if (/video|v[ií]deo/.test(blob)) return 'video'
  if (/pagamento|pago|paga|liquid/.test(blob)) return 'pagamento'
  if (/assin|formaliz/.test(blob)) return 'assinatura'
  if (/averb|reserva|desbloque/.test(blob)) return 'averbacao'
  if (/document|an[aá]lise/.test(blob)) return 'analise'
  return ''
}

export default function Digitacao() {
  const { propostas, digitacoes, clientes, documentos, contratos, auditoria, campanhas } = useNexusStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [produto, setProduto] = useState('INSS')
  const [operacao, setOperacao] = useState('PORTABILIDADE')
  const [estado, setEstado] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [busy, setBusy] = useState(false)
  const [resultados, setResultados] = useState<Awaited<ReturnType<typeof simulateAllInstitutions>>>([])
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [ficha, setFicha] = useState<{ rec: DeskRecord; tab: 'proposta' | 'documentos' | 'historico' } | null>(null)
  const [caixa, setCaixa] = useState<DeskRecord | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [tabFila, setTabFila] = useState('todas')
  const tableRef = useRef<HTMLDivElement>(null)

  const catalogProduct = findProduct(produto)
  const ops = operationsFor(produto)
  const cliente = clientes.items.find((c) => c.id === clienteId) || null

  useEffect(() => {
    if (!isCompleteCpf(q)) return
    const hit = findExactCliente(clientes.items, q)
    setClienteId(hit ? hit.id : null)
  }, [q, clientes.items])

  const propostasCliente = useMemo(() => {
    if (!cliente) return []
    return proposalsForCliente(digitacoes.items as DeskRecord[], propostas.items as DeskRecord[], cliente)
  }, [cliente, digitacoes.items, propostas.items])

  const fila = useMemo(() => {
    let items = (digitacoes.items as DeskRecord[]).filter((d) => !nomeHomolog(d.clienteNome) && !bancoToke(`${d.banco || ''} ${d.instituicao || ''} ${d.produto || ''}`))
    const alvo = findProduct(produto)
    if (alvo) {
      items = items.filter((d) => {
        const atual = findProduct(String(d.produto || ''))
        return atual ? atual.code === alvo.code : false
      })
    }
    if (operacao) {
      items = items.filter((d) => {
        const op = String(d.operacao || '')
        return op.toUpperCase() === operacao.toUpperCase() || operationLabel(op).toLowerCase() === operationLabel(operacao).toLowerCase()
      })
    }
    const digitos = q.replace(/\D/g, '')
    if (digitos.length >= 3 && !cliente) {
      items = items.filter((d) => {
        const numero = `${d.protocolo || ''} ${d.numeroProposta || ''}`.replace(/\D/g, '')
        const cpf = String(d.cpf || '').replace(/\D/g, '')
        return numero.includes(digitos) || cpf.includes(digitos)
      })
    }
    if (cliente) {
      const ids = new Set(propostasCliente.map((p) => p.id))
      items = items.filter((d) => ids.has(d.id) || String(d.clienteId) === cliente.id)
    }
    if (tabFila !== 'todas' && FILTROS_ICRED.some((t) => t.id === tabFila)) {
      items = items.filter((d) => grupoDigitacao(d) === tabFila)
    }
    return items
  }, [digitacoes.items, cliente, propostasCliente, tabFila, produto, operacao, q])

  async function simularEEnviar() {
    setBusy(true)
    try {
      const cpfDigits = q.replace(/\D/g, '')
      const cli =
        cliente ||
        clientes.items.find((c) => String(c.cpf || '').replace(/\D/g, '') === cpfDigits) ||
        undefined
      const offers = await simulateAllInstitutions({
        cpf: cli?.cpf || q,
        produto,
        operacao,
        clienteId: cli?.id,
        clienteNome: String(cli?.nome || ''),
        origem: 'digitacao',
      })
      setResultados(offers)
      const existingKeys = new Set(
        digitacoes.items.map((d) =>
          [d.clienteId || 'sem-cliente', d.banco, d.produto, d.operacao].join(':').toLowerCase()
        )
      )
      let criadas = 0
      for (const offer of offers) {
        const packed = ingestSimulationResult({
          offer,
          clienteId: cli?.id,
          clienteNome: String(cli?.nome || ''),
          cpf: String(cli?.cpf || q),
          existingDigitacaoKey: existingKeys.has(
            [cli?.id || 'sem-cliente', offer.banco, offer.produto, offer.operacao].join(':').toLowerCase()
          )
            ? [cli?.id || 'sem-cliente', offer.banco, offer.produto, offer.operacao].join(':').toLowerCase()
            : null,
        })
        if (packed.reused) continue
        await propostas.create(packed.proposta as any)
        await digitacoes.create({ ...packed.digitacao, estado, municipio } as any)
        criadas += 1
      }
      toast.success(criadas ? `${criadas} proposta(s) na Digitação` : 'Já existiam na Digitação (idempotente)')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na simulação')
    } finally {
      setBusy(false)
    }
  }

  if (digitacoes.loading || clientes.loading) return <LoadingBlock label="Carregando digitação..." />

  return (
    <div className="digitacao-desk space-y-3">
      <div className="flex items-center gap-2">
        <h1>Digitação</h1>
        {busy && (
          <span className="robinho" role="status">
            <Bot className="w-3.5 h-3.5" />
            Robinho
          </span>
        )}
      </div>
      <ErrorBanner message={digitacoes.error || clientes.error} />

      <div className="desk-card p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative min-w-[240px] flex-1">
            <span className="desk-label">CPF / Proposta</span>
            <TextInput
              value={q}
              inputMode="numeric"
              placeholder="CPF ou número da proposta"
              className="!py-1.5 !text-xs"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                const next = digits.length > 11 ? digits : maskCpf(digits)
                setQ(next)
                if (!digits) setClienteId(null)
              }}
            />
          </div>
          <label className="desk-label">Produto
            <SelectInput className="!py-1.5 !text-xs" value={produto} onChange={(e) => {
              const next = e.target.value
              setProduto(next)
              const nextOps = operationsFor(next)
              setOperacao(nextOps[0]?.code || '')
              if (!findProduct(next)?.needsState) setEstado('')
              if (!findProduct(next)?.needsCity) setMunicipio('')
            }}>
              {PRODUCT_TREE.map((p) => (
                <option key={p.code} value={p.code}>{p.nome}</option>
              ))}
            </SelectInput>
          </label>
          {ops.length > 0 && (
            <label className="desk-label">Operação
              <SelectInput className="!py-1.5 !text-xs" value={operacao} onChange={(e) => setOperacao(e.target.value)}>
                {ops.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </SelectInput>
            </label>
          )}
          {catalogProduct?.needsState && (
            <label className="desk-label">Estado
              <SelectInput className="!py-1.5 !text-xs" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Selecione</option>
                {UFS_BRASIL.map((u) => <option key={u.uf} value={u.uf}>{u.nome}</option>)}
              </SelectInput>
            </label>
          )}
          {catalogProduct?.needsCity && (
            <label className="desk-label">Município
              <TextInput className="!py-1.5 !text-xs" value={municipio} placeholder="Município" onChange={(e) => setMunicipio(e.target.value)} />
            </label>
          )}
          <GhostButton type="button" className="!py-1.5 !text-xs" disabled={busy} onClick={() => void simularEEnviar()}>
            {busy ? 'Consultando…' : 'Consultar instituições'}
          </GhostButton>
        </div>
      </div>

      {cliente && (
        <div className="desk-card p-3">
          <div className="desk-label mb-2">Cliente</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
            <div><div className="desk-label">Nome completo</div><div className="desk-value">{emptyLabel(cliente.nome)}</div></div>
            <div><div className="desk-label">CPF</div><div className="desk-value">{cliente.cpf ? formatCpfDisplay(cliente.cpf) : 'Não informado'}</div></div>
            <div><div className="desk-label">Nascimento</div><div className="desk-value">{emptyLabel(cliente.dataNascimento)}</div></div>
            <div><div className="desk-label">Telefone</div><div className="desk-value">{emptyLabel(cliente.telefone)}</div></div>
            <div><div className="desk-label">WhatsApp</div><div className="desk-value">{emptyLabel(cliente.whatsapp)}</div></div>
            <div><div className="desk-label">E-mail</div><div className="desk-value">{emptyLabel(cliente.email)}</div></div>
            <div><div className="desk-label">Endereço</div><div className="desk-value">{emptyLabel(cliente.endereco)}</div></div>
            <div><div className="desk-label">Cidade/UF</div><div className="desk-value">{[cliente.cidade, cliente.estado].filter(Boolean).join('/') || 'Não informado'}</div></div>
          </div>
        </div>
      )}

      {cliente && (
        <div className="space-y-2">
          <div className="desk-label">Propostas do cliente</div>
          {propostasCliente.filter((p) => !bancoToke(`${p.banco || ''} ${p.instituicao || ''} ${p.produto || ''}`)).length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhuma proposta existente para este cliente.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {propostasCliente.filter((p) => !bancoToke(`${p.banco || ''} ${p.instituicao || ''} ${p.produto || ''}`)).map((p) => (
                <div key={p.id} className="desk-card p-3 space-y-1">
                  <div className="font-semibold text-[13px]">{emptyLabel(p.produto)} · {emptyLabel(p.operacao)} · {emptyLabel(p.banco || p.instituicao)}</div>
                  <div className="status-pill">{displayOperationalStatus(p)}</div>
                  <div className="text-[12px]">Parcela: {moneyOrMissing(p.parcela)} · Prazo: {formatPrazo(p.prazo)}</div>
                  <div className="text-[12px]">Valor: {moneyOrMissing(p.valorLiberado ?? p.valor)}</div>
                  <GhostButton type="button" className="!py-1 !text-[11px] mt-1" onClick={() => setFicha({ rec: p, tab: 'proposta' })}>
                    Ver proposta
                  </GhostButton>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {resultados.length > 0 && (
        <div className="desk-card p-3 space-y-2">
          <div className="desk-label">Resultados das instituições</div>
          <div className="grid gap-2 md:grid-cols-2">
            {resultados.filter((o) => !bancoToke(o.banco)).map((o) => (
              <div key={o.bancoId} className="rounded border p-2" style={{ borderColor: 'var(--code-border)' }}>
                <div className="font-semibold text-[13px]">{o.banco}</div>
                <div className="status-pill mt-1">{o.status}</div>
                <div className="text-[11px] mt-1">
                  Valor: {o.valorLiberado == null ? 'Não informado' : formatMoney(o.valorLiberado)} · Parcela: {o.parcela == null ? 'Não informado' : formatMoney(o.parcela)}
                </div>
                <div className="text-[11px]">Prazo: {o.prazo == null ? 'Não informado' : formatPrazo(o.prazo)} · Protocolo: {emptyLabel(o.protocolo)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {caixa && (
        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
        <DetalhesPropostaBox
          embedded
          rec={caixa}
          clienteNome={nomeHomolog(caixa.clienteNome) ? 'Cliente' : String(caixa.clienteNome || clientes.items.find((c) => c.id === caixa.clienteId)?.nome || 'Cliente')}
          historico={buildHistory({ rec: caixa, auditoria: auditoria.items as DeskRecord[] })}
          onClose={() => setCaixa(null)}
          onOpenFull={() => {
            setFicha({ rec: caixa, tab: 'proposta' })
            setCaixa(null)
          }}
        />
        </div>
      )}

      <div className="desk-card">
        <div className="flex flex-wrap gap-1 p-2 border-b" style={{ borderColor: 'var(--code-border)' }}>
          {FILTROS_ICRED.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTabFila(t.id)}
              className={`px-2 py-0.5 rounded text-[11px] ${(tabFila === t.id || (t.id === 'todas' && !FILTROS_ICRED.some((f) => f.id === tabFila))) ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 px-2 py-1">
          <button type="button" className="nexus-btn-secondary p-1 rounded" aria-label="Rolar para a esquerda" onClick={() => tableRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" className="nexus-btn-secondary p-1 rounded" aria-label="Rolar para a direita" onClick={() => tableRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="desk-table-wrap" ref={tableRef}>
          {fila.length === 0 ? (
            <p className="p-4 text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum registro nesta fila.</p>
          ) : (
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Menu</th>
                  <th>Inclusão</th>
                  <th>Proposta</th>
                  <th>CPF</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Bruto</th>
                  <th>Líquido</th>
                  <th>Prazo</th>
                  <th>Parcela</th>
                  <th>Situação</th>
                  <th>Averbação</th>
                  <th>Data</th>
                  <th>Último histórico</th>
                  <th>Produto</th>
                  <th>Instituição</th>
                  <th>Vendedor</th>
                  <th>Contrato</th>
                  <th>Pagamento</th>
                  <th>Telefone</th>
                </tr>
              </thead>
              <tbody>
                {fila.map((item) => {
                  const averb = digitacaoStatusId(String(item.status || ''))
                  const nome = textoMisto(String(item.clienteNome || '')) || 'Cliente'
                  const formalizacao = urlBanco(item.linkFormalizacao, item.formalizacaoUrl, item.linkAssinatura, item.assinaturaUrl)
                  const pdfContrato = urlBanco(item.contratoPdf, item.pdfUrl, item.linkContrato, item.contratoUrl, item.arquivoContrato)
                  return (
                    <tr key={item.id} onClick={() => setCaixa(item)}>
                      <td
                        className="menu-linha"
                        onMouseEnter={(e) => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setMenuPos({ top: r.bottom + 4, left: r.left })
                          setMenuId(item.id)
                        }}
                        onMouseLeave={() => setMenuId((cur) => (cur === item.id ? null : cur))}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button type="button" className="menu-linha-btn" aria-label="Menu da proposta">≡</button>
                        {menuId === item.id && menuPos && (
                          <div className="menu-linha-pop" style={{ top: menuPos.top, left: menuPos.left }}>
                            {formalizacao ? (
                              <a href={formalizacao} target="_blank" rel="noreferrer">Link de formalização</a>
                            ) : (
                              <span>A API ainda não retornou o link de formalização.</span>
                            )}
                            {pdfContrato ? (
                              <a href={pdfContrato} target="_blank" rel="noreferrer">Contrato em PDF</a>
                            ) : (
                              <span>A API ainda não retornou o PDF do contrato.</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>{toDate(item.criadoEm)?.toLocaleDateString('pt-BR') || '—'}</td>
                      <td>
                        <div>{emptyLabel(item.protocolo || item.numeroProposta || item.id, '—')}</div>
                        {formalizacao ? (
                          <a className="text-[11px] font-semibold" style={{ color: 'var(--code-orange)' }} href={formalizacao} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Formalização</a>
                        ) : null}
                      </td>
                      <td>{item.cpf ? formatCpfDisplay(String(item.cpf)) : '—'}</td>
                      <td>
                        <button type="button" className="font-semibold underline" style={{ color: 'var(--code-cyan)' }} onClick={(e) => { e.stopPropagation(); setCaixa(item) }}>
                          {nome}
                        </button>
                      </td>
                      <td>{emptyLabel(operationLabel(String(item.operacao || '')), '—')}</td>
                      <td>{moneyOrMissing(item.valorBruto ?? item.valor)}</td>
                      <td>{moneyOrMissing(item.valorLiberado)}</td>
                      <td>{formatPrazo(item.prazo)}</td>
                      <td>{moneyOrMissing(item.parcela)}</td>
                      <td>
                        <button type="button" className="btn-detalhes" onClick={(e) => { e.stopPropagation(); setCaixa(item) }}>Detalhes</button>
                        {digitacaoStatusLabel(String(item.status || '')) || displayOperationalStatus(item)}
                      </td>
                      <td>{averb === 'averbado' ? 'Averbado' : averb === 'nao_averbado' ? 'Não averbado' : '—'}</td>
                      <td>{toDate(item.dataAverbacao)?.toLocaleDateString('pt-BR') || '—'}</td>
                      <td>{emptyLabel(item.mensagemSimulacao || item.ultimoHistorico, '—')}</td>
                      <td>{productCatalogLabel(String(item.produto || '')) || emptyLabel(item.produto, '—')}</td>
                      <td>{emptyLabel(item.banco || item.instituicao, '—')}</td>
                      <td>{emptyLabel(item.responsavel, '—')}</td>
                      <td>{emptyLabel(item.contrato || item.numeroContrato, '—')}</td>
                      <td>{emptyLabel(item.statusPagamento || item.pagamento, '—')}</td>
                      <td>{emptyLabel(item.telefone || item.whatsapp, '—')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {ficha && (
        <FichaProposta
          rec={ficha.rec}
          tab={ficha.tab}
          onTab={(tab) => setFicha({ rec: ficha.rec, tab })}
          onClose={() => setFicha(null)}
          cliente={clientes.items.find((c) => c.id === ficha.rec.clienteId) || cliente}
          documentos={docsForProposal(documentos.items as DeskRecord[], ficha.rec)}
          contratos={(contratos.items as DeskRecord[]).filter((c) => String(c.clienteId || '') === String(ficha.rec.clienteId || '') || String(c.numero || c.contrato || '') === String(ficha.rec.contrato || ''))}
          auditoria={auditoria.items as DeskRecord[]}
          campanhaNome={
            String(ficha.rec.campanha || ficha.rec.campanhaNome || '') ||
            String(campanhas.items.find((c) => c.id === ficha.rec.campanhaId)?.nome || '')
          }
        />
      )}
    </div>
  )
}

const ETAPAS_FICHA = [
  { id: 'formalizado', label: 'Formalizado' },
  { id: 'nao_formalizado', label: 'Não formalizado' },
  { id: 'averbado', label: 'Averbado' },
  { id: 'nao_averbado', label: 'Não averbado' },
  { id: 'finalizado', label: 'Finalizado' },
] as const

function etapaAtual(rec: DeskRecord) {
  const id = digitacaoStatusId(String(rec.status || ''))
  if (id === 'formalizado' || id === 'nao_formalizado' || id === 'averbado' || id === 'nao_averbado') return id
  if (/finaliz/i.test(String(rec.status || ''))) return 'finalizado'
  return id
}

function FichaProposta({
  rec,
  tab,
  onTab,
  onClose,
  cliente,
  documentos,
  contratos,
  auditoria,
  campanhaNome,
}: {
  rec: DeskRecord
  tab: 'proposta' | 'documentos' | 'historico'
  onTab: (t: 'proposta' | 'documentos' | 'historico') => void
  onClose: () => void
  cliente?: NexusCliente | null
  documentos: DeskRecord[]
  contratos: DeskRecord[]
  auditoria: DeskRecord[]
  campanhaNome: string
}) {
  useEscLayer(true, onClose)
  const wait = waitingInstitution(rec)
  const robot = Boolean(rec.preenchidoPorRobo)
  const nome = sourcedField({ value: rec.clienteNome || cliente?.nome, fromInstitution: robot && Boolean(rec.clienteNome), fromCliente: Boolean(cliente?.nome), waitingInstitution: wait })
  const cpf = sourcedField({ value: rec.cpf || cliente?.cpf, fromInstitution: robot && Boolean(rec.cpf), fromCliente: Boolean(cliente?.cpf), waitingInstitution: wait })
  const nasc = sourcedField({ value: rec.dataNascimento || cliente?.dataNascimento, fromCliente: Boolean(cliente?.dataNascimento), fromInstitution: robot && Boolean(rec.dataNascimento), waitingInstitution: wait })
  const end = sourcedField({
    value: rec.endereco || [cliente?.endereco, cliente?.numero].filter(Boolean).join(', '),
    fromCliente: Boolean(cliente?.endereco),
    fromInstitution: robot && Boolean(rec.endereco),
    waitingInstitution: wait,
  })
  const cidade = sourcedField({
    value: rec.cidade || [cliente?.cidade, cliente?.estado].filter(Boolean).join('/'),
    fromCliente: Boolean(cliente?.cidade),
    fromInstitution: robot && Boolean(rec.cidade),
    waitingInstitution: wait,
  })
  const parcela = sourcedField({ value: rec.parcela, fromInstitution: true, waitingInstitution: wait })
  const prazo = sourcedField({ value: rec.prazo, fromInstitution: true, waitingInstitution: wait })
  const contrato = sourcedField({ value: rec.contrato, fromInstitution: true, waitingInstitution: wait })
  const saldo = sourcedField({ value: rec.saldoDevedor, fromInstitution: true, waitingInstitution: wait })
  const margem = sourcedField({ value: rec.margem, fromInstitution: true, waitingInstitution: wait })
  const [etapaVista, setEtapaVista] = useState<string | null>(null)
  const pendencias = buildPendencias({ rec, docs: documentos })
  const historico = buildHistory({ rec, auditoria })
  const contratoRows = contratos.length
    ? contratos
    : rec.contrato
      ? [{ id: 'inline', numero: rec.contrato, status: rec.status, instituicao: rec.banco, parcela: rec.parcela, prazo: rec.prazo, valor: rec.valorLiberado, atualizadoEm: rec.atualizadoEm }]
      : []

  return (
    <div className="ficha-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Proposta">
      <div className="ficha-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
          <div>
            <div className="text-[15px] font-bold">Proposta</div>
            <div className="status-pill mt-1">{displayOperationalStatus(rec)}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1 px-4 py-2 border-b text-[11px] overflow-x-auto" style={{ borderColor: 'var(--code-border)' }}>
          {(['proposta', 'documentos', 'historico'] as const).map((t) => (
            <button key={t} type="button" className={`px-2 py-1 rounded ${tab === t ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`} onClick={() => onTab(t)}>
              {t === 'proposta' ? 'Proposta' : t === 'documentos' ? 'Documentos' : 'Histórico'}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-4 overflow-x-auto">
          <section className="ficha-block">
            <div className="desk-label mb-1">Status</div>
            <div className="status-pill">{digitacaoStatusLabel(String(rec.status || '')) || displayOperationalStatus(rec)}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {ETAPAS_FICHA.map((s) => {
                const atual = etapaAtual(rec)
                const on = etapaVista === s.id
                const real = atual === s.id
                return (
                  <button key={s.id} type="button" className={`text-[11px] px-2 py-0.5 rounded ${on || real ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`} onClick={() => setEtapaVista(s.id)}>
                    {s.label}
                  </button>
                )
              })}
            </div>
            {etapaVista && (
              <div className="mt-3 overflow-x-auto">
                <p className="text-[12px] mb-2">{etapaAtual(rec) === etapaVista ? 'Etapa retornada para este cliente.' : 'A API ainda não retornou esta etapa para este cliente.'}</p>
                <table className="text-[11px]" style={{ minWidth: 1600 }}>
                  <thead>
                    <tr>
                      {['Inclusão', 'Proposta', 'CPF', 'Nome', 'Tipo', 'Bruto', 'Líquido', 'Prazo', 'Parcela', 'Situação', 'Averbação', 'Data', 'Último histórico', 'Produto', 'Instituição', 'Vendedor'].map((h) => <th key={h} className="p-1 text-left">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1">{toDate(rec.criadoEm)?.toLocaleDateString('pt-BR') || '—'}</td>
                      <td className="p-1">{emptyLabel(rec.protocolo || rec.numeroProposta || rec.id)}</td>
                      <td className="p-1">{cpf.missing ? '—' : formatCpfDisplay(cpf.value) || '—'}</td>
                      <td className="p-1">{nome.missing ? '—' : nome.value}</td>
                      <td className="p-1">{emptyLabel(rec.operacao)}</td>
                      <td className="p-1">{formatMoney(rec.valorBruto ?? rec.valor)}</td>
                      <td className="p-1">{formatMoney(rec.valorLiberado)}</td>
                      <td className="p-1">{formatPrazo(rec.prazo)}</td>
                      <td className="p-1">{formatMoney(rec.parcela)}</td>
                      <td className="p-1">{etapaAtual(rec) === etapaVista ? (ETAPAS_FICHA.find((s) => s.id === etapaVista)?.label || '—') : 'Não informado'}</td>
                      <td className="p-1">{etapaVista.startsWith('averb') || etapaVista === 'finalizado' ? (etapaAtual(rec) === etapaVista ? 'Sim' : 'Não informado') : '—'}</td>
                      <td className="p-1">{toDate(rec.atualizadoEm)?.toLocaleDateString('pt-BR') || '—'}</td>
                      <td className="p-1">{emptyLabel(rec.ultimoHistorico || rec.mensagemSimulacao)}</td>
                      <td className="p-1">{emptyLabel(rec.produto)}</td>
                      <td className="p-1">{emptyLabel(rec.banco || rec.instituicao)}</td>
                      <td className="p-1">{emptyLabel(rec.responsavel)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {tab === 'proposta' && (
            <>
              <section className="ficha-block">
                <div className="desk-label mb-1">Dados do cliente</div>
                <FieldRow label="Nome completo" value={emptyLabel(cliente?.nome)} source={cliente?.nome ? 'Cliente' : ''} />
                <FieldRow label="CPF" value={cliente?.cpf ? formatCpfDisplay(cliente.cpf) : 'Não informado'} source={cliente?.cpf ? 'Cliente' : ''} />
                <FieldRow label="Data de nascimento" value={emptyLabel(cliente?.dataNascimento)} />
                <FieldRow label="Telefone" value={emptyLabel(cliente?.telefone)} />
                <FieldRow label="WhatsApp" value={emptyLabel(cliente?.whatsapp)} />
                <FieldRow label="E-mail" value={emptyLabel(cliente?.email)} />
                <FieldRow label="Endereço" value={emptyLabel(cliente?.endereco)} />
                <FieldRow label="Número" value={emptyLabel(cliente?.numero)} />
                <FieldRow label="Complemento" value={emptyLabel(cliente?.complemento)} />
                <FieldRow label="Bairro" value={emptyLabel(cliente?.bairro)} />
                <FieldRow label="Cidade" value={emptyLabel(cliente?.cidade)} />
                <FieldRow label="UF" value={emptyLabel(cliente?.estado)} />
                <FieldRow label="CEP" value={emptyLabel(cliente?.cep)} />
              </section>
              <section className="ficha-block">
                <div className="desk-label mb-1">Operação</div>
                <FieldRow label="Produto" value={emptyLabel(rec.produto)} />
                <FieldRow label="Operação" value={emptyLabel(rec.operacao)} />
                <FieldRow label="Instituição" value={emptyLabel(rec.banco || rec.instituicao)} />
                <FieldRow label="Contrato" value={emptyLabel(rec.contrato)} />
                <FieldRow label="Protocolo" value={emptyLabel(rec.protocolo)} />
                <FieldRow label="Status" value={displayOperationalStatus(rec)} />
                <FieldRow label="Origem" value={emptyLabel(rec.origem)} />
                <FieldRow label="Campanha" value={emptyLabel(campanhaNome || rec.campanha)} />
                <FieldRow label="Responsável" value={emptyLabel(rec.responsavel)} />
                <FieldRow label="Data da proposta" value={toDate(rec.criadoEm)?.toLocaleString('pt-BR') || 'Não informado'} />
              </section>
              <section className="ficha-block">
                <div className="desk-label mb-1">Dados preenchidos pelo robô</div>
                <FieldRow label="Nome completo" value={nome.value} source={nome.source} />
                <FieldRow label="CPF" value={cpf.missing ? cpf.value : formatCpfDisplay(cpf.value) || cpf.value} source={cpf.source} />
                <FieldRow label="Data de nascimento" value={nasc.value} source={nasc.source} />
                <FieldRow label="Endereço" value={end.value} source={end.source} />
                <FieldRow label="Cidade" value={cidade.value} source={cidade.source} />
                <FieldRow label="Parcela atual" value={parcela.missing ? parcela.value : formatMoney(rec.parcela)} source={parcela.source} />
                <FieldRow label="Prazo" value={prazo.missing ? prazo.value : formatPrazo(rec.prazo)} source={prazo.source} />
                <FieldRow label="Contrato" value={contrato.value} source={contrato.source} />
                <FieldRow label="Saldo devedor" value={saldo.missing ? saldo.value : formatMoney(rec.saldoDevedor)} source={saldo.source} />
                <FieldRow label="Margem" value={margem.missing ? margem.value : formatMoney(rec.margem)} source={margem.source} />
                <FieldRow label="Status da proposta" value={displayOperationalStatus(rec)} source={robot ? 'Instituição' : ''} />
                {wait && !robot ? <p className="text-[12px] mt-2" style={{ color: 'var(--code-muted)' }}>Aguardando retorno da instituição</p> : null}
              </section>
              <section className="ficha-block">
                <div className="desk-label mb-1">Condições da proposta</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    ['Valor bruto', rec.valorBruto ?? rec.valor],
                    ['Valor líquido / liberado', rec.valorLiberado],
                    ['Parcela', rec.parcela],
                    ['Prazo', rec.prazo],
                    ['Taxa', rec.taxa || rec.taxaMensal],
                    ['Saldo devedor', rec.saldoDevedor],
                    ['Margem', rec.margem],
                    ['Troco', rec.troco],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="rounded border p-2" style={{ borderColor: 'var(--code-border)' }}>
                      <div className="desk-label">{label}</div>
                      <div className="desk-value">{label === 'Prazo' ? formatPrazo(val) : label === 'Taxa' ? emptyLabel(val) : formatMoney(val)}</div>
                    </div>
                  ))}
                </div>
              </section>
              {hasSignatureBlock(rec) && (
                <section className="ficha-block">
                  <div className="desk-label mb-1">Assinatura</div>
                  <FieldRow label="Status" value={displayOperationalStatus(rec)} />
                  <FieldRow label="Link de assinatura" value={emptyLabel(rec.linkAssinatura || rec.assinaturaUrl)} />
                  <FieldRow label="Data de envio" value={toDate(rec.dataEnvioAssinatura)?.toLocaleString('pt-BR') || 'Não informado'} />
                  <FieldRow label="Última atualização" value={toDate(rec.atualizadoEm)?.toLocaleString('pt-BR') || 'Não informado'} />
                </section>
              )}
              <section className="ficha-block">
                <div className="desk-label mb-1">Contrato</div>
                {contratoRows.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Contrato ainda não disponível.</p>
                ) : (
                  contratoRows.map((c) => (
                    <div key={c.id} className="text-[12px] border-b py-1" style={{ borderColor: 'var(--code-border)' }}>
                      <div>Número: {emptyLabel(c.numero || c.contrato)}</div>
                      <div>Status: {emptyLabel(c.status)}</div>
                      <div>Instituição: {emptyLabel(c.instituicao || rec.banco)}</div>
                      <div>Parcela: {formatMoney(c.parcela)} · Prazo: {formatPrazo(c.prazo)} · Valor: {formatMoney(c.valor)}</div>
                    </div>
                  ))
                )}
              </section>
              <section className="ficha-block">
                <div className="desk-label mb-1">Documentos</div>
                {documentos.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum documento disponível.</p>
                ) : (
                  <ul className="space-y-1">
                    {documentos.map((d) => {
                      const href = documentOpenUrl(d)
                      return (
                        <li key={d.id} className="flex items-center justify-between gap-2 text-[12px]">
                          <span>{emptyLabel(d.nome || d.categoria)} · {emptyLabel(d.status)}</span>
                          {href ? <a className="nexus-btn-secondary px-2 py-0.5 rounded text-[11px]" href={href} target="_blank" rel="noreferrer">Visualizar</a> : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
              <section className="ficha-block">
                <div className="desk-label mb-1">Histórico</div>
                {historico.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum evento real registrado.</p>
                ) : (
                  <ul className="space-y-1">
                    {historico.slice(-8).map((h, i) => (
                      <li key={`${h.label}-${i}`} className="text-[12px]">{h.at ? h.at.toLocaleString('pt-BR') : '—'} · {h.label}</li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="ficha-block">
                <div className="desk-label mb-1">Pendências</div>
                {pendencias.length === 0 ? (
                  <p className="text-[12px]">✓ Nenhuma pendência identificada</p>
                ) : (
                  <ul className="text-[12px] space-y-1">
                    {pendencias.map((p) => <li key={p}>⚠ {p}</li>)}
                  </ul>
                )}
              </section>
            </>
          )}
          {tab === 'documentos' && (
            <section className="ficha-block">
              <div className="desk-label mb-1">Lista de documentos</div>
              {documentos.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum documento disponível.</p>
              ) : (
                <ul className="space-y-2">
                  {documentos.map((d) => {
                    const href = documentOpenUrl(d)
                    return (
                      <li key={d.id} className="flex items-center justify-between gap-2 border-b py-1" style={{ borderColor: 'var(--code-border)' }}>
                        <div>
                          <div className="font-semibold">{emptyLabel(d.nome || d.categoria)}</div>
                          <div className="text-[11px]" style={{ color: 'var(--code-muted)' }}>{emptyLabel(d.status)} · {emptyLabel(d.origem)}</div>
                        </div>
                        {href ? (
                          <a className="nexus-btn-secondary px-2 py-1 rounded text-[11px]" href={href} target="_blank" rel="noreferrer">Visualizar</a>
                        ) : (
                          <span className="text-[11px]" style={{ color: 'var(--code-muted)' }}>Sem arquivo</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}
          {tab === 'historico' && (
            <section className="ficha-block">
              <div className="desk-label mb-1">Histórico da proposta</div>
              {historico.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum evento real registrado.</p>
              ) : (
                <ul className="space-y-2">
                  {historico.map((h, i) => (
                    <li key={`${h.label}-${i}`} className="text-[12px] border-l-2 pl-2" style={{ borderColor: 'var(--code-orange)' }}>
                      <div className="font-semibold">{h.at ? h.at.toLocaleString('pt-BR') : '—'}</div>
                      <div>{h.label}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
