import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, Users, DollarSign, Target, Award,
  AlertCircle, Activity, Calendar, Phone, ArrowUp
} from 'lucide-react'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { PIPELINE_ETAPAS } from '../constants/pipeline'

interface ClienteDoc {
  id: string
  nome: string
  pipeline?: string
  status?: string
  atendente?: string
  responsavel?: string
  origem?: string
  valorProposta?: number
  criadoEm?: any
  dataRetorno?: string
}

interface TarefaDoc {
  id: string
  nomeCliente?: string
  titulo?: string
  dataRetorno?: string
  horaRetorno?: string
  prioridade?: string
  status?: string
}

export default function Dashboard() {
  const { empresa, usuario } = useAuth()
  const empresaId = empresa?.id || usuario?.empresaId || ''
  const [clientes, setClientes] = useState<ClienteDoc[]>([])
  const [tarefas, setTarefas] = useState<TarefaDoc[]>([])
  const [metaMes, setMetaMes] = useState(200000)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!empresaId) return
    const saved = localStorage.getItem(`nexus_meta_${empresaId}`)
    if (saved) setMetaMes(Number(saved) || 200000)
  }, [empresaId])

  useEffect(() => {
    if (!empresaId) {
      setClientes([])
      setTarefas([])
      setLoading(false)
      return
    }
    const unsubC = onSnapshot(collection(db, 'empresas', empresaId, 'clientes'), (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClienteDoc)))
      setLoading(false)
    }, () => setLoading(false))

    const unsubT = onSnapshot(
      query(collection(db, 'empresas', empresaId, 'tarefas'), orderBy('dataRetorno', 'asc'), limit(50)),
      (snap) => setTarefas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TarefaDoc))),
      () => {
        onSnapshot(collection(db, 'empresas', empresaId, 'anotacoes'), (snap) => {
          setTarefas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TarefaDoc)))
        })
      }
    )
    return () => { unsubC(); unsubT() }
  }, [empresaId])

  const hoje = new Date().toISOString().slice(0, 10)

  const stats = useMemo(() => {
    const realizados = clientes
      .filter((c) => (c.pipeline || c.status) === 'Pago')
      .reduce((s, c) => s + Number(c.valorProposta || 0), 0)
    const pipelineValor = clientes.reduce((s, c) => s + Number(c.valorProposta || 0), 0)
    const leads = clientes.filter((c) => {
      const e = c.pipeline || c.status || ''
      return e === 'Novo Lead' || e === 'Lead'
    }).length
    const pagos = clientes.filter((c) => (c.pipeline || c.status) === 'Pago').length
    const conversao = clientes.length ? (pagos / clientes.length) * 100 : 0
    return { realizados, pipelineValor, leads, pagos, conversao, total: clientes.length }
  }, [clientes])

  const progressoMeta = Math.min(100, Math.round((stats.realizados / metaMes) * 100))

  const ranking = useMemo(() => {
    const map = new Map<string, { nome: string; pagos: number; valor: number; total: number }>()
    clientes.forEach((c) => {
      const nome = c.atendente || c.responsavel || 'Sem responsável'
      const cur = map.get(nome) || { nome, pagos: 0, valor: 0, total: 0 }
      cur.total++
      if ((c.pipeline || c.status) === 'Pago') {
        cur.pagos++
        cur.valor += Number(c.valorProposta || 0)
      }
      map.set(nome, cur)
    })
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor).slice(0, 5)
  }, [clientes])

  const ultimosLeads = useMemo(() => {
    return [...clientes]
      .sort((a, b) => {
        const ta = a.criadoEm?.toMillis?.() || 0
        const tb = b.criadoEm?.toMillis?.() || 0
        return tb - ta
      })
      .slice(0, 6)
  }, [clientes])

  const agendaHoje = tarefas.filter((t) => t.dataRetorno === hoje && t.status !== 'concluida')
  const proximosRetornos = tarefas
    .filter((t) => t.dataRetorno && t.dataRetorno >= hoje && t.status !== 'concluida')
    .slice(0, 6)

  const emAtraso = clientes.filter((c) => {
    const etapa = c.pipeline || c.status || ''
    return ['Negociação', 'Proposta', 'Contrato'].includes(etapa) && c.dataRetorno && c.dataRetorno < hoje
  })

  const conversaoPorOrigem = useMemo(() => {
    const map = new Map<string, { total: number; pagos: number }>()
    clientes.forEach((c) => {
      const o = c.origem || 'Outros'
      const cur = map.get(o) || { total: 0, pagos: 0 }
      cur.total++
      if ((c.pipeline || c.status) === 'Pago') cur.pagos++
      map.set(o, cur)
    })
    return Array.from(map.entries()).map(([origem, v]) => ({
      origem,
      ...v,
      taxa: v.total ? Math.round((v.pagos / v.total) * 100) : 0,
    }))
  }, [clientes])

  const funnel = PIPELINE_ETAPAS.map((stage) => ({
    stage,
    count: clientes.filter((c) => (c.pipeline || c.status) === stage).length,
  }))

  const salvarMeta = (v: number) => {
    setMetaMes(v)
    localStorage.setItem(`nexus_meta_${empresaId}`, String(v))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Carregando dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-slate-500">Olá, {usuario?.nome || 'equipe'} · dados em tempo real</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Meta do mês R$</span>
          <input
            type="number"
            value={metaMes}
            onChange={(e) => salvarMeta(Number(e.target.value) || 0)}
            className="w-32 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita fechada (Pago)', value: `R$ ${stats.realizados.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-green-500' },
          { label: 'Leads ativos', value: String(stats.leads), icon: Users, color: 'text-blue-500' },
          { label: 'Clientes no CRM', value: String(stats.total), icon: Activity, color: 'text-purple-500' },
          { label: 'Taxa conversão', value: `${stats.conversao.toFixed(1)}%`, icon: Target, color: 'text-orange-500' },
        ].map((k) => (
          <div key={k.label} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{k.label}</span>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Meta */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" /> Meta do mês
          </h3>
          <span className="text-sm font-semibold text-blue-600">{progressoMeta}%</span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${progressoMeta}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          R$ {stats.realizados.toLocaleString('pt-BR')} de R$ {metaMes.toLocaleString('pt-BR')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Ranking dos vendedores
          </h3>
          <div className="space-y-3">
            {ranking.length === 0 && <p className="text-sm text-slate-500">Sem dados ainda</p>}
            {ranking.map((r, i) => (
              <div key={r.nome} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{r.nome}</div>
                  <div className="text-xs text-slate-500">{r.pagos} pagos · {r.total} leads</div>
                </div>
                <div className="text-sm font-bold text-green-600">R$ {r.valor.toLocaleString('pt-BR')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos leads */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-green-500" /> Últimos leads cadastrados
          </h3>
          <div className="space-y-2">
            {ultimosLeads.map((c) => (
              <div key={c.id} className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="font-medium text-slate-800 dark:text-slate-200">{c.nome}</span>
                <span className="text-xs text-slate-500">{c.pipeline || c.status || '—'}</span>
              </div>
            ))}
            {ultimosLeads.length === 0 && <p className="text-sm text-slate-500">Nenhum lead</p>}
          </div>
        </div>

        {/* Agenda do dia */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Agenda do dia
          </h3>
          {agendaHoje.length === 0 ? (
            <p className="text-sm text-slate-500">Nada agendado para hoje</p>
          ) : (
            agendaHoje.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm py-2 border-b border-slate-100 dark:border-slate-700">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="flex-1 text-slate-800 dark:text-slate-200">{t.titulo || t.nomeCliente}</span>
                <span className="text-xs text-slate-500">{t.horaRetorno || ''}</span>
              </div>
            ))
          )}
        </div>

        {/* Próximos retornos + atraso */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-500" /> Próximos retornos
            </h3>
            {proximosRetornos.length === 0 ? (
              <p className="text-sm text-slate-500">Sem retornos agendados</p>
            ) : (
              proximosRetornos.map((t) => (
                <div key={t.id} className="text-sm py-1.5 flex justify-between border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-800 dark:text-slate-200">{t.titulo || t.nomeCliente}</span>
                  <span className="text-xs text-slate-500">{t.dataRetorno} {t.horaRetorno || ''}</span>
                </div>
              ))
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" /> Negócios em atraso
            </h3>
            {emAtraso.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum atraso</p>
            ) : (
              emAtraso.slice(0, 5).map((c) => (
                <div key={c.id} className="text-sm py-1 flex justify-between text-red-600">
                  <span>{c.nome}</span>
                  <span className="text-xs">{c.pipeline}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Funil + conversões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Funil do pipeline</h3>
          <div className="space-y-2">
            {funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3 text-sm">
                <span className="w-32 text-slate-600 dark:text-slate-400 truncate">{f.stage}</span>
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${stats.total ? (f.count / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right font-semibold text-slate-800 dark:text-white">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Conversão por origem</h3>
          <div className="space-y-2">
            {conversaoPorOrigem.map((o) => (
              <div key={o.origem} className="flex justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300">{o.origem}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {o.taxa}% <span className="text-xs text-slate-500 font-normal">({o.pagos}/{o.total})</span>
                </span>
              </div>
            ))}
            {conversaoPorOrigem.length === 0 && <p className="text-sm text-slate-500">Sem dados</p>}
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">Conversão por vendedor</h3>
          {ranking.map((r) => (
            <div key={r.nome} className="flex justify-between text-sm py-1">
              <span className="text-slate-700 dark:text-slate-300">{r.nome}</span>
              <span className="font-semibold">{r.total ? Math.round((r.pagos / r.total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
