import { useState, useEffect } from 'react'
import {
  Phone, PhoneCall, PhoneOff, Play, Pause, Clock, CheckCircle, XCircle, Users,
  Mic, RefreshCw, ArrowRightLeft, Calendar, Plus
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getEmpresaId, loadLocal, saveLocal, storeKey } from '../utils/localStore'

type StatusChamada = 'na_fila' | 'em_chamada' | 'atendida' | 'nao_atendeu' | 'reagendada' | 'transferida'

interface Chamada {
  id: string
  nome: string
  telefone: string
  status: StatusChamada
  resultado?: string
  duracaoSeg?: number
  gravacaoUrl?: string
  reagendarPara?: string
  transferidoPara?: string
}

export default function Discadora() {
  const { empresa, usuario } = useAuth()
  const empresaId = getEmpresaId(empresa)
  const localKey = storeKey(empresaId, 'chamadas')
  const [ativa, setAtiva] = useState(false)
  const [fila, setFila] = useState<Chamada[]>(() =>
    loadLocal<Chamada[]>(localKey, [
      { id: '1', nome: 'Carlos Mendes', telefone: '(11) 98888-1111', status: 'na_fila' },
      { id: '2', nome: 'Fernanda Lima', telefone: '(11) 97777-2222', status: 'na_fila' },
      { id: '3', nome: 'Roberto Alves', telefone: '(21) 96666-3333', status: 'na_fila' },
    ])
  )
  const [atual, setAtual] = useState<Chamada | null>(null)
  const [segundos, setSegundos] = useState(0)
  const [resultado, setResultado] = useState('')
  const [transferirPara, setTransferirPara] = useState('')
  const [reagendar, setReagendar] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTel, setNovoTel] = useState('')

  useEffect(() => { saveLocal(localKey, fila) }, [fila, localKey])

  useEffect(() => {
    if (!showAdd) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdd(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [showAdd])

  useEffect(() => {
    if (!atual || atual.status !== 'em_chamada') {
      setSegundos(0)
      return
    }
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [atual])

  const naFila = fila.filter((c) => c.status === 'na_fila')
  const historico = fila.filter((c) => !['na_fila', 'em_chamada'].includes(c.status))
  const tempoMedio = (() => {
    const done = historico.filter((c) => c.duracaoSeg)
    if (!done.length) return 0
    return Math.round(done.reduce((s, c) => s + (c.duracaoSeg || 0), 0) / done.length)
  })()

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const iniciarProxima = () => {
    const next = fila.find((c) => c.status === 'na_fila')
    if (!next) {
      setAtiva(false)
      setAtual(null)
      return
    }
    setAtiva(true)
    const emChamada = { ...next, status: 'em_chamada' as const }
    setAtual(emChamada)
    setFila((prev) => prev.map((c) => (c.id === next.id ? emChamada : c)))
    setSegundos(0)
  }

  const finalizar = (status: StatusChamada) => {
    if (!atual) return
    const payload: Chamada = {
      ...atual,
      status,
      resultado: resultado || status,
      duracaoSeg: segundos || 45,
      gravacaoUrl: status === 'atendida' ? `gravacao://${atual.id}` : undefined,
      transferidoPara: status === 'transferida' ? (transferirPara || 'Fila geral') : undefined,
      reagendarPara: status === 'reagendada' ? reagendar : undefined,
    }
    setFila((prev) => prev.map((c) => (c.id === atual.id ? payload : c)))
    setAtual(null)
    setResultado('')
    setTransferirPara('')
    setReagendar('')
    if (ativa) {
      setTimeout(() => iniciarProxima(), 500)
    }
  }

  const addFila = () => {
    if (!novoNome.trim() || !novoTel.trim()) return
    const nova: Chamada = {
      id: 'ch_' + Date.now(),
      nome: novoNome.trim(),
      telefone: novoTel.trim(),
      status: 'na_fila',
    }
    setFila((prev) => [...prev, nova])
    setNovoNome('')
    setNovoTel('')
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Phone className="w-8 h-8 text-green-500" /> Discadora
          </h1>
          <p className="text-slate-500 text-sm">Fila · ligação ao vivo · gravações · transferência · reagendamento</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold flex items-center gap-1 shadow-lg">
            <Plus className="w-4 h-4" /> Contato
          </button>
          {!ativa ? (
            <button type="button" onClick={iniciarProxima} className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Play className="w-4 h-4" /> Iniciar fila
            </button>
          ) : (
            <button type="button" onClick={() => { setAtiva(false); setAtual(null) }} className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Pause className="w-4 h-4" /> Pausar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Na fila" value={naFila.length} icon={Users} />
        <Stat label="Tempo médio" value={`${tempoMedio}s`} icon={Clock} />
        <Stat label="Atendidas" value={historico.filter((c) => c.status === 'atendida').length} icon={CheckCircle} />
        <Stat label="Não atendeu" value={historico.filter((c) => c.status === 'nao_atendeu').length} icon={XCircle} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="font-bold dark:text-white mb-3">Chamada atual</h3>
          {!atual ? (
            <p className="text-sm text-slate-500">Nenhuma chamada em andamento. Clique em <strong>Iniciar fila</strong>.</p>
          ) : (
            <div className="space-y-4">
              {/* Painel ligando */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 to-emerald-800 p-6 text-white text-center">
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <span className="w-40 h-40 rounded-full border-4 border-white animate-ping" />
                </div>
                <div className="relative">
                  <div className="mx-auto w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-3 animate-pulse">
                    <PhoneCall className="w-10 h-10" />
                  </div>
                  <p className="text-sm uppercase tracking-widest text-green-100 mb-1">Ligando para o cliente</p>
                  <h2 className="text-2xl font-black">{atual.nome}</h2>
                  <p className="text-xl font-mono mt-2 tracking-wider">{atual.telefone}</p>
                  <p className="mt-3 text-green-100 flex items-center justify-center gap-2">
                    <Mic className="w-4 h-4 animate-pulse" />
                    Em chamada · {fmt(segundos)}
                  </p>
                  <p className="text-xs text-green-200 mt-1">Atendente: {usuario?.nome || 'Você'}</p>
                </div>
              </div>

              <input
                placeholder="Resultado da ligação"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => finalizar('atendida')} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Atendeu
                </button>
                <button type="button" onClick={() => finalizar('nao_atendeu')} className="px-3 py-2 bg-slate-500 text-white rounded-lg text-sm flex items-center justify-center gap-1">
                  <PhoneOff className="w-4 h-4" /> Não atendeu
                </button>
              </div>
              <div className="flex gap-2">
                <input placeholder="Transferir para" value={transferirPara} onChange={(e) => setTransferirPara(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
                <button type="button" onClick={() => finalizar('transferida')} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input type="datetime-local" value={reagendar} onChange={(e) => setReagendar(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
                <button type="button" onClick={() => finalizar('reagendada')} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm">
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Fila ({naFila.length})</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {naFila.map((c, i) => (
              <div key={c.id} className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <div>
                  <div className="font-semibold dark:text-white">{i + 1}. {c.nome}</div>
                  <div className="text-slate-500 font-mono text-xs">{c.telefone}</div>
                </div>
                <Phone className="w-4 h-4 text-green-500" />
              </div>
            ))}
            {naFila.length === 0 && <p className="text-sm text-slate-500">Fila vazia</p>}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="font-bold dark:text-white mb-3">Histórico / gravações</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2">Nome</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Resultado</th>
                <th>Duração</th>
                <th>Gravação</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700 dark:text-slate-200">
                  <td className="py-2">{c.nome}</td>
                  <td className="font-mono text-xs">{c.telefone}</td>
                  <td className="capitalize">{c.status.replace('_', ' ')}</td>
                  <td>{c.resultado || c.transferidoPara || c.reagendarPara || '—'}</td>
                  <td>{c.duracaoSeg ? `${c.duracaoSeg}s` : '—'}</td>
                  <td>{c.gravacaoUrl ? <span className="text-blue-500 text-xs">Disponível</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm space-y-3">
            <h3 className="font-bold dark:text-white">Adicionar à fila</h3>
            <input placeholder="Nome do contato" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
            <input placeholder="Telefone" value={novoTel} onChange={(e) => setNovoTel(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 text-sm">Cancelar</button>
              <button type="button" onClick={addFila} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Phone }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold dark:text-white">{value}</div>
    </div>
  )
}
