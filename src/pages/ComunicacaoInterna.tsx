import { useMemo, useRef, useState } from 'react'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { storage } from '../firebase'
import { EmptyState, ErrorBanner, LoadingBlock, PrimaryButton, TextArea, TextInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'
import { textoMisto } from '../lib/uiPt'
import './chatInterno.css'

const EMOJIS = ['😀', '👍', '🙏', '✅', '💬', '📎']

export default function ComunicacaoInterna() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { conversas, mensagens } = useNexusStore()
  const internas = conversas.items.filter((c) => c.canal === 'interno')
  const [sel, setSel] = useState<string | null>(internas[0]?.id || null)
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [novoAberto, setNovoAberto] = useState(false)
  const [contato, setContato] = useState({ nome: '', sobrenome: '', telefone: '' })
  const [emojis, setEmojis] = useState(false)
  const [gravando, setGravando] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const selected = internas.find((c) => c.id === sel)
  const msgs = useMemo(
    () => mensagens.items.filter((m) => m.conversaId === selected?.id && (!busca || String(m.texto || '').toLowerCase().includes(busca.toLowerCase()))),
    [mensagens.items, selected?.id, busca]
  )

  async function criarContato() {
    const nome = textoMisto(`${contato.nome} ${contato.sobrenome}`.trim())
    if (!nome) {
      toast.error('Informe o nome')
      return
    }
    const id = await conversas.create({
      canal: 'interno',
      titulo: nome,
      telefone: contato.telefone.trim(),
      status: 'aberto',
      grupo: false,
      participantes: [usuario?.id],
    } as any)
    setSel(id)
    setContato({ nome: '', sobrenome: '', telefone: '' })
    setNovoAberto(false)
  }

  async function send(corpo?: string) {
    const mensagem = (corpo ?? texto).trim()
    if (!selected || !mensagem) return
    await mensagens.create({
      conversaId: selected.id,
      texto: mensagem,
      autorId: usuario?.id,
      autorNome: usuario?.nome,
      tipo: 'texto',
      status: 'enviado',
    } as any)
    await conversas.update(selected.id, { lastMessage: mensagem })
    if (!corpo) setTexto('')
  }

  async function anexar(file: File, tipo: 'imagem' | 'audio' | 'documento' | 'video') {
    if (!selected || !usuario?.empresaId) {
      toast.error('Abra uma conversa para enviar')
      return
    }
    const path = `empresas/${usuario.empresaId}/chat-interno/${selected.id}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`
    let arquivoUrl = ''
    try {
      const stored = ref(storage, path)
      await uploadBytes(stored, file)
      arquivoUrl = await getDownloadURL(stored)
    } catch (e) {
      toast.error('Não foi possível guardar o arquivo', e instanceof Error ? e.message : '')
      return
    }
    await mensagens.create({
      conversaId: selected.id,
      texto: file.name,
      tipo,
      arquivoUrl,
      autorId: usuario.id,
      autorNome: usuario.nome,
      status: 'enviado',
    } as any)
    await conversas.update(selected.id, { lastMessage: tipo === 'audio' ? 'Áudio' : 'Foto' })
  }

  async function gravar() {
    if (gravando && recorderRef.current) {
      recorderRef.current.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setGravando(false)
        const blob = new Blob(chunks, { type: 'audio/webm' })
        void anexar(new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' }), 'audio')
      }
      recorderRef.current = rec
      rec.start()
      setGravando(true)
    } catch {
      toast.error('Permita o microfone para enviar áudio')
    }
  }

  if (conversas.loading) return <LoadingBlock />

  return (
    <div className="chat-interno">
      <ErrorBanner message={conversas.error} />
      {novoAberto && (
        <div className="chat-interno-novo">
          <header>
            <button type="button" onClick={() => setNovoAberto(false)} aria-label="Voltar">←</button>
            Novo contato
          </header>
          <form onSubmit={(e) => { e.preventDefault(); void criarContato() }}>
            <label className="text-xs">Nome
              <TextInput value={contato.nome} onChange={(e) => setContato({ ...contato, nome: e.target.value })} />
            </label>
            <label className="text-xs">Sobrenome
              <TextInput value={contato.sobrenome} onChange={(e) => setContato({ ...contato, sobrenome: e.target.value })} />
            </label>
            <label className="text-xs">Telefone
              <TextInput value={contato.telefone} placeholder="Número" onChange={(e) => setContato({ ...contato, telefone: e.target.value })} />
            </label>
            <button type="submit" className="enviar self-start">Salvar contato</button>
          </form>
        </div>
      )}
      <aside>
        <header>
          <div className="flex items-center justify-between">
            <strong>Chat interno</strong>
            <button type="button" className="text-[12px] font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => setNovoAberto(true)}>Criar</button>
          </div>
          <TextInput className="!py-1 !text-xs mt-2" placeholder="Pesquisar" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </header>
        <div className="chat-interno-lista">
          {internas.filter((c, i, arr) => {
            const key = String(c.titulo || '').toLowerCase()
            return arr.findIndex((x) => String(x.titulo || '').toLowerCase() === key) === i
          }).filter((c) => !busca || String(c.titulo || '').toLowerCase().includes(busca.toLowerCase())).map((c) => {
            const nome = textoMisto(String(c.titulo || 'Conversa'))
            return (
              <button key={c.id} type="button" className={sel === c.id ? 'ativa' : ''} onClick={() => setSel(c.id)}>
                <span className="avatar">{nome.slice(0, 1)}</span>
                <span>
                  <b>{nome}</b>
                  <small>{String(c.lastMessage || c.telefone || 'Sem mensagens')}</small>
                </span>
              </button>
            )
          })}
          {internas.length === 0 && (
            <EmptyState title="Nenhuma conversa" description="Toque em Criar para abrir um contato." />
          )}
        </div>
      </aside>
      <section>
        {selected ? (
          <>
            <header className="chat-interno-topo">
              <span className="avatar">{textoMisto(String(selected.titulo || 'C')).slice(0, 1)}</span>
              <div>
                <b>{textoMisto(String(selected.titulo || 'Conversa'))}</b>
                <small>{String(selected.telefone || 'Equipe')}</small>
              </div>
            </header>
            <div className="chat-interno-msgs">
              {msgs.map((m) => {
                const minha = String(m.autorId || '') === String(usuario?.id || '')
                return (
                  <div key={m.id} className={minha ? 'bolha sai' : 'bolha entra'}>
                    {!minha && <small>{textoMisto(String(m.autorNome || ''))}</small>}
                    {String(m.tipo) === 'imagem' && m.arquivoUrl ? <img src={String(m.arquivoUrl)} alt="" className="max-h-40 rounded" /> : null}
                    {String(m.tipo) === 'audio' && m.arquivoUrl ? <audio controls src={String(m.arquivoUrl)} /> : null}
                    {String(m.tipo) !== 'imagem' && String(m.tipo) !== 'audio' && <p>{String(m.texto || '')}</p>}
                  </div>
                )
              })}
              {msgs.length === 0 && <p className="vazio">Nenhuma mensagem ainda.</p>}
            </div>
            <form className="chat-interno-composer" onSubmit={(e) => { e.preventDefault(); void send() }}>
              <div className="flex-1">
                <TextArea
                  rows={2}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                />
                <div className="chat-interno-tools mt-1">
                  <button type="button" onClick={() => setEmojis((v) => !v)}>Emoji</button>
                  <label className="cursor-pointer font-semibold" style={{ color: 'var(--code-orange)' }}>
                    Imagem
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && void anexar(e.target.files[0], 'imagem')} />
                  </label>
                  <label className="cursor-pointer font-semibold">
                    Documento
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && void anexar(e.target.files[0], 'documento')} />
                  </label>
                  <label className="cursor-pointer font-semibold">
                    Vídeo
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && void anexar(e.target.files[0], 'video')} />
                  </label>
                  <button type="button" className="font-semibold" onClick={() => void gravar()}>{gravando ? 'Parar áudio' : 'Áudio'}</button>
                  {emojis && EMOJIS.map((em) => (
                    <button key={em} type="button" onClick={() => setTexto((t) => `${t}${em}`)}>{em}</button>
                  ))}
                </div>
              </div>
              <PrimaryButton type="submit">Enviar</PrimaryButton>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="Selecione uma conversa" description="Ou toque em Criar para um contato novo." />
          </div>
        )}
      </section>
    </div>
  )
}
