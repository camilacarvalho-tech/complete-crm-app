import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { EmptyState, ErrorBanner, GhostButton, LoadingBlock, PageHeader, PrimaryButton, TextInput } from '../components/nexus/kit'

export default function ComunicacaoInterna() {
  const { usuario } = useAuth()
  const { conversas, mensagens, usuariosEmpresa } = useNexusStore()
  const internas = conversas.items.filter((c) => c.canal === 'interno')
  const [sel, setSel] = useState<string | null>(internas[0]?.id || null)
  const [texto, setTexto] = useState('')
  const [grupo, setGrupo] = useState('')
  const [busca, setBusca] = useState('')
  const selected = internas.find((c) => c.id === sel)
  const msgs = useMemo(
    () => mensagens.items.filter((m) => m.conversaId === selected?.id && (!busca || String(m.texto || '').toLowerCase().includes(busca.toLowerCase()))),
    [mensagens.items, selected?.id, busca]
  )

  async function nova(titulo: string, grupoSetor?: boolean) {
    const id = await conversas.create({
      canal: 'interno',
      titulo,
      status: 'aberto',
      grupo: !!grupoSetor,
      participantes: [usuario?.id],
    } as any)
    setSel(id)
  }

  async function send() {
    if (!selected || !texto.trim()) return
    await mensagens.create({
      conversaId: selected.id,
      texto,
      autorId: usuario?.id,
      autorNome: usuario?.nome,
      tipo: 'texto',
      status: 'enviado',
      mencoes: [...texto.matchAll(/@([\w.]+)/g)].map((m) => m[1]),
    } as any)
    setTexto('')
  }

  if (conversas.loading) return <LoadingBlock />

  return (
    <div className="space-y-3">
      <PageHeader
        title="Chat interno"
        subtitle="Individual, grupos e equipes. Use @nome para mencionar. Separado do atendimento ao cliente."
        actions={
          <div className="flex gap-2">
            <TextInput placeholder="Nome do grupo / equipe" value={grupo} onChange={(e) => setGrupo(e.target.value)} />
            <PrimaryButton onClick={() => grupo && nova(grupo, true)}>Novo grupo</PrimaryButton>
          </div>
        }
      />
      <ErrorBanner message={conversas.error} />
      <div className="grid lg:grid-cols-[260px_1fr] gap-3 min-h-[65vh]">
        <div className="nexus-card p-2">
          <p className="text-xs font-bold uppercase px-2 mb-2" style={{ color: 'var(--code-muted)' }}>Equipe</p>
          {usuariosEmpresa.items.map((u) => (
            <button key={u.id} className="w-full text-left px-2 py-2 rounded text-sm" onClick={() => nova(String(u.nome || u.email || 'Direto'), false)}>
              {String(u.nome || u.email)} · {String(u.status || 'offline')}
            </button>
          ))}
          {internas.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} className={`w-full text-left px-2 py-2 rounded text-sm ${sel === c.id ? 'bg-[color:var(--code-surface-muted)]' : ''}`}>
              {String(c.titulo)} {c.naoLidas ? `(${c.naoLidas})` : ''}
            </button>
          ))}
          {internas.length === 0 && usuariosEmpresa.items.length === 0 && (
            <EmptyState title="Nenhuma conversa interna" description="Cadastre funcionários em Configurações ou crie um grupo." />
          )}
        </div>
        <div className="nexus-card flex flex-col">
          <div className="p-2 border-b" style={{ borderColor: 'var(--code-border)' }}>
            <TextInput placeholder="Pesquisar mensagens" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {msgs.map((m) => (
              <div key={m.id} className="chat-msg-in rounded-xl px-3 py-2 text-sm max-w-[80%]">
                <p className="text-[10px]" style={{ color: 'var(--code-muted)' }}>{String(m.autorNome)}</p>
                {String(m.texto)}
                <button type="button" className="text-xs ml-2" onClick={() => mensagens.update(m.id, { reacoes: [...((m.reacoes as string[]) || []), '👍'] })}>👍</button>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--code-border)' }}>
            <TextInput value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mensagem · @mencao · anexo no chat clientes" onKeyDown={(e) => e.key === 'Enter' && send()} />
            <GhostButton onClick={() => void send()}>Enviar</GhostButton>
          </div>
        </div>
      </div>
    </div>
  )
}
