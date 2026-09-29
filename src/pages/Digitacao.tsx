import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { PRODUCT_TREE, UFS_BRASIL } from '../catalog/crmCatalog'
import { digitacaoStatusId, digitacaoStatusLabel, findProduct, operationLabel, operationsFor, productCatalogLabel } from '../catalog/productCatalog'
import { ErrorBanner, LoadingBlock, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { textoMisto } from '../lib/uiPt'
import { maskCpf } from '../lib/format'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { useEscLayer } from '../hooks/useEscLayer'
import { toDate } from '../lib/nexusCore'
import { INSTITUTION_ADAPTERS, simulateAdapters } from '../integrations/banks/registry'
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
  docsForProposal,
  documentOpenUrl,
  sourcedField,
  waitingInstitution,
  type DeskRecord,
} from '../modules/digitacao/digitacaoDesk'
import { statusEsteira } from '../modules/digitacao/producaoEsteira'
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
    <div className="ficha-campo">
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

type FocoFicha = 'cliente' | 'operacao' | 'proposta' | 'retorno' | 'pendencias' | 'documentos' | 'historico'

function grupoResumo(item: DeskRecord): '' | 'digitacao' | 'analise' | 'pendencia' | 'aprovada' | 'paga' {
  const st = statusEsteira(item.status)
  if (st === 'DIGITACAO' || st === 'EM_DIGITACAO' || st === 'AGUARDANDO_DIGITACAO' || st === 'SIMULACAO') return 'digitacao'
  if (st === 'EM_ANALISE') return 'analise'
  if (st === 'PENDENCIA') return 'pendencia'
  if (st === 'APROVADA') return 'aprovada'
  if (st === 'PAGA') return 'paga'
  const id = digitacaoStatusId(String(item.status || ''))
  if (id === 'em_analise') return 'analise'
  if (id === 'aprovado') return 'aprovada'
  return ''
}

function diaIso(value: unknown): string {
  const d = toDate(value)
  if (!d) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export default function Digitacao() {
  const { propostas, digitacoes, clientes, documentos, contratos, auditoria, campanhas } = useNexusStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [produto, setProduto] = useState('INSS')
  const [operacao, setOperacao] = useState('PORTABILIDADE')
  const [instituicao, setInstituicao] = useState('')
  const [pagina, setPagina] = useState(0)
  const [estado, setEstado] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [busy, setBusy] = useState(false)
  const [resultados, setResultados] = useState<Awaited<ReturnType<typeof simulateAdapters>>>([])
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [ocultarCliente, setOcultarCliente] = useState(false)
  const [ficha, setFicha] = useState<{ rec: DeskRecord; foco: FocoFicha } | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroInstituicao, setFiltroInstituicao] = useState('')
  const [filtroOperacao, setFiltroOperacao] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [filtroData, setFiltroData] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)

  const catalogProduct = findProduct(produto)
  const ops = operationsFor(produto)
  const cliente = clientes.items.find((c) => c.id === clienteId) || null

  useEffect(() => {
    setOcultarCliente(false)
  }, [q])

  useEffect(() => {
    if (!isCompleteCpf(q) || ocultarCliente) {
      if (ocultarCliente || !isCompleteCpf(q)) setClienteId(null)
      return
    }
    const hit = findExactCliente(clientes.items, q)
    setClienteId(hit ? hit.id : null)
  }, [q, clientes.items, ocultarCliente])

  const base = useMemo(
    () => (digitacoes.items as DeskRecord[]).filter((d) => !nomeHomolog(d.clienteNome) && !bancoToke(`${d.banco || ''} ${d.instituicao || ''} ${d.produto || ''}`)),
    [digitacoes.items],
  )

  const vendedores = useMemo(() => {
    const nomes = new Set<string>()
    for (const item of base) {
      const nome = String(item.responsavel || item.operadorNome || '').trim()
      if (nome) nomes.add(nome)
    }
    return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [base])

  const resumo = useMemo(() => {
    const contagem = { total: base.length, digitacao: 0, analise: 0, pendencia: 0, aprovada: 0, paga: 0 }
    for (const item of base) {
      const grupo = grupoResumo(item)
      if (grupo) contagem[grupo] += 1
    }
    return contagem
  }, [base])

  const fila = useMemo(() => {
    const texto = busca.trim().toLowerCase()
    const digitos = busca.replace(/\D/g, '')
    return base.filter((item) => {
      if (filtroProduto) {
        const atual = findProduct(String(item.produto || ''))
        if (!atual || atual.code !== filtroProduto) return false
      }
      if (filtroInstituicao && String(item.banco || item.instituicao || '').toUpperCase() !== filtroInstituicao.toUpperCase()) return false
      if (filtroOperacao) {
        const op = String(item.operacao || '')
        if (op.toUpperCase() !== filtroOperacao.toUpperCase() && operationLabel(op).toLowerCase() !== operationLabel(filtroOperacao).toLowerCase()) return false
      }
      if (filtroSituacao && grupoResumo(item) !== filtroSituacao) return false
      if (filtroVendedor && String(item.responsavel || item.operadorNome || '') !== filtroVendedor) return false
      if (filtroData && diaIso(item.criadoEm) !== filtroData) return false
      if (texto) {
        const alvo = `${item.clienteNome || ''} ${item.protocolo || ''} ${item.numeroProposta || ''} ${item.telefone || ''} ${item.whatsapp || ''}`.toLowerCase()
        const cpf = String(item.cpf || '').replace(/\D/g, '')
        if (!alvo.includes(texto) && !(digitos && cpf.includes(digitos))) return false
      }
      return true
    })
  }, [base, busca, filtroProduto, filtroInstituicao, filtroOperacao, filtroSituacao, filtroVendedor, filtroData])

  useEffect(() => {
    setPagina(0)
  }, [busca, filtroProduto, filtroInstituicao, filtroOperacao, filtroSituacao, filtroVendedor, filtroData])

  function limparFiltros() {
    setBusca('')
    setFiltroProduto('')
    setFiltroInstituicao('')
    setFiltroOperacao('')
    setFiltroSituacao('')
    setFiltroVendedor('')
    setFiltroData('')
  }

  function abrirFicha(rec: DeskRecord, foco: FocoFicha) {
    setMenuId(null)
    setFicha({ rec, foco })
  }

  const porPagina = 25
  const paginas = Math.max(1, Math.ceil(fila.length / porPagina))
  const paginaAtual = Math.min(pagina, paginas - 1)
  const filaPagina = fila.slice(paginaAtual * porPagina, paginaAtual * porPagina + porPagina)

  async function simularEEnviar() {
    setBusy(true)
    try {
      const cpfDigits = q.replace(/\D/g, '')
      const cli =
        cliente ||
        clientes.items.find((c) => String(c.cpf || '').replace(/\D/g, '') === cpfDigits) ||
        undefined
      const adapters = instituicao
        ? INSTITUTION_ADAPTERS.filter((a) => a.name === instituicao)
        : INSTITUTION_ADAPTERS
      const offers = await simulateAdapters(adapters, {
        cpf: cli?.cpf || q,
        produto,
        operacao,
        clienteId: cli?.id,
        clienteNome: String(cli?.nome || ''),
        origem: 'digitacao',
      })
      setResultados(offers)
      const recebidas = offers.filter((o) => o.status === 'Dados retornados pela instituição')
      if (!recebidas.length) {
        toast.success('Nenhuma instituição devolveu dados. Nada foi inventado e nenhuma proposta nova foi criada.')
        return
      }
      const existingKeys = new Set(
        digitacoes.items.map((d) =>
          [d.clienteId || 'sem-cliente', d.banco, d.produto, d.operacao].join(':').toLowerCase()
        )
      )
      let criadas = 0
      for (const offer of recebidas) {
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
    <div className="digitacao-desk mesa">
      <div className="mesa-titulo">
        <div>
          <h1>Central de Digitação</h1>
          <p>Mesa operacional de propostas e digitação.</p>
        </div>
        <div className="resumo-linha" role="status">
          {([
            ['', 'Total', resumo.total],
            ['digitacao', 'Em digitação', resumo.digitacao],
            ['analise', 'Em análise', resumo.analise],
            ['pendencia', 'Pendências', resumo.pendencia],
            ['aprovada', 'Aprovadas', resumo.aprovada],
            ['paga', 'Pagas', resumo.paga],
          ] as const).map(([id, label, n]) => (
            <button key={label} type="button" className={filtroSituacao === id ? 'on' : ''} onClick={() => setFiltroSituacao(id)}>{label} {n}</button>
          ))}
        </div>
      </div>
      <ErrorBanner message={digitacoes.error || clientes.error} />

      <div className="desk-card mesa-barra">
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
          <label className="desk-label">Instituição
            <SelectInput className="!py-1.5 !text-xs" value={instituicao} onChange={(e) => setInstituicao(e.target.value)}>
              <option value="">Todas</option>
              {INSTITUTION_ADAPTERS.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </SelectInput>
          </label>
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
          <PrimaryButton type="button" className="!py-1.5 !text-xs" disabled={busy} onClick={() => void simularEEnviar()}>
            {busy ? 'Consultando…' : 'Consultar'}
          </PrimaryButton>
        </div>
      </div>

      {resultados.length > 0 && (
        <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>
          {resultados.filter((o) => !bancoToke(o.banco)).map((o) => `${o.banco}: ${o.status}`).join(' · ')}
        </p>
      )}

      <div className="desk-card mesa-barra">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="desk-label min-w-[180px] flex-1">Busca
            <TextInput className="!py-1.5 !text-xs" value={busca} placeholder="Nome, CPF, telefone ou proposta" onChange={(e) => setBusca(e.target.value)} />
          </label>
          <label className="desk-label">Produto
            <SelectInput className="!py-1.5 !text-xs" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)}>
              <option value="">Todos</option>
              {PRODUCT_TREE.map((p) => <option key={p.code} value={p.code}>{p.nome}</option>)}
            </SelectInput>
          </label>
          <label className="desk-label">Instituição
            <SelectInput className="!py-1.5 !text-xs" value={filtroInstituicao} onChange={(e) => setFiltroInstituicao(e.target.value)}>
              <option value="">Todas</option>
              {INSTITUTION_ADAPTERS.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </SelectInput>
          </label>
          <label className="desk-label">Operação
            <SelectInput className="!py-1.5 !text-xs" value={filtroOperacao} onChange={(e) => setFiltroOperacao(e.target.value)}>
              <option value="">Todas</option>
              {operationsFor(filtroProduto || produto).map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </SelectInput>
          </label>
          <label className="desk-label">Situação
            <SelectInput className="!py-1.5 !text-xs" value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}>
              <option value="">Todas</option>
              <option value="digitacao">Em digitação</option>
              <option value="analise">Em análise</option>
              <option value="pendencia">Pendências</option>
              <option value="aprovada">Aprovadas</option>
              <option value="paga">Pagas</option>
            </SelectInput>
          </label>
          <label className="desk-label">Vendedor
            <SelectInput className="!py-1.5 !text-xs" value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)}>
              <option value="">Todos</option>
              {vendedores.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
            </SelectInput>
          </label>
          <label className="desk-label">Data
            <TextInput className="!py-1.5 !text-xs" type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} />
          </label>
          <button type="button" className="nexus-btn-secondary px-2 py-1.5 rounded text-xs" onClick={limparFiltros}>Limpar filtros</button>
        </div>
      </div>

      <div className="desk-card tabela">
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
                {filaPagina.map((item) => {
                  const averb = digitacaoStatusId(String(item.status || ''))
                  const nome = textoMisto(String(item.clienteNome || '')) || 'Cliente'
                  const formalizacao = urlBanco(item.linkFormalizacao, item.formalizacaoUrl, item.linkAssinatura, item.assinaturaUrl)
                  const pdfContrato = urlBanco(item.contratoPdf, item.pdfUrl, item.linkContrato, item.contratoUrl, item.arquivoContrato)
                  return (
                    <tr key={item.id} onClick={() => abrirFicha(item, 'proposta')}>
                      <td className="menu-linha" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="menu-linha-btn"
                          aria-label="Menu da proposta"
                          onClick={(e) => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setMenuPos({ top: r.bottom + 4, left: r.left })
                            setMenuId((cur) => (cur === item.id ? null : item.id))
                          }}
                        >≡</button>
                        <button type="button" className="acao-linha" onClick={() => abrirFicha(item, 'operacao')}>Digitar</button>
                        <button type="button" className="acao-linha sec" onClick={() => abrirFicha(item, 'proposta')}>Abrir</button>
                        {menuId === item.id && menuPos && (
                          <div className="menu-linha-pop" style={{ top: menuPos.top, left: menuPos.left }}>
                            <button type="button" onClick={() => abrirFicha(item, 'proposta')}>Abrir</button>
                            <button type="button" onClick={() => abrirFicha(item, 'proposta')}>Detalhes</button>
                            <button type="button" onClick={() => abrirFicha(item, 'operacao')}>Digitar</button>
                            <button type="button" onClick={() => abrirFicha(item, 'historico')}>Histórico</button>
                            <button type="button" onClick={() => abrirFicha(item, 'pendencias')}>Pendências</button>
                            <button type="button" onClick={() => abrirFicha(item, 'documentos')}>Documentos</button>
                            {formalizacao ? <a href={formalizacao} target="_blank" rel="noreferrer">Link de formalização</a> : null}
                            {pdfContrato ? <a href={pdfContrato} target="_blank" rel="noreferrer">Contrato em PDF</a> : null}
                          </div>
                        )}
                      </td>
                      <td>{toDate(item.criadoEm)?.toLocaleDateString('pt-BR') || 'Não informado'}</td>
                      <td title={String(item.protocolo || item.numeroProposta || item.id || '')}>{emptyLabel(item.protocolo || item.numeroProposta || item.id)}</td>
                      <td className="cpf">{item.cpf ? formatCpfDisplay(String(item.cpf)) : 'Não informado'}</td>
                      <td title={nome}>{nome}</td>
                      <td>{emptyLabel(operationLabel(String(item.operacao || '')))}</td>
                      <td className="num">{moneyOrMissing(item.valorBruto ?? item.valor)}</td>
                      <td className="num">{moneyOrMissing(item.valorLiberado)}</td>
                      <td className="num">{formatPrazo(item.prazo)}</td>
                      <td className="num">{moneyOrMissing(item.parcela)}</td>
                      <td><span className="nx-badge">{digitacaoStatusLabel(String(item.status || '')) || displayOperationalStatus(item)}</span></td>
                      <td>{averb === 'averbado' ? 'Averbado' : averb === 'nao_averbado' ? 'Não averbado' : 'Não informado'}</td>
                      <td>{toDate(item.dataAverbacao || item.atualizadoEm)?.toLocaleDateString('pt-BR') || 'Não informado'}</td>
                      <td className="corte" title={String(item.mensagemSimulacao || item.ultimoHistorico || '')}>{emptyLabel(item.mensagemSimulacao || item.ultimoHistorico)}</td>
                      <td><span className="nx-badge">{productCatalogLabel(String(item.produto || '')) || emptyLabel(item.produto)}</span></td>
                      <td><span className="nx-badge">{emptyLabel(item.banco || item.instituicao)}</span></td>
                      <td>{emptyLabel(item.responsavel || item.operadorNome)}</td>
                      <td>{emptyLabel(item.contrato || item.numeroContrato)}</td>
                      <td>{emptyLabel(item.statusPagamento || item.pagamento)}</td>
                      <td>{emptyLabel(item.telefone || item.whatsapp)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        {fila.length > porPagina ? (
          <div className="flex items-center justify-between gap-2 p-2 text-[11px]">
            <span>{fila.length} registros · página {paginaAtual + 1} de {paginas}</span>
            <div className="flex gap-1">
              <button type="button" className="px-2 py-0.5 rounded nexus-btn-secondary" disabled={paginaAtual === 0} onClick={() => setPagina((p) => Math.max(0, p - 1))}>Anterior</button>
              <button type="button" className="px-2 py-0.5 rounded nexus-btn-secondary" disabled={paginaAtual >= paginas - 1} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
            </div>
          </div>
        ) : null}
      </div>

      {ficha && (
        <FichaProposta
          rec={ficha.rec}
          foco={ficha.foco}
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

function FichaProposta({
  rec,
  foco,
  onClose,
  cliente,
  documentos,
  contratos,
  auditoria,
  campanhaNome,
}: {
  rec: DeskRecord
  foco: FocoFicha
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
  const pendencias = buildPendencias({ rec, docs: documentos })
  useEffect(() => {
    const id = foco === 'proposta' ? 'ficha-proposta' : `ficha-${foco}`
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [foco])
  const historico = buildHistory({ rec, auditoria })
  const contratoRows = contratos.length
    ? contratos
    : rec.contrato
      ? [{ id: 'inline', numero: rec.contrato, status: rec.status, instituicao: rec.banco, parcela: rec.parcela, prazo: rec.prazo, valor: rec.valorLiberado, atualizadoEm: rec.atualizadoEm }]
      : []

  return (
    <div className="ficha-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Proposta">
      <div className="ficha-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 px-4 py-3 border-b" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] font-bold">Proposta {emptyLabel(rec.protocolo || rec.numeroProposta || rec.id)}</div>
              <span className="nx-badge acao mt-1">{digitacaoStatusLabel(String(rec.status || '')) || displayOperationalStatus(rec)}</span>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar"><X className="w-5 h-5" /></button>
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
            <p><span className="desk-label">Cliente</span><br />{emptyLabel(rec.clienteNome || cliente?.nome)}</p>
            <p><span className="desk-label">CPF</span><br />{formatCpfDisplay(String(rec.cpf || cliente?.cpf || '')) || 'Não informado'}</p>
            <p><span className="desk-label">Telefone</span><br />{emptyLabel(rec.telefone || cliente?.telefone || cliente?.whatsapp)}</p>
          </div>
        </div>
        <div className="ficha-corpo">
              <section id="ficha-cliente" className="ficha-block">
                <div className="desk-label mb-1">Cliente</div>
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
                <FieldRow label="UF" value={emptyLabel(rec.uf || cliente?.estado)} />
                <FieldRow label="CEP" value={emptyLabel(cliente?.cep)} />
                <FieldRow label="Benefício" value={emptyLabel(rec.beneficio || rec.numeroBeneficio)} />
                <FieldRow label="Matrícula" value={emptyLabel(rec.matricula)} />
                <FieldRow label="Espécie" value={emptyLabel(rec.especie)} />
              </section>
              <section id="ficha-operacao" className="ficha-block">
                <div className="desk-label mb-1">Operação</div>
                <FieldRow label="Produto" value={emptyLabel(rec.produto)} />
                <FieldRow label="Operação" value={emptyLabel(rec.operacao)} />
                <FieldRow label="Instituição" value={emptyLabel(rec.banco || rec.instituicao)} />
                <FieldRow label="Convênio" value={emptyLabel(rec.convenio)} />
                <FieldRow label="Tabela" value={emptyLabel(rec.tabela)} />
                <FieldRow label="Prazo" value={formatPrazo(rec.prazo)} />
                <FieldRow label="Parcela" value={formatMoney(rec.parcela)} />
                <FieldRow label="Taxa" value={emptyLabel(rec.taxa || rec.taxaMensal)} />
                <FieldRow label="Coeficiente" value={emptyLabel(rec.coeficiente)} />
                <FieldRow label="Margem" value={formatMoney(rec.margem)} />
                <FieldRow label="Valor bruto" value={formatMoney(rec.valorBruto ?? rec.valor)} />
                <FieldRow label="Valor líquido" value={formatMoney(rec.valorLiberado)} />
              </section>
              <section id="ficha-proposta" className="ficha-block">
                <div className="desk-label mb-1">Proposta</div>
                <FieldRow label="Número da proposta" value={emptyLabel(rec.numeroProposta || rec.protocolo)} />
                <FieldRow label="Situação" value={digitacaoStatusLabel(String(rec.status || '')) || displayOperationalStatus(rec)} />
                <FieldRow label="Data de inclusão" value={toDate(rec.criadoEm)?.toLocaleString('pt-BR') || 'Não informado'} />
                <FieldRow label="Última atualização" value={toDate(rec.atualizadoEm)?.toLocaleString('pt-BR') || 'Não informado'} />
                <FieldRow label="Vendedor" value={emptyLabel(rec.responsavel || rec.operadorNome)} />
                <FieldRow label="Contrato" value={emptyLabel(rec.contrato || rec.numeroContrato)} />
                <FieldRow label="Averbação" value={emptyLabel(rec.averbacao || rec.statusAverbacao)} />
                <FieldRow label="Pagamento" value={emptyLabel(rec.pagamento || rec.statusPagamento)} />
                <FieldRow label="Origem" value={emptyLabel(rec.origem)} />
                <FieldRow label="Campanha" value={emptyLabel(campanhaNome || rec.campanha)} />
              </section>
              <section id="ficha-retorno" className="ficha-block">
                <div className="desk-label mb-1">Retorno da instituição</div>
                {wait ? <p className="text-[12px]">Aguardando API</p> : null}
                <FieldRow label="Código" value={emptyLabel(rec.codigoRetorno || rec.protocolo)} />
                <FieldRow label="Status" value={wait ? 'Aguardando API' : displayOperationalStatus(rec)} />
                <FieldRow label="Mensagem" value={emptyLabel(rec.mensagemSimulacao)} />
                <FieldRow label="Data/hora da consulta" value={toDate(rec.atualizadoEm || rec.criadoEm)?.toLocaleString('pt-BR') || 'Não informado'} />
                <FieldRow label="Última resposta" value={emptyLabel(rec.ultimoHistorico || rec.mensagemSimulacao)} />
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
              <section id="ficha-documentos" className="ficha-block">
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
              <section id="ficha-pendencias" className="ficha-block">
                <div className="desk-label mb-1">Pendências</div>
                {pendencias.length === 0 ? (
                  <p className="text-[12px]">Nenhuma pendência registrada.</p>
                ) : (
                  <ul className="text-[12px] space-y-1">
                    {pendencias.map((p) => <li key={p}><span className="nx-badge">{p}</span></li>)}
                  </ul>
                )}
              </section>
              <section id="ficha-historico" className="ficha-block">
                <div className="desk-label mb-1">Histórico</div>
                {historico.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum evento real registrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {historico.map((h, i) => (
                      <li key={`${h.label}-${i}`} className="text-[12px] border-l-2 pl-2" style={{ borderColor: 'var(--code-orange)' }}>
                        <div className="font-semibold">{h.at ? h.at.toLocaleString('pt-BR') : 'Não informado'}</div>
                        <div>{h.label}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
        </div>
      </div>
    </div>
  )
}
