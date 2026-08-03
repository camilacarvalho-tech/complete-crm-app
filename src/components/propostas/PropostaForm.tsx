import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { useTheme } from '../../contexts/ThemeContext'
import {
  PROPOSTA_TEMPLATES,
  aplicarTemplate,
  type Proposta,
  type PropostaInput,
} from '../../types/proposta.types'

interface Cliente {
  id: string
  nome: string
  modalidade?: string
  valorSolicitado?: string
  email?: string
  whatsapp?: string
}

interface PropostaFormProps {
  proposta?: Proposta | null
  onSalvar: (input: PropostaInput) => Promise<void>
  onCancelar: () => void
}

export default function PropostaForm({ proposta, onSalvar, onCancelar }: PropostaFormProps) {
  const { darkMode } = useTheme()
  const empresaId = localStorage.getItem('empresaId') || 'default'
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    clienteId: proposta?.clienteId || '',
    valor: proposta?.valor?.toString() || '',
    modalidade: proposta?.modalidade || '',
    status: proposta?.status || 'rascunho' as const,
    templateId: proposta?.templateId || 'consignado',
    conteudo: proposta?.conteudo || PROPOSTA_TEMPLATES[0].conteudo,
  })

  useEffect(() => {
    const q = query(collection(db, 'empresas', empresaId, 'clientes'))
    return onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cliente)))
    })
  }, [empresaId])

  const clienteSelecionado = clientes.find((c) => c.id === form.clienteId)

  const aplicarTemplateAtual = (templateId: string, cliente?: Cliente) => {
    const tpl = PROPOSTA_TEMPLATES.find((t) => t.id === templateId) || PROPOSTA_TEMPLATES[0]
    const c = cliente || clienteSelecionado
    const conteudo = aplicarTemplate(tpl.conteudo, {
      cliente: c?.nome || '{{cliente}}',
      valor: form.valor || c?.valorSolicitado || '0,00',
      modalidade: form.modalidade || c?.modalidade || '—',
    })
    setForm((f) => ({ ...f, templateId, conteudo }))
  }

  const handleClienteChange = (clienteId: string) => {
    const c = clientes.find((x) => x.id === clienteId)
    setForm((f) => ({
      ...f,
      clienteId,
      modalidade: c?.modalidade || f.modalidade,
      valor: c?.valorSolicitado?.replace(/[^\d,]/g, '') || f.valor,
    }))
    if (c) aplicarTemplateAtual(form.templateId, c)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clienteId || !clienteSelecionado) return
    setSalvando(true)
    try {
      await onSalvar({
        clienteId: form.clienteId,
        clienteNome: clienteSelecionado.nome,
        valor: parseFloat(form.valor.replace(',', '.')) || 0,
        modalidade: form.modalidade,
        status: form.status,
        templateId: form.templateId,
        conteudo: form.conteudo,
      })
    } finally {
      setSalvando(false)
    }
  }

  const inputClass = `w-full px-3 py-2 rounded-lg border ${
    darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
  }`

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50`}>
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {proposta ? 'Editar proposta' : 'Nova proposta'}
          </h2>
          <button onClick={onCancelar} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Cliente</label>
            <select
              required
              value={form.clienteId}
              onChange={(e) => handleClienteChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Valor (R$)</label>
              <input
                required
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                className={inputClass}
                placeholder="10000,00"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Modalidade</label>
              <input
                value={form.modalidade}
                onChange={(e) => setForm((f) => ({ ...f, modalidade: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Template</label>
              <select
                value={form.templateId}
                onChange={(e) => aplicarTemplateAtual(e.target.value)}
                className={inputClass}
              >
                {PROPOSTA_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PropostaInput['status'] }))}
                className={inputClass}
              >
                <option value="rascunho">Rascunho</option>
                <option value="enviada">Enviada</option>
                <option value="aceita">Aceita</option>
                <option value="recusada">Recusada</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Conteúdo</label>
            <textarea
              required
              rows={10}
              value={form.conteudo}
              onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onCancelar} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#FFA500] to-[#0047FF] text-white font-medium disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
