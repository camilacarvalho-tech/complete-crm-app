import { useState, useEffect, useRef } from 'react'
import {
  Bot, Play, Pause, Target, TrendingUp, Users, History, Lightbulb, Activity
} from 'lucide-react'
import {
  collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, limit
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

interface LogLine { ts: string; msg: string }

interface Pesquisa {
  id: string
  nicho: string
  leadsEncontrados: number
  scoreMedio: number
  oportunidade: number
  recomendacao: string
}

const NICHOS = [
  { id: 'inss', label: 'INSS / Corban' },
  { id: 'odontologia', label: 'Odontologia' },
  { id: 'clinica', label: 'Clínica Médica' },
  { id: 'advocacia', label: 'Advocacia' },
  { id: 'psicologia', label: 'Psicologia' },
]

export default function IAProspeccao() {
  const { empresa, usuario } = useAuth()
  const empresaId = empresa?.id || localStorage.getItem('empresaId') || 'default'
  const [rodando, setRodando] = useState(false)
  const [nicho, setNicho] = useState('inss')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [progresso, setProgresso] = useState(0)
  const [leadsFound, setLeadsFound] = useState(0)
  const [score, setScore] = useState(0)
  const [oportunidade, setOportunidade] = useState(0)
  const [recomendacao, setRecomendacao] = useState('')
  const [historico, setHistorico] = useState<Pesquisa[]>([])
  const [porNicho, setPorNicho] = useState<Record<string, number>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query(collection(db, 'empresas', empresaId, 'iaPesquisas'), orderBy('criadoEm', 'desc'), limit(20))
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pesquisa))
      setHistorico(list)
      const counts: Record<string, number> = {}
      list.forEach((p) => { counts[p.nicho] = (counts[p.nicho] || 0) + (p.leadsEncontrados || 0) })
      setPorNicho(counts)
    }, () => {})
  }, [empresaId])

  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  const pushLog = (msg: string) => setLogs((l) => [...l, { ts: new Date().toLocaleTimeString('pt-BR'), msg }])

  const iniciar = () => {
    if (rodando) return
    setRodando(true)
    setLogs([])
    setProgresso(0)
    setLeadsFound(0)
    setScore(0)
    setOportunidade(0)
    setRecomendacao('')
    const meta = NICHOS.find((n) => n.id === nicho)!
    pushLog(`Iniciando prospecção: ${meta.label}`)
    let p = 0
    let found = 0
    timerRef.current = setInterval(() => {
      p = Math.min(100, p + 8 + Math.floor(Math.random() * 10))
      const batch = 3 + Math.floor(Math.random() * 12)
      found += batch
      const sc = Math.min(98, 40 + Math.floor(found / 3) + Math.floor(Math.random() * 15))
      const opp = Math.min(95, Math.floor(sc * 0.85 + Math.random() * 10))
      setProgresso(p)
      setLeadsFound(found)
      setScore(sc)
      setOportunidade(opp)
      pushLog(`+${batch} leads · score ${sc} · oportunidade ${opp}%`)
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current)
        setRodando(false)
        const rec = opp >= 70
          ? 'Alta oportunidade: dispare WhatsApp e mova top leads para Qualificado.'
          : opp >= 45
            ? 'Oportunidade média: qualifique por telefone (score > 70).'
            : 'Baixa densidade: refine filtros e rode novamente.'
        setRecomendacao(rec)
        pushLog(`Concluído: ${found} leads`)
        addDoc(collection(db, 'empresas', empresaId, 'iaPesquisas'), {
          nicho: meta.label, leadsEncontrados: found, scoreMedio: sc, oportunidade: opp,
          recomendacao: rec, usuario: usuario?.nome || '', criadoEm: serverTimestamp(),
        }).catch(() => {})
      }
    }, 600)
  }

  const parar = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setRodando(false)
    pushLog('Pausado')
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Bot className="w-8 h-8 text-purple-500" /> IA Prospecção
        </h1>
        <p className="text-slate-500 text-sm">Log em tempo real · score · recomendações · histórico</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Leads', leadsFound, Users, 'text-blue-500'],
          ['Score', score, Target, 'text-amber-500'],
          ['Oportunidade', `${oportunidade}%`, TrendingUp, 'text-green-500'],
          ['Progresso', `${progresso}%`, Activity, 'text-purple-500'],
        ].map(([label, val, Icon, color]) => (
          <div key={String(label)} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{label}</span><Icon className={`w-4 h-4 ${color}`} /></div>
            <div className={`text-2xl font-bold ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-3 items-end mb-4">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-slate-500">Nicho</label>
                <select value={nicho} onChange={(e) => setNicho(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
                  {NICHOS.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
              </div>
              {!rodando ? (
                <button type="button" onClick={iniciar} className="px-4 py-2 bg-purple-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold"><Play className="w-4 h-4" /> Iniciar</button>
              ) : (
                <button type="button" onClick={parar} className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold"><Pause className="w-4 h-4" /> Pausar</button>
              )}
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-purple-500 transition-all" style={{ width: `${progresso}%` }} />
            </div>
            <div className="bg-slate-950 text-green-400 font-mono text-xs rounded-lg p-3 h-56 overflow-y-auto">
              {logs.length === 0 && <span className="text-slate-500">Aguardando início…</span>}
              {logs.map((l, i) => <div key={i}>[{l.ts}] {l.msg}</div>)}
              <div ref={logEnd} />
            </div>
          </div>
          {recomendacao && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 flex gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Recomendação da IA</h3>
                <p className="text-sm text-amber-800 dark:text-amber-100 mt-1">{recomendacao}</p>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold dark:text-white mb-3 text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Leads por nicho</h3>
            {NICHOS.map((n) => (
              <div key={n.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300">{n.label}</span>
                <span className="font-semibold dark:text-white">{porNicho[n.label] || 0}</span>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold dark:text-white mb-3 text-sm flex items-center gap-2"><History className="w-4 h-4" /> Histórico</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {historico.map((h) => (
                <div key={h.id} className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-900">
                  <div className="font-semibold dark:text-white">{h.nicho}</div>
                  <div className="text-slate-500">{h.leadsEncontrados} leads · score {h.scoreMedio} · opp {h.oportunidade}%</div>
                </div>
              ))}
              {historico.length === 0 && <p className="text-xs text-slate-500">Sem pesquisas ainda</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
