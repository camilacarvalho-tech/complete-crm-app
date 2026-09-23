import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Filter, MoreVertical } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { createdOf, inRange, money, pct, periodRange, previousRange, type PeriodKey } from '../lib/nexusCore'
import { PIPELINE_STAGES } from '../types/nexus'
import { originCode, originLabel } from '../catalog/crmCatalog'
import { CREDIT_PRODUCTS, productCatalogLabel } from '../catalog/productCatalog'
import { ErrorBanner, GhostButton, PageHeader } from '../components/nexus/kit'
import { FilterDateRange } from '../components/nexus/Filters'
import { useToast } from '../components/ui/Toast'
import { useEscLayer } from '../hooks/useEscLayer'
import {
  colorFor,
  countBy,
  evolutionByOrigin,
  exportCsv,
  exportPdf,
  filterPeriod,
  leadsByDay,
  productOf,
  stageOf,
  sumMoney,
} from '../lib/dashboardAnalytics'
import { DEFAULT_WIDGETS, REPORT_CATALOG, layoutStorageKey, type DashWidget, type ReportId } from '../lib/dashboardReports'
import type { NexusCliente, NexusRecord } from '../types/nexus'

const ORIGENS_PAINEL = [
  { code: 'trafego_pago', label: 'Tráfego pago' },
  { code: 'facebook', label: 'Facebook' },
  { code: 'instagram', label: 'Instagram' },
  { code: 'whatsapp', label: 'WhatsApp' },
  { code: 'indicacao', label: 'Indicação' },
  { code: 'sms', label: 'SMS' },
  { code: 'planilha', label: 'Planilha' },
] as const

function origemPainel(c: NexusCliente): string {
  const raw = `${c.source || ''} ${c.origem || ''} ${c.origemLead || ''} ${c.utm_source || ''}`.toLowerCase()
  if (raw.includes('instagram')) return 'instagram'
  if (raw.includes('facebook') || raw.includes('meta')) return 'facebook'
  if (raw.includes('whats')) return 'whatsapp'
  if (raw.includes('indic')) return 'indicacao'
  if (raw.includes('sms')) return 'sms'
  if (raw.includes('planilha') || raw.includes('csv') || raw.includes('excel')) return 'planilha'
  if (raw.includes('trafego') || raw.includes('tráfego') || raw.includes('google') || raw.includes('ads')) return 'trafego_pago'
  return originCode(raw)
}

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_anterior', label: 'Mês anterior' },
  { id: 'custom', label: 'Personalizado' },
]

const TT = {
  contentStyle: { background: 'var(--code-surface)', border: '1px solid var(--code-border)', color: 'var(--code-text)', borderRadius: 8 },
  labelStyle: { color: 'var(--code-text)' },
  itemStyle: { color: 'var(--code-text)' },
}

export default function Dashboard() {
  const store = useNexusStore()
  const { usuario } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [period, setPeriod] = useState<PeriodKey>('30d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [origem, setOrigem] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [equipe, setEquipe] = useState('')
  const [produto, setProduto] = useState('')
  const [status, setStatus] = useState('')
  const [etapa, setEtapa] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [campanha, setCampanha] = useState('')
  const [banco, setBanco] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEscLayer(filtersOpen, () => setFiltersOpen(false))
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => new Date())
  const [headerMenu, setHeaderMenu] = useState(false)
  const [widgets, setWidgets] = useState<DashWidget[]>(DEFAULT_WIDGETS)

  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 30000)
    return () => window.clearInterval(t)
  }, [])

  const range = periodRange(period, { from, to })
  const prev = previousRange(range)
  const layoutKey = layoutStorageKey(store.clientes.empresaId, usuario?.id)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(layoutKey)
      if (raw) setWidgets(JSON.parse(raw) as DashWidget[])
    } catch { /* keep default */ }
  }, [layoutKey])

  useEffect(() => {
    const saved = store.viewsSalvas.items.find((v) => v.modulo === 'dashboard_layout' && v.usuarioId === usuario?.id)
    if (saved && Array.isArray(saved.widgets) && saved.widgets.length) setWidgets(saved.widgets as DashWidget[])
  }, [store.viewsSalvas.items, usuario?.id])

  function persist(next: DashWidget[]) {
    setWidgets(next)
    localStorage.setItem(layoutKey, JSON.stringify(next))
    const existing = store.viewsSalvas.items.find((v) => v.modulo === 'dashboard_layout' && v.usuarioId === usuario?.id)
    if (existing) void store.viewsSalvas.update(existing.id, { widgets: next, usuarioId: usuario?.id })
    else void store.viewsSalvas.create({ modulo: 'dashboard_layout', nome: 'Dashboard', usuarioId: usuario?.id, widgets: next } as any)
  }

  const clientesAll = store.clientes.items
  const clientes = useMemo(() => clientesAll.filter((c) => {
    const created = createdOf(c)
    if (created && !inRange(created, range.from, range.to)) return false
    if (!created && period === 'hoje') return false
    if (origem && origemPainel(c) !== origem) return false
    if (responsavel && String(c.responsavel || c.atendente || '') !== responsavel) return false
    if (equipe && String(c.equipe || '') !== equipe) return false
    if (produto && productOf(c) !== produto && String(c.modalidade || '') !== produto && !(c.modalidades || []).includes(produto)) return false
    if (status && String(c.status || '') !== status) return false
    if (etapa && stageOf(c) !== etapa) return false
    if (cidade && String(c.cidade || c.cidadeOrigem || '') !== cidade) return false
    if (estado && String(c.estado || c.estadoOrigem || '') !== estado) return false
    if (campanha && String(c.campanha || c.utm_campaign || '') !== campanha) return false
    if (banco && String(c.banco || '') !== banco) return false
    return true
  }), [clientesAll, range.from, range.to, origem, responsavel, equipe, produto, status, etapa, cidade, estado, campanha, banco, period])

  const clientesPrev = useMemo(() => clientesAll.filter((c) => {
    const created = createdOf(c)
    return created ? inRange(created, prev.from, prev.to) : false
  }), [clientesAll, prev.from, prev.to])

  const propostas = filterPeriod(store.propostas.items, range.from, range.to)
  const propostasPrev = filterPeriod(store.propostas.items, prev.from, prev.to)
  const digitacoes = filterPeriod(store.digitacoes.items, range.from, range.to)
  const digitacoesPrev = filterPeriod(store.digitacoes.items, prev.from, prev.to)
  const transacoes = filterPeriod(store.transacoes.items, range.from, range.to)
  const transacoesPrev = filterPeriod(store.transacoes.items, prev.from, prev.to)
  const campanhas = store.campanhas.items

  const data = useMemo(() => buildData({ clientes, clientesPrev, propostas, propostasPrev, digitacoes, digitacoesPrev, transacoes, transacoesPrev, campanhas }),
    [clientes, clientesPrev, propostas, propostasPrev, digitacoes, digitacoesPrev, transacoes, transacoesPrev, campanhas])

  const resps = [...new Set(clientesAll.map((c) => String(c.responsavel || c.atendente || '')).filter(Boolean))]
  const equipes = [...new Set(clientesAll.map((c) => String(c.equipe || '')).filter(Boolean))]
  const statuses = [...new Set(clientesAll.map((c) => String(c.status || '')).filter(Boolean))]
  const campanhasNomes = [...new Set([...campanhas.map((c) => String(c.nome || '')), ...clientesAll.map((c) => String(c.campanha || c.utm_campaign || ''))].filter(Boolean))]
  const bancos = [...new Set(clientesAll.map((c) => String(c.banco || '')).filter(Boolean))]
  const produtosFiltro = [...new Set(clientesAll.map(productOf).filter(Boolean))]
  const activeFilters = [origem, responsavel, equipe, produto, status, etapa, cidade, estado, campanha, banco].filter(Boolean).length

  if (store.clientes.loading) {
    return <div className="p-4"><PageHeader title="Dashboard" /><div className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--code-border)' }} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <PageHeader title="Dashboard" subtitle="Visão geral da operação, vendas, atendimento, marketing e financeiro." />
        <div className="flex flex-wrap gap-2">
          <GhostButton type="button" onClick={() => setFiltersOpen(true)}>
            <span className="inline-flex items-center gap-1"><Filter className="w-4 h-4" /> Filtros{activeFilters ? ` (${activeFilters})` : ''}</span>
          </GhostButton>
          <div className="relative">
            <GhostButton type="button" aria-label="Mais opções" onClick={() => setHeaderMenu((v) => !v)}><MoreVertical className="w-4 h-4" /></GhostButton>
            {headerMenu && (
              <div className="absolute right-0 mt-1 nexus-card p-2 w-52 z-30 text-sm">
                <button type="button" className="block w-full text-left px-2 py-1.5 rounded hover:bg-black/5" onClick={() => { persist(DEFAULT_WIDGETS); setHeaderMenu(false); toast.success('Layout restaurado') }}>Restaurar layout</button>
                <button type="button" className="block w-full text-left px-2 py-1.5 rounded hover:bg-black/5" onClick={() => { exportCsv('dashboard-kpis.csv', [{ leads: data.kpis.leads, clientes: data.kpis.clientes, propostas: data.kpis.propostas, contratos: data.kpis.contratos, receita: data.kpis.receita }]); setHeaderMenu(false) }}>Exportar resumo CSV</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ErrorBanner message={store.clientes.error} />
      <p className="text-sm" style={{ color: 'var(--code-muted)' }}>{agora.toLocaleDateString('pt-BR')} · {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>

      <div className="flex flex-wrap gap-2 items-center">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" onClick={() => setPeriod(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${period === p.id ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`}>
            {p.label}
          </button>
        ))}
        {period === 'custom' && <FilterDateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {widgets.map((w) => (
          <div key={w.id} className={w.span === 2 || w.reportId === 'kpis' || w.reportId === 'equipe' ? 'lg:col-span-2' : ''}>
            <WidgetFrame
              title={w.title || REPORT_CATALOG.find((r) => r.id === w.reportId)?.title || w.reportId}
              open={menuOpen === w.id}
              onMenu={() => setMenuOpen(menuOpen === w.id ? null : w.id)}
              onEdit={() => { const t = window.prompt('Nome do relatório', w.title || ''); if (t) persist(widgets.map((x) => x.id === w.id ? { ...x, title: t } : x)); setMenuOpen(null) }}
              onDuplicate={() => { persist([...widgets, { ...w, id: `${w.id}-${Date.now()}` }]); setMenuOpen(null) }}
              onMove={(dir) => {
                const i = widgets.findIndex((x) => x.id === w.id)
                const j = dir === 'up' ? i - 1 : i + 1
                if (j < 0 || j >= widgets.length) return
                const next = [...widgets]
                const [item] = next.splice(i, 1)
                next.splice(j, 0, item)
                persist(next)
                setMenuOpen(null)
              }}
              onResize={() => persist(widgets.map((x) => x.id === w.id ? { ...x, span: x.span === 2 ? 1 : 2 } : x))}
              onExport={(fmt) => {
                const rows = rowsFor(w.reportId, data)
                if (fmt === 'pdf') exportPdf(w.title || w.reportId, rows)
                else exportCsv(`${w.reportId}.${fmt === 'xlsx' ? 'xlsx.csv' : 'csv'}`, rows)
                setMenuOpen(null)
              }}
              onRemove={() => { persist(widgets.filter((x) => x.id !== w.id)); setMenuOpen(null) }}
            >
              <VisibleOnce>
                <ReportBody id={w.reportId} data={data} onNavigate={nav} />
              </VisibleOnce>
            </WidgetFrame>
          </div>
        ))}
      </div>

      {filtersOpen && (
        <aside className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)}>
          <div className="nexus-modal-overlay absolute inset-0" />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto p-5 nexus-card rounded-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Filtros avançados</h2>
              <GhostButton type="button" data-nexus-esc onClick={() => setFiltersOpen(false)}>Fechar</GhostButton>
            </div>
            <p className="text-xs font-semibold mb-2">Origem</p>
            <div className="filtros-origem rounded-lg border p-1" style={{ borderColor: 'var(--code-border)' }}>
              <button type="button" className={`block w-full text-left px-3 py-2 rounded text-sm ${origem === '' ? 'nexus-cta text-white' : ''}`} onClick={() => setOrigem('')}>Todas</button>
              {ORIGENS_PAINEL.map((o) => (
                <button key={o.code} type="button" className={`block w-full text-left px-3 py-2 rounded text-sm ${origem === o.code ? 'nexus-cta text-white' : ''}`} onClick={() => setOrigem(o.code)}>{o.label}</button>
              ))}
            </div>
            <GhostButton type="button" className="mt-3" onClick={() => setOrigem('')}>Limpar filtros</GhostButton>
          </div>
        </aside>
      )}

    </div>
  )
}

function buildData(args: {
  clientes: NexusCliente[]
  clientesPrev: NexusCliente[]
  propostas: NexusRecord[]
  propostasPrev: NexusRecord[]
  digitacoes: NexusRecord[]
  digitacoesPrev: NexusRecord[]
  transacoes: NexusRecord[]
  transacoesPrev: NexusRecord[]
  campanhas: NexusRecord[]
}) {
  const { clientes, clientesPrev, propostas, propostasPrev, digitacoes, digitacoesPrev, transacoes, transacoesPrev, campanhas } = args
  const propOk = propostas.filter((p) => ['aprovada', 'aprovado'].includes(String(p.status || '').toLowerCase()))
  const prodPaga = digitacoes.filter((d) => ['paga', 'pago'].includes(String(d.status || '').toLowerCase()))
  const receita = sumMoney(transacoes, 'receita')
  const custos = sumMoney(transacoes, 'despesa')
  const mkt = transacoes.filter((t) => String(t.categoria) === 'marketing').reduce((s, t) => s + Number(t.valor || 0), 0)
  const receitaPrev = sumMoney(transacoesPrev, 'receita')
  const contratosPrev = digitacoesPrev.filter((d) => ['paga', 'pago'].includes(String(d.status || '').toLowerCase())).length
  const kpis = {
    leads: clientes.length,
    clientes: clientes.length,
    propostas: propostas.length,
    contratos: prodPaga.length,
    conversao: clientes.length ? prodPaga.length / clientes.length : 0,
    receita,
    lucro: receita - custos,
    roi: mkt ? ((receita - mkt) / mkt) * 100 : 0,
    custos,
    comPrev: propostas.reduce((s, p) => s + Number(p.comissao || 0), 0),
    comRec: transacoes.filter((t) => String(t.categoria) === 'comissao').reduce((s, t) => s + Number(t.valor || 0), 0),
    cpl: clientes.length && mkt ? mkt / clientes.length : 0,
    cac: prodPaga.length && mkt ? mkt / prodPaga.length : 0,
    cpa: prodPaga.length && mkt ? mkt / prodPaga.length : 0,
    conversoes: prodPaga.length,
    investimento: mkt,
  }
  const prevK = {
    leads: clientesPrev.length,
    clientes: clientesPrev.length,
    propostas: propostasPrev.length,
    contratos: contratosPrev,
    receita: receitaPrev,
  }
  const origem = countBy(clientes.map((c) => originLabel(originCode(String(c.source || c.origem || 'manual')))))
  const creditNames = CREDIT_PRODUCTS.map((p) => p.label)
  const creditTotal = clientes.filter((c) => creditNames.includes(productCatalogLabel(productOf(c)))).length
  const produtos = creditNames.map((name) => {
    const value = clientes.filter((c) => productCatalogLabel(productOf(c)) === name).length
    return { name, value, total: creditTotal, pct: creditTotal ? (value / creditTotal) * 100 : 0 }
  })
  const status = countBy(clientes.map((c) => PIPELINE_STAGES.find((s) => s.id === stageOf(c))?.label || stageOf(c).toUpperCase()))
  const cidades = countBy(clientes.map((c) => [c.cidade || c.cidadeOrigem, c.estado || c.estadoOrigem].filter(Boolean).join(' - '))).slice(0, 12)
  const funnelDefs = [
    { key: 'leads', label: 'Leads', qtd: clientes.length },
    { key: 'atend', label: 'Atendimento', qtd: clientes.filter((c) => !['novo_lead', 'triagem'].includes(stageOf(c))).length },
    { key: 'qual', label: 'Qualificados', qtd: clientes.filter((c) => ['qualificado', 'simulacao', 'proposta', 'documentacao', 'em_analise', 'aprovado', 'contrato', 'finalizado'].includes(stageOf(c))).length },
    { key: 'sim', label: 'Simulações', qtd: clientes.filter((c) => ['simulacao', 'proposta', 'documentacao', 'em_analise', 'aprovado', 'contrato', 'finalizado'].includes(stageOf(c))).length },
    { key: 'prop', label: 'Propostas', qtd: propostas.length },
    { key: 'apr', label: 'Aprovadas', qtd: propOk.length },
    { key: 'ctr', label: 'Contratos', qtd: prodPaga.length },
    { key: 'prd', label: 'Produção', qtd: digitacoes.length },
  ].filter((s) => s.qtd > 0)
  const convProduto = CREDIT_PRODUCTS.map((prod) => {
    const same = (raw: unknown) => productCatalogLabel(String(raw || '')) === prod.label
    const leads = clientes.filter((c) => productCatalogLabel(productOf(c)) === prod.label)
    const sims = digitacoes.filter((d) => same(d.produto))
    const props = propostas.filter((x) => same(x.produto))
    const apr = props.filter((x) => String(x.status || '').toLowerCase().includes('aprov'))
    const formal = [...props, ...sims].filter((x) => String(x.status || '').toLowerCase().includes('formal'))
    return {
      name: prod.label,
      Leads: leads.length,
      Simulacoes: sims.length,
      Propostas: props.length,
      Aprovados: apr.length,
      Formalizados: formal.length,
      Conversao: leads.length ? Number(((apr.length / leads.length) * 100).toFixed(1)) : 0,
    }
  })
  const equipeMap = new Map<string, { leads: number; atend: number; prop: number; apr: number; ctr: number }>()
  clientes.forEach((c) => {
    const name = String(c.responsavel || c.atendente || 'Sem responsável')
    const cur = equipeMap.get(name) || { leads: 0, atend: 0, prop: 0, apr: 0, ctr: 0 }
    cur.leads += 1
    if (!['novo_lead', 'triagem'].includes(stageOf(c))) cur.atend += 1
    equipeMap.set(name, cur)
  })
  propostas.forEach((p) => {
    const name = String(p.responsavel || p.funcionario || 'Sem responsável')
    const cur = equipeMap.get(name) || { leads: 0, atend: 0, prop: 0, apr: 0, ctr: 0 }
    cur.prop += 1
    if (['aprovada', 'aprovado'].includes(String(p.status || '').toLowerCase())) cur.apr += 1
    equipeMap.set(name, cur)
  })
  digitacoes.forEach((d) => {
    const name = String(d.responsavel || d.funcionario || 'Sem responsável')
    const cur = equipeMap.get(name) || { leads: 0, atend: 0, prop: 0, apr: 0, ctr: 0 }
    if (['paga', 'pago', 'aprovada', 'aprovado'].includes(String(d.status || '').toLowerCase())) cur.ctr += 1
    equipeMap.set(name, cur)
  })
  const equipe = [...equipeMap.entries()].map(([name, v]) => ({ name, ...v, Conversao: v.leads ? Number(((v.ctr / v.leads) * 100).toFixed(1)) : 0 }))
  const leadsCampanha = countBy(clientes.map((c) => String(c.campanha || c.utm_campaign || '')).filter(Boolean))
  const roiCampanha = campanhas
    .map((c) => {
      const inv = Number(c.investimento || c.custo || 0)
      const rec = Number(c.receita || 0)
      if (!inv && !rec) return null
      return { name: String(c.nome || c.id), Investimento: inv, Receita: rec, ROI: inv ? Number((((rec - inv) / inv) * 100).toFixed(1)) : 0 }
    })
    .filter(Boolean) as { name: string; Investimento: number; Receita: number; ROI: number }[]
  const receitaProduto = countMoney(transacoes.filter((t) => String(t.tipo) === 'receita'), (t) => String(t.produto || t.categoria || 'Sem produto'))
  const despesasCat = countMoney(transacoes.filter((t) => String(t.tipo) === 'despesa'), (t) => String(t.categoria || 'Sem categoria'))
  const comissaoProduto = countMoney(
    [...propostas.filter((p) => Number(p.comissao || 0) > 0), ...transacoes.filter((t) => String(t.categoria) === 'comissao')],
    (t) => String(t.produto || t.categoria || 'Comissão')
  )
  return {
    kpis,
    prevK,
    origem,
    produtos,
    status,
    cidades,
    funnel: funnelDefs,
    convProduto,
    equipe,
    leadsDia: leadsByDay(clientes),
    evolucao: evolutionByOrigin(clientes),
    leadsCampanha,
    roiCampanha,
    receitaProduto,
    despesasCat,
    comissaoProduto,
    financeBar: [{ name: 'Período', Receita: receita, Custos: custos, Lucro: receita - custos }],
    mktBar: [{ name: 'Período', Investimento: mkt, Receita: receita }],
  }
}

function countMoney(items: NexusRecord[], keyFn: (t: NexusRecord) => string) {
  const map = new Map<string, number>()
  items.forEach((t) => {
    const k = keyFn(t)
    const v = Number(t.valor || t.comissao || 0)
    if (!k || !v) return
    map.set(k, (map.get(k) || 0) + v)
  })
  const total = [...map.values()].reduce((s, n) => s + n, 0)
  return [...map.entries()].map(([name, value]) => ({ name, value, total, pct: total ? (value / total) * 100 : 0 }))
}

type DashData = ReturnType<typeof buildData>

function rowsFor(id: ReportId, data: DashData): Record<string, unknown>[] {
  if (id === 'origem') return data.origem
  if (id === 'produtos') return data.produtos
  if (id === 'status') return data.status
  if (id === 'cidades') return data.cidades
  if (id === 'leads_dia') return data.leadsDia
  if (id === 'funil') return data.funnel
  if (id === 'conversao_produto') return data.convProduto
  if (id === 'equipe') return data.equipe
  if (id === 'kpis') return [data.kpis]
  if (id === 'receita_produto') return data.receitaProduto
  if (id === 'despesas_cat') return data.despesasCat
  return [{ ...data.kpis }]
}

function delta(now: number, before: number) {
  if (!before && !now) return null
  if (!before) return null
  return ((now - before) / Math.abs(before)) * 100
}

function WidgetFrame({ title, children, open, onMenu, onEdit, onDuplicate, onMove, onResize, onExport, onRemove }: {
  title: string
  children: ReactNode
  open: boolean
  onMenu: () => void
  onEdit: () => void
  onDuplicate: () => void
  onMove: (d: 'up' | 'down') => void
  onResize: () => void
  onExport: (fmt: 'csv' | 'xlsx' | 'pdf') => void
  onRemove: () => void
}) {
  return (
    <section className="nexus-card p-5 relative h-full">
      <div className="flex items-start justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        <div className="relative">
          <button type="button" className="p-1 rounded" aria-label="Opções do relatório" onClick={onMenu}><MoreVertical className="w-4 h-4" /></button>
          {open && (
            <div className="absolute right-0 mt-1 nexus-card p-2 w-44 z-20 text-sm">
              <button type="button" className="block w-full text-left px-2 py-1" onClick={onEdit}>Editar</button>
              <button type="button" className="block w-full text-left px-2 py-1" onClick={onDuplicate}>Duplicar</button>
              <button type="button" className="block w-full text-left px-2 py-1" onClick={() => onMove('up')}>Mover para cima</button>
              <button type="button" className="block w-full text-left px-2 py-1" onClick={() => onMove('down')}>Mover para baixo</button>
              <button type="button" className="block w-full text-left px-2 py-1" onClick={onResize}>Redimensionar</button>
              <button type="button" className="block w-full text-left px-2 py-1" onClick={() => onExport('csv')}>Exportar CSV</button>
              <button type="button" className="block w-full text-left px-2 py-1" onClick={() => onExport('xlsx')}>Exportar XLSX</button>
              <button type="button" className="block w-full text-left px-2 py-1" onClick={() => onExport('pdf')}>Exportar PDF</button>
              <button type="button" className="block w-full text-left px-2 py-1" onClick={onRemove}>Remover</button>
            </div>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyChart() {
  return (
    <div className="py-10 text-center">
      <p className="font-medium">Sem dados para este período.</p>
      <p className="text-sm mt-1" style={{ color: 'var(--code-muted)' }}>Quando houver movimentação, este relatório será exibido aqui.</p>
    </div>
  )
}

function VisibleOnce({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShow(true); io.disconnect() }
    }, { rootMargin: '160px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref}>{show ? children : <div className="h-52 rounded-xl animate-pulse" style={{ background: 'var(--code-row-hover)' }} />}</div>
}

function Donut({ data, onSlice }: { data: { name: string; value: number; pct: number }[]; onSlice?: (name: string) => void }) {
  if (!data.length) return <EmptyChart />
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={2} onClick={(d) => d?.name && onSlice?.(String(d.name))}>
          {data.map((e, i) => <Cell key={e.name} fill={colorFor(e.name, i)} cursor={onSlice ? 'pointer' : 'default'} />)}
        </Pie>
        <Tooltip {...TT} formatter={(value, name, item) => {
          const pctv = (item?.payload as { pct?: number })?.pct
          return [`${value} (${pctv?.toFixed(1) || 0}%)`, String(name)]
        }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

function ReportBody({ id, data, onNavigate }: { id: ReportId; data: DashData; onNavigate: ReturnType<typeof useNavigate> }) {
  if (id === 'kpis') {
    const items = [
      { label: 'Leads', value: data.kpis.leads, prev: data.prevK.leads },
      { label: 'Clientes', value: data.kpis.clientes, prev: data.prevK.clientes },
      { label: 'Propostas', value: data.kpis.propostas, prev: data.prevK.propostas },
      { label: 'Contratos', value: data.kpis.contratos, prev: data.prevK.contratos },
      { label: 'Conversão', value: pct(data.kpis.conversoes, data.kpis.leads), prev: null as number | null },
      { label: 'Receita', value: money(data.kpis.receita), prev: data.prevK.receita, numeric: data.kpis.receita },
      { label: 'Lucro', value: money(data.kpis.lucro), prev: null },
      { label: 'ROI', value: `${data.kpis.roi.toFixed(1)}%`, prev: null },
    ]
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((k) => {
          const d = typeof k.numeric === 'number' ? delta(k.numeric, Number(k.prev || 0)) : typeof k.value === 'number' ? delta(k.value, Number(k.prev || 0)) : null
          return (
            <div key={k.label} className="rounded-xl p-4 border" style={{ borderColor: 'var(--code-card-border)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--code-muted)' }}>{k.label}</p>
              <p className="text-3xl font-bold mt-2 leading-none">{k.value}</p>
              {d !== null && (
                <p className="text-sm mt-2" style={{ color: d >= 0 ? 'var(--code-success)' : 'var(--code-danger)' }}>
                  {d >= 0 ? '↑' : '↓'} {Math.abs(d).toFixed(1)}% <span style={{ color: 'var(--code-muted)' }}>vs. período anterior</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    )
  }
  if (id === 'leads_dia') {
    if (!data.leadsDia.length) return <EmptyChart />
    return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data.leadsDia}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--code-border)" />
          <XAxis dataKey="dia" fontSize={11} stroke="var(--code-muted)" />
          <YAxis allowDecimals={false} fontSize={11} stroke="var(--code-muted)" />
          <Tooltip {...TT} />
          <Area type="monotone" dataKey="qtd" stroke="#f97316" fill="#f97316" fillOpacity={0.18} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  if (id === 'origem') return <Donut data={data.origem} onSlice={() => onNavigate('/whatsapp')} />
  if (id === 'produtos') {
    const slices = data.produtos.filter((p) => p.value > 0)
    return (
      <div className="space-y-3">
        {slices.length ? <Donut data={slices} onSlice={(name) => onNavigate(`/leads?produto=${encodeURIComponent(name)}`)} /> : <EmptyChart />}
        <div>
          <table className="w-full text-xs">
            <thead><tr><th className="p-1 text-left">Produto</th><th className="p-1 text-right">Leads</th></tr></thead>
            <tbody>
              {data.produtos.map((p) => (
                <tr key={p.name}><td className="p-1">{p.name}</td><td className="p-1 text-right">{p.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
  if (id === 'status') return <Donut data={data.status} onSlice={(name) => {
    if (name.toLowerCase().includes('proposta') || name === 'APROVADO') onNavigate('/propostas')
    else onNavigate('/whatsapp')
  }} />
  if (id === 'cidades') {
    if (!data.cidades.length) return <EmptyChart />
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.cidades} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--code-border)" />
          <XAxis type="number" allowDecimals={false} stroke="var(--code-muted)" />
          <YAxis type="category" dataKey="name" width={110} fontSize={11} stroke="var(--code-muted)" />
          <Tooltip {...TT} />
          <Bar dataKey="value" fill="#2563eb" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    )
  }
  if (id === 'evolucao_origem') {
    if (!data.evolucao.length) return <EmptyChart />
    const keys = [...new Set(data.evolucao.flatMap((r) => Object.keys(r).filter((k) => k !== 'dia')))]
    return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data.evolucao}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--code-border)" />
          <XAxis dataKey="dia" fontSize={11} stroke="var(--code-muted)" />
          <YAxis allowDecimals={false} fontSize={11} stroke="var(--code-muted)" />
          <Tooltip {...TT} />
          <Legend />
          {keys.slice(0, 6).map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={colorFor(k, i)} fill={colorFor(k, i)} fillOpacity={0.35} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  if (id === 'funil') {
    if (!data.funnel.length) return <EmptyChart />
    const max = data.funnel[0].qtd || 1
    return (
      <div className="space-y-2">
        {data.funnel.map((s, i) => {
          const next = data.funnel[i + 1]
          const rate = next && s.qtd ? (next.qtd / s.qtd) * 100 : null
          return (
            <div key={s.key}>
              <div className="mx-auto rounded-lg text-white text-center py-2 text-sm font-semibold" style={{ width: `${Math.max(28, (s.qtd / max) * 100)}%`, background: 'linear-gradient(90deg, var(--code-orange), var(--code-blue))' }}>
                {s.label} · {s.qtd}
              </div>
              {rate !== null && <p className="text-center text-xs my-1" style={{ color: 'var(--code-muted)' }}>↓ {rate.toFixed(0)}%</p>}
            </div>
          )
        })}
      </div>
    )
  }
  if (id === 'conversao_produto') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr>
              <th className="p-2 text-left">Produto</th>
              <th className="p-2">Leads</th>
              <th className="p-2">Simulações</th>
              <th className="p-2">Propostas</th>
              <th className="p-2">Aprovados</th>
              <th className="p-2">Formalizados</th>
              <th className="p-2">Conversão %</th>
            </tr>
          </thead>
          <tbody>
            {data.convProduto.map((r) => (
              <tr key={r.name}>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-center">{r.Leads}</td>
                <td className="p-2 text-center">{r.Simulacoes}</td>
                <td className="p-2 text-center">{r.Propostas}</td>
                <td className="p-2 text-center">{r.Aprovados}</td>
                <td className="p-2 text-center">{r.Formalizados}</td>
                <td className="p-2 text-center">{r.Conversao}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (id === 'equipe') {
    if (!data.equipe.length) return <EmptyChart />
    return (
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Funcionário</th>
              <th className="p-2">Leads</th>
              <th className="p-2">Atendimentos</th>
              <th className="p-2">Propostas</th>
              <th className="p-2">Aprovadas</th>
              <th className="p-2">Contratos</th>
              <th className="p-2">Conversão</th>
            </tr>
          </thead>
          <tbody>
            {data.equipe.map((r) => (
              <tr key={r.name}>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-center">{r.leads}</td>
                <td className="p-2 text-center">{r.atend}</td>
                <td className="p-2 text-center">{r.prop}</td>
                <td className="p-2 text-center">{r.apr}</td>
                <td className="p-2 text-center">{r.ctr}</td>
                <td className="p-2 text-center">{r.Conversao}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (id === 'marketing') {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
          <p>Investimento <strong>{money(data.kpis.investimento)}</strong></p>
          <p>Resultado <strong>{money(data.kpis.receita)}</strong></p>
          <p>ROI <strong>{data.kpis.roi.toFixed(1)}%</strong></p>
          <p>Período <strong>{data.mktBar[0]?.name || 'Período'}</strong></p>
          <p>Leads <strong>{data.kpis.leads}</strong></p>
          <p>CPL <strong>{money(data.kpis.cpl)}</strong></p>
          <p>CAC <strong>{money(data.kpis.cac)}</strong></p>
          <p>Conversões <strong>{data.kpis.conversoes}</strong></p>
        </div>
        {data.kpis.investimento || data.kpis.receita ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.mktBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--code-border)" />
              <XAxis dataKey="name" stroke="var(--code-muted)" />
              <YAxis stroke="var(--code-muted)" />
              <Tooltip {...TT} />
              <Legend />
              <Bar dataKey="Investimento" fill="#7c3aed" />
              <Bar dataKey="Receita" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
    )
  }
  if (id === 'roi_campanha') {
    if (!data.roiCampanha.length) return <EmptyChart />
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.roiCampanha}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--code-border)" />
          <XAxis dataKey="name" fontSize={11} stroke="var(--code-muted)" />
          <YAxis stroke="var(--code-muted)" />
          <Tooltip {...TT} />
          <Bar dataKey="ROI" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    )
  }
  if (id === 'leads_campanha') return <Donut data={data.leadsCampanha} />
  if (id === 'finance') {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm mb-3">
          <p>Receita <strong>{money(data.kpis.receita)}</strong></p>
          <p>Custos <strong>{money(data.kpis.custos)}</strong></p>
          <p>Resultado líquido <strong>{money(data.kpis.lucro)}</strong></p>
          <p>Margem <strong>{data.kpis.receita ? `${((data.kpis.lucro / data.kpis.receita) * 100).toFixed(1)}%` : '—'}</strong></p>
          <p>Período <strong>{data.financeBar[0]?.name || 'Período'}</strong></p>
        </div>
        {data.kpis.receita || data.kpis.custos ? (
          <div role="button" tabIndex={0} onClick={() => onNavigate('/financeiro')} onKeyDown={(e) => e.key === 'Enter' && onNavigate('/financeiro')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.financeBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--code-border)" />
              <XAxis dataKey="name" stroke="var(--code-muted)" />
              <YAxis stroke="var(--code-muted)" />
              <Tooltip {...TT} />
              <Legend />
              <Bar dataKey="Receita" fill="#16a34a" cursor="pointer" />
              <Bar dataKey="Custos" fill="#dc2626" cursor="pointer" />
              <Bar dataKey="Lucro" name="Resultado líquido" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        ) : <EmptyChart />}
      </div>
    )
  }
  if (id === 'receita_produto') return <Donut data={data.receitaProduto} onSlice={() => onNavigate('/financeiro')} />
  if (id === 'despesas_cat') return <Donut data={data.despesasCat} onSlice={() => onNavigate('/financeiro')} />
  if (id === 'comissao_produto') return <Donut data={data.comissaoProduto} />
  return <EmptyChart />
}
