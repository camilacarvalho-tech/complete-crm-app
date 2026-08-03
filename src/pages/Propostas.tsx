import { useState, useEffect } from 'react'
import { FileSignature, Plus, Eye, Pencil, Trash2, Filter } from 'lucide-react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useTheme } from '../contexts/ThemeContext'
import type { Proposta, PropostaInput, PropostaStatus } from '../types/proposta.types'
import {
  subscribePropostas,
  criarProposta,
  atualizarProposta,
  excluirProposta,
} from '../services/propostas.service'
import PropostaForm from '../components/propostas/PropostaForm'
import PropostaPreview from '../components/propostas/PropostaPreview'

const STATUS_LABELS: Record<PropostaStatus, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  aceita: 'Aceita',
  recusada: 'Recusada',
}

const STATUS_COLORS: Record<PropostaStatus, string> = {
  rascunho: 'bg-slate-500',
  enviada: 'bg-blue-500',
  aceita: 'bg-green-500',
  recusada: 'bg-red-500',
}

export default function Propostas() {
  const { darkMode } = useTheme()
  const empresaId = localStorage.getItem('empresaId') || 'default'
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [filtro, setFiltro] = useState<PropostaStatus | 'todos'>('todos')
  const [modalForm, setModalForm] = useState(false)
  const [editando, setEditando] = useState<Proposta | null>(null)
  const [preview, setPreview] = useState<Proposta | null>(null)
  const [contatos, setContatos] = useState<Record<string, { whatsapp?: string; email?: string }>>({})

  useEffect(() => subscribePropostas(setPropostas), [])

  useEffect(() => {
    const q = query(collection(db, 'empresas', empresaId, 'clientes'))
    return onSnapshot(q, (snap) => {
      const map: Record<string, { whatsapp?: string; email?: string }> = {}
      snap.docs.forEach((d) => {
        const data = d.data()
        map[d.id] = { whatsapp: data.whatsapp, email: data.email }
      })
      setContatos(map)
    })
  }, [empresaId])

  const filtradas = filtro === 'todos' ? propostas : propostas.filter((p) => p.status === filtro)

  const handleSalvar = async (input: PropostaInput) => {
    if (editando) {
      await atualizarProposta(editando.id, input)
    } else {
      await criarProposta(input)
    }
    setModalForm(false)
    setEditando(null)
  }

  const handleMarcarEnviada = async () => {
    if (!preview) return
    await atualizarProposta(preview.id, { status: 'enviada' })
    setPreview(null)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            <FileSignature className="w-8 h-8 text-[#FFA500]" />
            Propostas
          </h1>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Crie, envie e acompanhe propostas comerciais
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalForm(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FFA500] to-[#0047FF] text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          Nova proposta
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Filter className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
        {(['todos', 'rascunho', 'enviada', 'aceita', 'recusada'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filtro === s
                ? 'bg-[#FFA500] text-white'
                : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {s === 'todos' ? 'Todas' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <table className="w-full text-sm">
          <thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
            <tr>
              <th className="text-left p-4">Cliente</th>
              <th className="text-left p-4">Valor</th>
              <th className="text-left p-4">Modalidade</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Data</th>
              <th className="text-right p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={6} className={`p-8 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Nenhuma proposta encontrada.
                </td>
              </tr>
            ) : (
              filtradas.map((p) => (
                <tr key={p.id} className={`border-t ${darkMode ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className={`p-4 font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{p.clienteNome}</td>
                  <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{p.modalidade || '—'}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs text-white ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className={`p-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {p.criadoEm?.toLocaleDateString('pt-BR') || '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setPreview(p)}
                        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 text-[#0047FF]"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditando(p); setModalForm(true) }}
                        className="p-2 rounded-lg hover:bg-orange-100 dark:hover:bg-slate-700 text-[#FFA500]"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.confirm('Excluir proposta?') && excluirProposta(p.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-slate-700 text-red-500"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalForm && (
        <PropostaForm
          proposta={editando}
          onSalvar={handleSalvar}
          onCancelar={() => { setModalForm(false); setEditando(null) }}
        />
      )}

      {preview && (
        <PropostaPreview
          proposta={preview}
          whatsapp={contatos[preview.clienteId]?.whatsapp}
          email={contatos[preview.clienteId]?.email}
          onFechar={() => setPreview(null)}
          onMarcarEnviada={handleMarcarEnviada}
        />
      )}
    </div>
  )
}
