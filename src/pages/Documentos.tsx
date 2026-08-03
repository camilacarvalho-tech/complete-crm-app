import { useState, useEffect } from 'react'
import { FileText, Plus, Download, Upload, PenLine, Shield, CheckCircle } from 'lucide-react'
import {
  collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

type TipoDoc = 'contrato' | 'ficha' | 'lgpd' | 'outro'
type StatusAssinatura = 'rascunho' | 'solicitada' | 'assinada'

interface Documento {
  id: string
  titulo: string
  tipo: TipoDoc
  clienteNome?: string
  statusAssinatura: StatusAssinatura
  conteudo?: string
  arquivoNome?: string
  arquivoDataUrl?: string
  criadoEm?: any
}

export default function Documentos() {
  const { empresa, usuario } = useAuth()
  const empresaId = empresa?.id || localStorage.getItem('empresaId') || 'default'
  const [docs, setDocs] = useState<Documento[]>([])
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'contrato' as TipoDoc,
    clienteNome: '',
    conteudo: '',
  })

  useEffect(() => {
    return onSnapshot(collection(db, 'empresas', empresaId, 'documentosCrm'), (snap) => {
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Documento)))
    })
  }, [empresaId])

  const criar = async () => {
    if (!form.titulo.trim()) return
    await addDoc(collection(db, 'empresas', empresaId, 'documentosCrm'), {
      ...form,
      statusAssinatura: 'rascunho',
      criadoPor: usuario?.nome || '',
      criadoEm: serverTimestamp(),
    })
    setForm({ titulo: '', tipo: 'contrato', clienteNome: '', conteudo: '' })
  }

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      await addDoc(collection(db, 'empresas', empresaId, 'documentosCrm'), {
        titulo: file.name,
        tipo: file.name.toLowerCase().includes('lgpd') ? 'lgpd' : 'outro',
        statusAssinatura: 'rascunho',
        arquivoNome: file.name,
        arquivoDataUrl: reader.result,
        criadoPor: usuario?.nome || '',
        criadoEm: serverTimestamp(),
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const solicitarAssinatura = async (id: string) => {
    await updateDoc(doc(db, 'empresas', empresaId, 'documentosCrm', id), { statusAssinatura: 'solicitada' })
  }

  const marcarAssinado = async (id: string) => {
    await updateDoc(doc(db, 'empresas', empresaId, 'documentosCrm', id), {
      statusAssinatura: 'assinada',
      assinadoEm: serverTimestamp(),
      assinadoPor: usuario?.nome || '',
    })
  }

  const gerarPdf = (d: Documento) => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>${d.titulo}</title>
      <style>body{font-family:Georgia,serif;padding:40px;max-width:700px;margin:auto}
      h1{font-size:22px} .meta{color:#666;font-size:12px}</style></head>
      <body><h1>${d.titulo}</h1>
      <p class="meta">Tipo: ${d.tipo} · Cliente: ${d.clienteNome || '—'} · Status: ${d.statusAssinatura}</p>
      <hr/><pre style="white-space:pre-wrap;font-family:inherit">${d.conteudo || 'Documento sem corpo textual.'}</pre>
      <script>window.print()</script></body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-500" /> Documentos
        </h1>
        <p className="text-slate-500 text-sm">Contratos · fichas · LGPD · upload · assinatura · PDF</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
        <h3 className="font-bold dark:text-white flex items-center gap-2"><Plus className="w-4 h-4" /> Novo documento</h3>
        <div className="grid md:grid-cols-4 gap-2">
          <input placeholder="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoDoc })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
            <option value="contrato">Contrato</option>
            <option value="ficha">Ficha cadastral</option>
            <option value="lgpd">LGPD</option>
            <option value="outro">Outro</option>
          </select>
          <input placeholder="Cliente" value={form.clienteNome} onChange={(e) => setForm({ ...form, clienteNome: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
          <button type="button" onClick={criar} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">Criar</button>
        </div>
        <textarea placeholder="Conteúdo / cláusulas" value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
          <Upload className="w-4 h-4" /> Upload arquivo
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg" onChange={upload} />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {docs.map((d) => (
          <div key={d.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold dark:text-white flex items-center gap-2">
                  {d.tipo === 'lgpd' ? <Shield className="w-4 h-4 text-purple-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                  {d.titulo}
                </h3>
                <p className="text-xs text-slate-500 capitalize mt-1">{d.tipo} · {d.clienteNome || 'sem cliente'} · {d.statusAssinatura}</p>
              </div>
              {d.statusAssinatura === 'assinada' && <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={() => gerarPdf(d)} className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 flex items-center gap-1"><Download className="w-3 h-3" /> PDF</button>
              {d.statusAssinatura === 'rascunho' && (
                <button type="button" onClick={() => solicitarAssinatura(d.id)} className="px-2 py-1 text-xs rounded bg-amber-500 text-white flex items-center gap-1"><PenLine className="w-3 h-3" /> Solicitar assinatura</button>
              )}
              {d.statusAssinatura === 'solicitada' && (
                <button type="button" onClick={() => marcarAssinado(d.id)} className="px-2 py-1 text-xs rounded bg-green-500 text-white">Marcar assinada</button>
              )}
              {d.arquivoDataUrl && (
                <a href={d.arquivoDataUrl} download={d.arquivoNome} className="px-2 py-1 text-xs rounded bg-blue-500 text-white">Baixar arquivo</a>
              )}
            </div>
          </div>
        ))}
        {docs.length === 0 && <p className="text-slate-500 text-sm">Nenhum documento ainda</p>}
      </div>
    </div>
  )
}
