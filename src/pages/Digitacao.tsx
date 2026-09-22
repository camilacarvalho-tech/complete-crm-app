import { useEffect, useMemo, useRef, useState } from 'react'
import { MoreHorizontal, X } from 'lucide-react'
import { INSS_OPERACOES, PRODUCT_TREE } from '../catalog/crmCatalog'
import { ErrorBanner, GhostButton, LoadingBlock, SelectInput, TextInput } from '../components/nexus/kit'
import { ClienteLink } from '../components/nexus/ClienteLink'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { useClickOutside, useEscLayer } from '../hooks/useEscLayer'
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
  matchClientes,
  proposalsForCliente,
  docsForProposal,
  documentOpenUrl,
  sourcedField,
  waitingInstitution,
  type DeskRecord,
} from '../modules/digitacao/digitacaoDesk'
import { labelPt } from '../lib/uiPt'
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

export default function Digitacao() {
  const { propostas, digitacoes, clientes, documentos, contratos, auditoria, campanhas } = useNexusStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [produto, setProduto] = useState('INSS')
  const [operacao, setOperacao] = useState('PORTABILIDADE')
  const [busy, setBusy] = useState(false)
  const [resultados, setResultados] = useState<Awaited<ReturnType<typeof simulateAllInstitutions>>>([])
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [ficha, setFicha] = useState<{ rec: DeskRecord; tab: 'proposta' | 'documentos' | 'historico' } | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [tabFila, setTabFila] = useState('todas')
  const suggestRef = useRef<HTMLDivElement>(null)
  useClickOutside(suggestOpen, suggestRef, () => setSuggestOpen(false))

  const cliente = clientes.items.find((c) => c.id === clienteId) || null
  const suggestions = useMemo(() => matchClientes(clientes.items, q, 8), [clientes.items, q])

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
    let items = digitacoes.items as DeskRecord[]
    if (cliente) {
      const ids = new Set(propostasCliente.map((p) => p.id))
      items = items.filter((d) => ids.has(d.id) || String(d.clienteId) === cliente.id)
    }
    if (tabFila !== 'todas') {
      items = items.filter((d) => displayOperationalStatus(d).toLowerCase().replace(/\s+/g, '_') === tabFila || String(d.status || '').toLowerCase() === tabFila)
    }
    return items
  }, [digitacoes.items, cliente, propostasCliente, tabFila])

  function selectCliente(c: NexusCliente) {
    setClienteId(c.id)
    setQ(formatCpfDisplay(c.cpf) || c.nome || '')
    setSuggestOpen(false)
  }

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
        await digitacoes.create(packed.digitacao as any)
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
      <div>
        <h1>Digitação</h1>
        <p className="desk-sub">Central operacional. Busque o CPF, abra a proposta e acompanhe o que o robô já preencheu.</p>
      </div>
      <ErrorBanner message={digitacoes.error || clientes.error} />

      <div className="desk-card p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative min-w-[240px] flex-1" ref={suggestRef}>
            <span className="desk-label">CPF / Cliente</span>
            <TextInput
              value={q}
              placeholder="Digite o CPF ou nome..."
              className="!py-1.5 !text-xs"
              onFocus={() => setSuggestOpen(true)}
              onChange={(e) => {
                setQ(e.target.value)
                setSuggestOpen(true)
                if (!e.target.value.trim()) setClienteId(null)
              }}
            />
            {suggestOpen && (
              <div className="suggest">
                {suggestions.length === 0 ? (
                  <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum cliente existente para este filtro.</p>
                ) : (
                  suggestions.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className="w-full text-left px-3 py-2 hover:bg-[color:var(--code-surface-muted)]"
                      onClick={() => selectCliente(c)}
                    >
                      <div className="font-semibold text-[13px]">{c.nome || 'Sem nome'}</div>
                      <div className="text-[11px]" style={{ color: 'var(--code-muted)' }}>
                        CPF: {c.cpf ? formatCpfDisplay(c.cpf) : 'Não informado'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <label className="desk-label">Produto
            <SelectInput className="!py-1.5 !text-xs" value={produto} onChange={(e) => setProduto(e.target.value)}>
              {PRODUCT_TREE.map((p) => (
                <option key={p.code} value={p.code}>{p.nome}</option>
              ))}
            </SelectInput>
          </label>
          <label className="desk-label">Operação
            <SelectInput className="!py-1.5 !text-xs" value={operacao} onChange={(e) => setOperacao(e.target.value)}>
              {INSS_OPERACOES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </SelectInput>
          </label>
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
          {propostasCliente.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhuma proposta existente para este cliente.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {propostasCliente.map((p) => (
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
            {resultados.map((o) => (
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

      <div className="desk-card">
        <div className="flex flex-wrap gap-1 p-2 border-b" style={{ borderColor: 'var(--code-border)' }}>
          {['todas', 'nova', 'em_digitacao', 'enviada', 'em_analise', 'pendencia', 'aprovada', 'reprovada', 'paga', 'cancelada'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTabFila(t)}
              className={`px-2 py-0.5 rounded text-[11px] ${tabFila === t ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`}
            >
              {labelPt(t)}
            </button>
          ))}
        </div>
        <div className="desk-table-wrap">
          {fila.length === 0 ? (
            <p className="p-4 text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum registro nesta fila.</p>
          ) : (
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>CPF</th>
                  <th>Produto</th>
                  <th>Operação</th>
                  <th>Instituição</th>
                  <th>Contrato</th>
                  <th>Parcela</th>
                  <th>Prazo</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {fila.map((item) => (
                  <tr key={item.id} onClick={() => setFicha({ rec: item, tab: 'proposta' })}>
                    <td><ClienteLink id={item.clienteId} nome={item.clienteNome || item.clienteId} /></td>
                    <td>{item.cpf ? formatCpfDisplay(String(item.cpf)) : 'Não informado'}</td>
                    <td>{emptyLabel(item.produto, '—')}</td>
                    <td>{emptyLabel(item.operacao, '—')}</td>
                    <td>{emptyLabel(item.banco || item.instituicao, '—')}</td>
                    <td>{emptyLabel(item.contrato, '—')}</td>
                    <td>{moneyOrMissing(item.parcela)}</td>
                    <td>{formatPrazo(item.prazo)}</td>
                    <td><span className="status-pill">{displayOperationalStatus(item)}</span></td>
                    <td className="relative" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="p-1 align-middle" aria-label="Mais ações" onClick={() => setMenuId(menuId === item.id ? null : item.id)}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuId === item.id && (
                        <div className="absolute right-0 z-20 desk-card p-1 min-w-[160px]">
                          <button type="button" className="block w-full text-left px-2 py-1 text-[12px]" onClick={() => { setFicha({ rec: item, tab: 'proposta' }); setMenuId(null) }}>Ver proposta</button>
                          <button type="button" className="block w-full text-left px-2 py-1 text-[12px]" onClick={() => { setFicha({ rec: item, tab: 'proposta' }); setMenuId(null) }}>Ver detalhes</button>
                          <button type="button" className="block w-full text-left px-2 py-1 text-[12px]" onClick={() => { setFicha({ rec: item, tab: 'documentos' }); setMenuId(null) }}>Ver documentos</button>
                          <button type="button" className="block w-full text-left px-2 py-1 text-[12px]" onClick={() => { setFicha({ rec: item, tab: 'historico' }); setMenuId(null) }}>Ver histórico</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
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
        <div className="flex gap-1 px-4 py-2 border-b text-[11px]" style={{ borderColor: 'var(--code-border)' }}>
          {(['proposta', 'documentos', 'historico'] as const).map((t) => (
            <button key={t} type="button" className={`px-2 py-1 rounded ${tab === t ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`} onClick={() => onTab(t)}>
              {t === 'proposta' ? 'Proposta' : t === 'documentos' ? 'Documentos' : 'Histórico'}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-4">
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
