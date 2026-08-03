import { useState, useEffect, useMemo } from 'react'
import {
  CheckSquare, Plus, Trash2, Calendar, List, Columns3,
  Clock, Bell, CheckCircle, User, Flag
} from 'lucide-react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../components/ui/Toast'

type Prioridade = 'baixa' | 'media' | 'alta'
type StatusTarefa = 'pendente' | 'em_andamento' | 'concluida'
type ViewMode = 'lista' | 'calendario' | 'kanban'

interface Tarefa {
  id: string
  titulo: string
  descricao?: string
  prioridade: Prioridade
  responsavel: string
  clienteNome?: string
  dataRetorno: string
  horaRetorno?: string
  status: StatusTarefa
  lembrarEm?: string
}

const prioridadeCor: Record<Prioridade, string> = {
  baixa: 'bg-slate-400',
  media: 'bg-code-warning',
  alta: 'bg-code-danger',
}

export default function Tarefas() {
  const { empresa, usuario, user } = useAuth()
  const { darkMode } = useTheme()
  const toast = useToast()
  const empresaId = empresa?.id || usuario?.empresaId || ''
  const nomeUsuario = usuario?.nome || user?.displayName || 'Atendente'

  const [view, setView] = useState<ViewMode>('lista')
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [lembretes, setLembretes] = useState<Tarefa[]>([])
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media' as Prioridade,
    responsavel: nomeUsuario,
    clienteNome: '',
    dataRetorno: new Date().toISOString().slice(0, 10),
    horaRetorno: '09:00',
    lembrarEm: '',
  })

  useEffect(() => {
    if (!empresaId) {
      setTarefas([])
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      collection(db, 'empresas', empresaId, 'tarefas'),
      (snap) => {
        setTarefas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tarefa)))
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setLoading(false)
        toast.error('Erro ao carregar tarefas')
      }
    )
    return () => unsub()
  }, [empresaId])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setLembretes(
        tarefas.filter((t) => {
          if (t.status === 'concluida' || !t.lembrarEm) return false
          return new Date(t.lembrarEm) <= now
        })
      )
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [tarefas])

  const criar = async () => {
    if (!form.titulo.trim() || !empresaId) {
      toast.warning('Preencha o título da tarefa')
      return
    }
    try {
      await addDoc(collection(db, 'empresas', empresaId, 'tarefas'), {
        titulo: form.titulo.trim(),
        descricao: form.descricao,
        prioridade: form.prioridade,
        responsavel: form.responsavel || nomeUsuario,
        clienteNome: form.clienteNome,
        dataRetorno: form.dataRetorno,
        horaRetorno: form.horaRetorno,
        status: 'pendente',
        lembrarEm: form.lembrarEm || null,
        criadoEm: serverTimestamp(),
        criadoPor: nomeUsuario,
        empresaId,
      })
      setForm({
        titulo: '',
        descricao: '',
        prioridade: 'media',
        responsavel: nomeUsuario,
        clienteNome: '',
        dataRetorno: new Date().toISOString().slice(0, 10),
        horaRetorno: '09:00',
        lembrarEm: '',
      })
      toast.success('Tarefa criada!')
    } catch {
      toast.error('Não foi possível criar a tarefa')
    }
  }

  const setStatus = async (id: string, status: StatusTarefa) => {
    if (!empresaId) return
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'tarefas', id), {
        status,
        atualizadoEm: serverTimestamp(),
      })
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const remover = async (id: string) => {
    if (!empresaId) return
    try {
      await deleteDoc(doc(db, 'empresas', empresaId, 'tarefas', id))
      toast.success('Tarefa removida')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const listaDia = tarefas.filter((t) => t.dataRetorno === hoje)

  const diasDoMes = useMemo(() => {
    const y = mesAtual.getFullYear()
    const m = mesAtual.getMonth()
    const first = new Date(y, m, 1).getDay()
    const days = new Date(y, m + 1, 0).getDate()
    const cells: Array<{ day: number | null; dateStr: string }> = []
    for (let i = 0; i < first; i++) cells.push({ day: null, dateStr: '' })
    for (let d = 1; d <= days; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, dateStr })
    }
    return cells
  }, [mesAtual])

  const card = (t: Tarefa) => (
    <div key={t.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${prioridadeCor[t.prioridade]}`} />
            <h4 className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t.titulo}</h4>
          </div>
          {t.clienteNome && <p className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{t.clienteNome}</p>}
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" /> {t.dataRetorno} {t.horaRetorno || ''} · {t.responsavel}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {t.status !== 'concluida' && (
            <button type="button" onClick={() => setStatus(t.id, 'concluida')} className="p-1 text-green-500" title="Concluir">
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={() => remover(t.id)} className="p-1 text-red-400" title="Excluir">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {t.status !== 'concluida' && (
        <div className="flex gap-1 mt-2">
          {(['pendente', 'em_andamento', 'concluida'] as StatusTarefa[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(t.id, s)}
              className={`text-[10px] px-2 py-0.5 rounded ${t.status === s ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            <CheckSquare className="w-8 h-8 text-code-primary" /> Agenda Inteligente
          </h1>
          <p className="text-slate-500 text-sm">Lista · Calendário · Kanban · Lembretes</p>
        </div>
        <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
          {([
            ['lista', List, 'Lista'],
            ['calendario', Calendar, 'Calendário'],
            ['kanban', Columns3, 'Kanban'],
          ] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${view === id ? 'bg-white dark:bg-slate-700 shadow font-semibold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {lembretes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5" /> Lembretes ({lembretes.length})
          </h3>
          {lembretes.map((t) => (
            <div key={t.id} className="text-sm text-amber-900 dark:text-amber-100 py-1 flex justify-between">
              <span>{t.titulo}</span>
              <button type="button" className="text-xs underline" onClick={() => setStatus(t.id, 'concluida')}>Dispensar</button>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-xl p-4 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          <Plus className="w-4 h-4" /> Nova tarefa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Título *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm dark:text-white" />
          <input placeholder="Cliente vinculado" value={form.clienteNome} onChange={(e) => setForm({ ...form, clienteNome: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm dark:text-white" />
          <input placeholder="Responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm dark:text-white" />
          <input type="date" value={form.dataRetorno} onChange={(e) => setForm({ ...form, dataRetorno: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm dark:text-white" />
          <input type="time" value={form.horaRetorno} onChange={(e) => setForm({ ...form, horaRetorno: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm dark:text-white" />
          <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value as Prioridade })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm dark:text-white">
            <option value="baixa">Prioridade baixa</option>
            <option value="media">Prioridade média</option>
            <option value="alta">Prioridade alta</option>
          </select>
          <input type="datetime-local" value={form.lembrarEm} onChange={(e) => setForm({ ...form, lembrarEm: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm dark:text-white md:col-span-2" />
          <button type="button" onClick={criar} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> Criar
          </button>
        </div>
      </div>

      {view === 'lista' && (
        <div className="space-y-4">
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Lista diária ({hoje})</h3>
          <div className="grid gap-2">{listaDia.length ? listaDia.map(card) : <p className="text-slate-500 text-sm">Nenhuma tarefa para hoje</p>}</div>
          <h3 className={`font-bold mt-6 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Todas</h3>
          <div className="grid gap-2 md:grid-cols-2">{tarefas.map(card)}</div>
        </div>
      )}

      {view === 'calendario' && (
        <div className={`rounded-xl p-4 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <button type="button" className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700" onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))}>←</button>
            <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <button type="button" className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700" onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))}>→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 mb-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {diasDoMes.map((c, i) => {
              const dayTasks = c.dateStr ? tarefas.filter((t) => t.dataRetorno === c.dateStr) : []
              return (
                <div key={i} className={`min-h-[72px] p-1 rounded border text-left ${c.dateStr === hoje ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'} ${!c.day ? 'opacity-30' : ''}`}>
                  <div className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>{c.day || ''}</div>
                  {dayTasks.slice(0, 2).map((t) => (
                    <div key={t.id} className="text-[10px] truncate bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded px-0.5 mt-0.5">{t.titulo}</div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {([
            ['pendente', 'Pendente'],
            ['em_andamento', 'Em andamento'],
            ['concluida', 'Concluída'],
          ] as const).map(([status, label]) => (
            <div key={status} className="w-80 shrink-0 bg-slate-100 dark:bg-slate-900 rounded-xl p-3">
              <div className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
                <Flag className="w-4 h-4" /> {label}
                <span className="text-xs text-slate-500 ml-auto">{tarefas.filter((t) => t.status === status).length}</span>
              </div>
              <div className="space-y-2">{tarefas.filter((t) => t.status === status).map(card)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
