import { useState, useEffect } from 'react'
import { Zap, Plus, Trash2, Play, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'

type Trigger = 'lead_entrar' | 'mudar_etapa' | 'campanha_finalizar' | 'proposta_vencer'
type Acao = 'whatsapp' | 'tarefa' | 'avisar_vendedor' | 'email' | 'sms' | 'mover_pipeline' | 'remarketing'

interface Automacao {
  id: string
  nome: string
  trigger: Trigger
  acao: Acao
  ativa: boolean
  etapaAlvo?: string
  mensagem?: string
  executadaVezes?: number
}

const TRIGGERS: { id: Trigger; label: string }[] = [
  { id: 'lead_entrar', label: 'Lead entrar no CRM' },
  { id: 'mudar_etapa', label: 'Cliente mudar de etapa' },
  { id: 'campanha_finalizar', label: 'Campanha finalizar' },
  { id: 'proposta_vencer', label: 'Proposta vencer' },
]

const ACOES: { id: Acao; label: string }[] = [
  { id: 'whatsapp', label: 'Enviar WhatsApp' },
  { id: 'tarefa', label: 'Criar tarefa' },
  { id: 'avisar_vendedor', label: 'Avisar vendedor' },
  { id: 'email', label: 'Enviar e-mail' },
  { id: 'sms', label: 'Enviar SMS' },
  { id: 'mover_pipeline', label: 'Mover pipeline' },
  { id: 'remarketing', label: 'Enviar remarketing' },
]

export default function Automacoes() {
  const { empresa, usuario } = useAuth()
  const toast = useToast()
  const empresaId = empresa?.id || usuario?.empresaId || ''
  const [lista, setLista] = useState<Automacao[]>([])
  const [form, setForm] = useState({
    nome: '',
    trigger: 'lead_entrar' as Trigger,
    acao: 'whatsapp' as Acao,
    etapaAlvo: 'Primeiro Contato',
    mensagem: '',
  })

  useEffect(() => {
    if (!empresaId) {
      setLista([])
      return
    }
    return onSnapshot(
      collection(db, 'empresas', empresaId, 'automacoes'),
      (snap) => setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Automacao))),
      (err) => {
        console.error(err)
        toast.error('Erro ao carregar automações')
      }
    )
  }, [empresaId])

  const criar = async () => {
    if (!form.nome.trim() || !empresaId) {
      toast.warning('Informe o nome da automação')
      return
    }
    try {
      await addDoc(collection(db, 'empresas', empresaId, 'automacoes'), {
        ...form,
        nome: form.nome.trim(),
        ativa: true,
        executadaVezes: 0,
        criadoPor: usuario?.nome || '',
        criadoEm: serverTimestamp(),
        empresaId,
      })
      setForm({ nome: '', trigger: 'lead_entrar', acao: 'whatsapp', etapaAlvo: 'Primeiro Contato', mensagem: '' })
      toast.success('Automação criada!')
    } catch {
      toast.error('Erro ao criar')
    }
  }

  const toggle = async (a: Automacao) => {
    if (!empresaId) return
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'automacoes', a.id), { ativa: !a.ativa })
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const remover = async (id: string) => {
    if (!empresaId) return
    try {
      await deleteDoc(doc(db, 'empresas', empresaId, 'automacoes', id))
      toast.success('Removida')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  const testar = async (a: Automacao) => {
    if (!empresaId) return
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'automacoes', a.id), {
        executadaVezes: (a.executadaVezes || 0) + 1,
      })
      toast.info(`Teste: "${a.nome}" → ${ACOES.find((x) => x.id === a.acao)?.label}`)
    } catch {
      toast.error('Erro no teste')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Zap className="w-8 h-8 text-code-warning" /> Central de Automações
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Regras do tipo <strong>quando… então…</strong>: ex. quando o lead muda de etapa no Pipeline, o sistema cria tarefa, avisa o vendedor ou dispara WhatsApp/SMS automaticamente.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-900 dark:text-blue-100">
        <strong>Para que serve?</strong> Evitar trabalho manual. Você define o gatilho (lead novo, mudança de etapa, campanha terminar, proposta vencer) e a ação (WhatsApp, e-mail, SMS, tarefa, mover pipeline, remarketing). O CRM executa sozinho.
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
        <h3 className="font-bold dark:text-white flex items-center gap-2"><Plus className="w-4 h-4" /> Nova automação</h3>
        <div className="grid md:grid-cols-2 gap-2">
          <input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
          <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as Trigger })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
            {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={form.acao} onChange={(e) => setForm({ ...form, acao: e.target.value as Acao })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
            {ACOES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <input placeholder="Etapa alvo (se mover pipeline)" value={form.etapaAlvo} onChange={(e) => setForm({ ...form, etapaAlvo: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
        </div>
        <textarea placeholder="Mensagem / instrução" value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
        <button type="button" onClick={criar} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold">Criar</button>
      </div>

      <div className="space-y-3">
        {lista.map((a) => (
          <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h3 className="font-bold dark:text-white">{a.nome}</h3>
              <p className="text-xs text-slate-500">
                Quando <strong>{TRIGGERS.find((t) => t.id === a.trigger)?.label}</strong>
                {' → '}
                {ACOES.find((x) => x.id === a.acao)?.label}
                {' · '}executada {a.executadaVezes || 0}x
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => toggle(a)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700" title="Ativar/desativar">
                {a.ativa ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
              </button>
              <button type="button" onClick={() => testar(a)} className="p-2 rounded-lg bg-blue-500 text-white" title="Testar"><Play className="w-4 h-4" /></button>
              <button type="button" onClick={() => remover(a.id)} className="p-2 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-slate-500 text-sm">Nenhuma automação criada</p>}
      </div>
    </div>
  )
}
