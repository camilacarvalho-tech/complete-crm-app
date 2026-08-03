import { useState, useEffect } from 'react'
import {
  Plus, Megaphone, MessageSquare, Mail, Send, Play, Pause,
  Instagram, Facebook, Search, Trash2
} from 'lucide-react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useLeads } from '../contexts/LeadsContext'
import { useToast } from '../components/ui/Toast'

type Canal = 'whatsapp' | 'sms' | 'email' | 'instagram' | 'facebook' | 'google'

interface Campanha {
  id: string
  nome: string
  canal: Canal
  status: 'ativa' | 'pausada' | 'finalizada'
  enviadas: number
  entregues: number
  lidas: number
  respondidas: number
  convertidas: number
  erros: number
  mensagem?: string
  criadoEm?: string
}

const CANAIS: { id: Canal; label: string; icon: typeof Megaphone }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'sms', label: 'SMS', icon: Send },
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'google', label: 'Google', icon: Search },
]

export default function Campanhas() {
  const { empresa, usuario } = useAuth()
  const { leadsParaCampanhas } = useLeads()
  const toast = useToast()
  const empresaId = empresa?.id || usuario?.empresaId || ''
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [filtroCanal, setFiltroCanal] = useState<Canal | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    canal: 'whatsapp' as Canal,
    mensagem: '',
  })

  useEffect(() => {
    if (!empresaId) {
      setCampanhas([])
      return
    }
    const unsub = onSnapshot(
      collection(db, 'empresas', empresaId, 'campanhas'),
      (snap) => {
        setCampanhas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campanha)))
      },
      (err) => {
        console.error(err)
        toast.error('Erro ao carregar campanhas')
      }
    )
    return () => unsub()
  }, [empresaId])

  useEffect(() => {
    if (!showForm) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowForm(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [showForm])

  const filtradas = campanhas.filter((c) => filtroCanal === 'todos' || c.canal === filtroCanal)

  const totais = filtradas.reduce(
    (acc, c) => ({
      enviadas: acc.enviadas + (c.enviadas || 0),
      entregues: acc.entregues + (c.entregues || 0),
      lidas: acc.lidas + (c.lidas || 0),
      respondidas: acc.respondidas + (c.respondidas || 0),
      convertidas: acc.convertidas + (c.convertidas || 0),
      erros: acc.erros + (c.erros || 0),
    }),
    { enviadas: 0, entregues: 0, lidas: 0, respondidas: 0, convertidas: 0, erros: 0 }
  )

  const criar = async () => {
    if (!form.nome.trim() || !empresaId) {
      toast.warning('Informe o nome da campanha')
      return
    }
    const leads = leadsParaCampanhas?.length || 0
    const agora = new Date()
    const payload = {
      nome: form.nome.trim(),
      canal: form.canal,
      mensagem: form.mensagem,
      status: 'ativa' as const,
      enviadas: leads || 0,
      entregues: 0,
      lidas: 0,
      respondidas: 0,
      convertidas: 0,
      erros: 0,
      criadoEm: agora.toLocaleString('pt-BR'),
      criadoPor: usuario?.nome || '',
      criadoEmServer: serverTimestamp(),
      empresaId,
    }
    try {
      await addDoc(collection(db, 'empresas', empresaId, 'campanhas'), payload)
      setForm({ nome: '', canal: 'whatsapp', mensagem: '' })
      setShowForm(false)
      toast.success(`Campanha "${payload.nome}" criada`)
    } catch {
      toast.error('Erro ao criar campanha')
    }
  }

  const toggleStatus = async (c: Campanha) => {
    if (!empresaId) return
    const next = c.status === 'ativa' ? 'pausada' : 'ativa'
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'campanhas', c.id), { status: next })
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const remover = async (id: string) => {
    if (!empresaId) return
    try {
      await deleteDoc(doc(db, 'empresas', empresaId, 'campanhas', id))
      toast.success('Campanha removida')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-code-action" /> Campanhas
          </h1>
          <p className="text-slate-500 text-sm">WhatsApp · SMS · E-mail · Instagram · Facebook · Google</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-action px-4 py-2 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nova campanha
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ['Enviadas', totais.enviadas, 'text-blue-500'],
          ['Entregues', totais.entregues, 'text-cyan-500'],
          ['Lidas', totais.lidas, 'text-purple-500'],
          ['Respondidas', totais.respondidas, 'text-amber-500'],
          ['Convertidas', totais.convertidas, 'text-green-500'],
          ['Erros', totais.erros, 'text-red-500'],
        ].map(([label, val, color]) => (
          <div key={String(label)} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{Number(val).toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setFiltroCanal('todos')} className={`px-3 py-1.5 rounded-lg text-sm ${filtroCanal === 'todos' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>Todos</button>
        {CANAIS.map((c) => (
          <button key={c.id} type="button" onClick={() => setFiltroCanal(c.id)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${filtroCanal === c.id ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
            <c.icon className="w-3.5 h-3.5" /> {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtradas.map((c) => (
          <div key={c.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{c.nome}</h3>
                <p className="text-xs text-slate-500 capitalize">{c.canal} · {c.status}</p>
                {c.criadoEm && (
                  <p className="text-[11px] text-green-600 dark:text-green-400 mt-1 font-semibold">
                    Criada em {c.criadoEm}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => toggleStatus(c)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700" title="Play/Pause">
                  {c.status === 'ativa' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => remover(c.id)} className="p-2 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-bold text-slate-800 dark:text-white">{c.enviadas}</div>enviadas</div>
              <div><div className="font-bold text-slate-800 dark:text-white">{c.entregues}</div>entregues</div>
              <div><div className="font-bold text-slate-800 dark:text-white">{c.lidas}</div>lidas</div>
              <div><div className="font-bold text-slate-800 dark:text-white">{c.respondidas}</div>respondidas</div>
              <div><div className="font-bold text-green-600">{c.convertidas}</div>convertidas</div>
              <div><div className="font-bold text-red-500">{c.erros}</div>erros</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md space-y-3">
            <h3 className="font-bold text-lg dark:text-white">Nova campanha</h3>
            <input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
            <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value as Canal })} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
              {CANAIS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <textarea placeholder="Mensagem" value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
            <p className="text-xs text-slate-500">{leadsParaCampanhas?.length || 0} leads disponíveis no pool (envio stub nesta versão)</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm">Cancelar</button>
              <button type="button" onClick={criar} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
