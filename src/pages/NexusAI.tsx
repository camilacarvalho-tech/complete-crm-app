/**
 * Nexus AI V1.0 — UI consumidora da API desacoplada (NexusAI).
 * Chat · Histórico · Memória · Conhecimento · Agentes · Configurações · Logs
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Bot,
  Copy,
  FileText,
  History,
  Brain,
  BookOpen,
  Settings,
  Plus,
  Send,
  Paperclip,
  RefreshCw,
  Square,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Check,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useEmpresaId } from '../hooks/useEmpresaId'
import {
  NexusAI,
  AI_AGENTS,
  listLlmProviders,
  LlmProviderError,
  type AiAnexo,
  type AiAuditLog,
  type AiConfig,
  type AiConhecimentoDoc,
  type AiConversa,
  type AiLog,
  type AiMemoriaItem,
  type AiMensagem,
  type AiAgentId,
  DEFAULT_AI_CONFIG,
} from '../ai'
import { loadLocal, saveLocal, storeKey } from '../utils/localStore'
import { AiMarkdown } from '../components/ai/AiMarkdown'
import '../components/ai/ai-markdown.css'

type TabId = 'chat' | 'historico' | 'memoria' | 'conhecimento' | 'config'

type ConversationPrefs = {
  aliases: Record<string, string>
  hiddenIds: string[]
}

type KnowledgePrefs = {
  categories: Record<string, string>
}

function loadConversationPrefs(empresaId: string): ConversationPrefs {
  return loadLocal<ConversationPrefs>(storeKey(empresaId, 'ai_conversation_prefs'), {
    aliases: {},
    hiddenIds: [],
  })
}

function saveConversationPrefs(empresaId: string, prefs: ConversationPrefs) {
  saveLocal(storeKey(empresaId, 'ai_conversation_prefs'), prefs)
}

function loadKnowledgePrefs(empresaId: string): KnowledgePrefs {
  return loadLocal<KnowledgePrefs>(storeKey(empresaId, 'ai_knowledge_prefs'), { categories: {} })
}

function saveKnowledgePrefs(empresaId: string, prefs: KnowledgePrefs) {
  saveLocal(storeKey(empresaId, 'ai_knowledge_prefs'), prefs)
}

const TABS: { id: TabId; label: string; icon: typeof Bot }[] = [
  { id: 'chat', label: 'Chat', icon: Sparkles },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'memoria', label: 'Memória', icon: Brain },
  { id: 'conhecimento', label: 'Conhecimento', icon: BookOpen },
  { id: 'config', label: 'Configurações', icon: Settings },
]

function BackendBadge() {
  const [up, setUp] = useState<boolean | null>(null)
  useEffect(() => {
    NexusAI.isBackendUp().then(setUp).catch(() => setUp(false))
  }, [])
  const label =
    up === null ? 'Detectando API…' : up ? 'API FastAPI online :8090' : 'API offline · fallback local'
  const cls =
    up === null
      ? 'bg-slate-100 text-slate-500'
      : up
        ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
        : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  return (
    <span className={`ml-auto text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

export default function NexusAIPage() {
  const { user, usuario } = useAuth()
  const empresaId = useEmpresaId()
  const [tab, setTab] = useState<TabId>('chat')

  const actor = useMemo(
    () => ({
      usuarioId: user?.uid || usuario?.id || 'anon',
      usuarioNome: usuario?.nome || user?.email || 'Usuário',
    }),
    [user, usuario]
  )

  if (!empresaId) {
    return (
      <div className="p-8 text-center text-slate-500">
        Empresa não identificada. Faça login ou complete o onboarding para usar a Nexus AI.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-[560px] bg-slate-50 dark:bg-slate-950">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Nexus AI</h1>
            <p className="text-xs text-slate-500">
              v{NexusAI.version} · serviço independente (FastAPI) · OpenAI via LLMProvider
            </p>
          </div>
          <BackendBadge />
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                  active
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </nav>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'chat' && (
          <ChatTab
            empresaId={empresaId}
            actor={actor}
            onOpenHistorico={() => setTab('historico')}
          />
        )}
        {tab === 'historico' && (
          <HistoricoTab
            empresaId={empresaId}
            onOpen={(id) => {
              sessionStorage.setItem('nexus_ai_conversa', id)
              setTab('chat')
            }}
          />
        )}
        {tab === 'memoria' && <MemoriaTab empresaId={empresaId} />}
        {tab === 'conhecimento' && <ConhecimentoTab empresaId={empresaId} />}
        {tab === 'config' && <ConfigTab empresaId={empresaId} />}
      </div>
    </div>
  )
}

/* ───────────── Chat ───────────── */

function ChatTab({
  empresaId,
  actor,
  onOpenHistorico,
}: {
  empresaId: string
  actor: { usuarioId: string; usuarioNome: string }
  onOpenHistorico: () => void
}) {
  const [conversas, setConversas] = useState<AiConversa[]>([])
  const [conversaId, setConversaId] = useState<string | null>(
    () => sessionStorage.getItem('nexus_ai_conversa')
  )
  const [mensagens, setMensagens] = useState<AiMensagem[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [busca, setBusca] = useState('')
  const [anexos, setAnexos] = useState<AiAnexo[]>([])
  const [uploading, setUploading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return NexusAI.subscribeConversas(empresaId, (rows) => {
      const prefs = loadConversationPrefs(empresaId)
      const mapped = rows
        .filter((c) => !c.arquivada && !prefs.hiddenIds.includes(c.id))
        .map((c) => ({ ...c, titulo: prefs.aliases[c.id] || c.titulo }))
      setConversas(mapped)
    })
  }, [empresaId])

  useEffect(() => {
    if (!conversaId) {
      setMensagens([])
      return
    }
    sessionStorage.setItem('nexus_ai_conversa', conversaId)
    return NexusAI.subscribeMensagens(empresaId, conversaId, setMensagens)
  }, [empresaId, conversaId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, streaming])

  const novaConversa = async () => {
    const c = await NexusAI.createConversa(empresaId, actor)
    setConversaId(c.id)
    setError('')
  }

  const enviar = useCallback(
    async (opts?: { regenerar?: boolean }) => {
      const texto = draft.trim()
      if (!opts?.regenerar && !texto && !anexos.length) return
      setBusy(true)
      setError('')
      setStreaming('')
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const result = await NexusAI.streamChat({
          empresaId,
          conversaId: conversaId || undefined,
          mensagem: opts?.regenerar ? '' : texto,
          anexos: opts?.regenerar ? undefined : anexos,
          actor,
          regenerar: opts?.regenerar,
          signal: ac.signal,
          onToken: (chunk) => setStreaming((s) => s + chunk),
        })
        setConversaId(result.conversaId)
        setDraft('')
        setAnexos([])
        setStreaming('')
      } catch (e) {
        if (
          (e instanceof LlmProviderError && e.code === 'aborted') ||
          (e instanceof DOMException && e.name === 'AbortError')
        ) {
          setStreaming('')
        } else {
          setError(e instanceof Error ? e.message : String(e))
          setStreaming('')
        }
      } finally {
        setBusy(false)
        abortRef.current = null
      }
    },
    [draft, anexos, empresaId, conversaId, actor]
  )

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const uploaded: AiAnexo[] = []
      for (const f of Array.from(files)) {
        uploaded.push(await NexusAI.uploadChatAnexo(empresaId, f))
      }
      setAnexos((a) => [...a, ...uploaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  const copyText = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t)
    } catch {
      /* ignore */
    }
  }

  const renomearConversa = (id: string, atual: string) => {
    const next = window.prompt('Novo título da conversa:', atual)?.trim()
    if (!next) return
    const prefs = loadConversationPrefs(empresaId)
    prefs.aliases[id] = next
    saveConversationPrefs(empresaId, prefs)
    setConversas((list) => list.map((c) => (c.id === id ? { ...c, titulo: next } : c)))
  }

  const excluirConversa = (id: string) => {
    if (!window.confirm('Deseja ocultar esta conversa do histórico?')) return
    const prefs = loadConversationPrefs(empresaId)
    prefs.hiddenIds = Array.from(new Set([...prefs.hiddenIds, id]))
    saveConversationPrefs(empresaId, prefs)
    setConversas((list) => list.filter((c) => c.id !== id))
    if (conversaId === id) {
      setConversaId(null)
      sessionStorage.removeItem('nexus_ai_conversa')
    }
  }

  const conversasFiltradas = conversas.filter((c) => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return c.titulo.toLowerCase().includes(q) || c.usuarioNome.toLowerCase().includes(q)
  })

  return (
    <div className="flex h-full">
      {/* sidebar conversas */}
      <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-3 flex gap-2">
          <button
            type="button"
            onClick={novaConversa}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded-lg py-2"
          >
            <Plus className="w-4 h-4" /> Nova
          </button>
          <button
            type="button"
            onClick={onOpenHistorico}
            className="px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500"
            title="Histórico"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
        <div className="px-3 pb-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar conversa..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {conversasFiltradas.map((c) => (
            <div
              key={c.id}
              className={`group w-full text-left px-3 py-2 rounded-lg ${
                conversaId === c.id
                  ? 'bg-teal-50 dark:bg-teal-950/40'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setConversaId(c.id)}
                className="w-full text-left"
              >
                <div
                  className={`font-medium truncate ${
                    conversaId === c.id
                      ? 'text-teal-800 dark:text-teal-200'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {c.titulo}
                </div>
                <div className="text-[10px] text-slate-400">
                  {c.data} {c.hora} · {c.qtdMensagens} msgs
                </div>
              </button>
              <div className="mt-1 hidden group-hover:flex items-center gap-3 text-[11px]">
                <button
                  type="button"
                  className="text-slate-500 hover:text-teal-600"
                  onClick={() => renomearConversa(c.id, c.titulo)}
                >
                  Renomear
                </button>
                <button
                  type="button"
                  className="text-slate-500 hover:text-red-500"
                  onClick={() => excluirConversa(c.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {!conversasFiltradas.length && (
            <p className="text-xs text-slate-400 px-2 py-4">Nenhuma conversa encontrada.</p>
          )}
        </div>
      </aside>

      {/* thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {!mensagens.length && !streaming && (
            <div className="max-w-lg mx-auto text-center pt-16">
              <Bot className="w-12 h-12 mx-auto text-teal-500 mb-3" />
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                Como posso ajudar?
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Assistente Geral da Nexus AI. Configure a chave OpenAI em Configurações para
                respostas reais.
              </p>
            </div>
          )}
          {mensagens.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              onCopy={() => copyText(m.conteudo)}
              onRegenerate={
                m.role === 'assistant'
                  ? () => enviar({ regenerar: true })
                  : undefined
              }
              busy={busy}
            />
          ))}
          {streaming && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
                <AiMarkdown content={streaming} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {anexos.map((a, i) => (
                <span
                  key={`${a.nome}-${i}`}
                  className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full"
                >
                  {a.tipo.startsWith('image/') ? (
                    <ImageIcon className="w-3 h-3" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  {a.nome}
                  <button
                    type="button"
                    className="ml-1 text-slate-400 hover:text-red-500"
                    onClick={() => setAnexos((list) => list.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf,.txt,.doc,.docx,.md"
              onChange={(e) => {
                onPickFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={busy || uploading}
              onClick={() => fileRef.current?.click()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Anexar arquivo ou imagem"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  enviar()
                }
              }}
              rows={1}
              placeholder="Mensagem para a Nexus AI…"
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 max-h-40"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="p-2.5 rounded-xl bg-slate-800 text-white"
                title="Parar"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => enviar()}
                disabled={!draft.trim() && !anexos.length}
                className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  msg,
  onCopy,
  onRegenerate,
  busy,
}: {
  msg: AiMensagem
  onCopy: () => void
  onRegenerate?: () => void
  busy: boolean
}) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = useState(false)
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'rounded-br-md bg-teal-600 text-white'
            : 'rounded-bl-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
        ) : (
          <AiMarkdown content={msg.conteudo} />
        )}
        {msg.anexos?.length ? (
          <div className={`mt-2 space-y-1 ${isUser ? 'text-teal-100' : 'text-slate-500'}`}>
            {msg.anexos.map((a, i) => (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs underline"
              >
                <Paperclip className="w-3 h-3" /> {a.nome}
              </a>
            ))}
          </div>
        ) : null}
        {!isUser && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onCopy()
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copiar
            </button>
            {onRegenerate && (
              <button
                type="button"
                disabled={busy}
                onClick={onRegenerate}
                className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1 disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" /> Regenerar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────── Histórico ───────────── */

function HistoricoTab({
  empresaId,
  onOpen,
}: {
  empresaId: string
  onOpen: (id: string) => void
}) {
  const [rows, setRows] = useState<AiConversa[]>([])
  const [busca, setBusca] = useState('')
  useEffect(
    () =>
      NexusAI.subscribeConversas(empresaId, (items) => {
        const prefs = loadConversationPrefs(empresaId)
        const mapped = items
          .filter((c) => !prefs.hiddenIds.includes(c.id))
          .map((c) => ({ ...c, titulo: prefs.aliases[c.id] || c.titulo }))
        setRows(mapped)
      }),
    [empresaId]
  )

  const renomearConversa = (id: string, atual: string) => {
    const next = window.prompt('Novo título da conversa:', atual)?.trim()
    if (!next) return
    const prefs = loadConversationPrefs(empresaId)
    prefs.aliases[id] = next
    saveConversationPrefs(empresaId, prefs)
    setRows((list) => list.map((r) => (r.id === id ? { ...r, titulo: next } : r)))
  }

  const excluirConversa = (id: string) => {
    if (!window.confirm('Deseja ocultar esta conversa do histórico?')) return
    const prefs = loadConversationPrefs(empresaId)
    prefs.hiddenIds = Array.from(new Set([...prefs.hiddenIds, id]))
    saveConversationPrefs(empresaId, prefs)
    setRows((list) => list.filter((r) => r.id !== id))
  }

  const filtradas = rows.filter((r) => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return (
      r.titulo.toLowerCase().includes(q) ||
      r.usuarioNome.toLowerCase().includes(q) ||
      `${r.data} ${r.hora}`.toLowerCase().includes(q)
    )
  })

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3 max-w-md">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar no histórico..."
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
        />
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Msgs</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtradas.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{r.titulo}</td>
                <td className="px-4 py-3 text-slate-500">{r.usuarioNome}</td>
                <td className="px-4 py-3 text-slate-500">
                  {r.data} {r.hora}
                </td>
                <td className="px-4 py-3">{r.qtdMensagens}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => renomearConversa(r.id, r.titulo)}
                    className="text-slate-500 hover:underline text-xs mr-3"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="text-teal-600 hover:underline text-xs"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => excluirConversa(r.id)}
                    className="text-red-500 hover:underline text-xs ml-3"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtradas.length && (
          <p className="p-6 text-center text-slate-400 text-sm">Nenhuma conversa encontrada.</p>
        )}
      </div>
    </div>
  )
}

/* ───────────── Memória ───────────── */

function MemoriaTab({ empresaId }: { empresaId: string }) {
  const [rows, setRows] = useState<AiMemoriaItem[]>([])
  const [chave, setChave] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<AiMemoriaItem['categoria']>('empresa')
  const [busca, setBusca] = useState('')

  useEffect(() => NexusAI.subscribeMemoria(empresaId, setRows), [empresaId])

  const salvar = async () => {
    if (!chave.trim()) return
    await NexusAI.upsertMemoria(empresaId, { chave: chave.trim(), valor, categoria })
    setChave('')
    setValor('')
  }

  const limparMemoria = async () => {
    if (!rows.length) return
    if (!window.confirm('Limpar toda a memória desta empresa?')) return
    await Promise.all(rows.map((r) => NexusAI.deleteMemoria(empresaId, r.id)))
  }

  const filtradas = rows.filter((r) => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return (
      r.chave.toLowerCase().includes(q) ||
      r.valor.toLowerCase().includes(q) ||
      r.categoria.toLowerCase().includes(q)
    )
  })

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 max-w-3xl">
      <p className="text-sm text-slate-500">
        Informações que a IA usa para personalizar respostas (nome da empresa, segmento,
        preferências).
      </p>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <input
            className="input-ai w-full"
            placeholder="Pesquisar memória..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button
            type="button"
            onClick={limparMemoria}
            className="shrink-0 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm"
          >
            Limpar tudo
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="input-ai"
            placeholder="Chave (ex.: nome_empresa)"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
          />
          <select
            className="input-ai"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as AiMemoriaItem['categoria'])}
          >
            <option value="empresa">Empresa</option>
            <option value="segmento">Segmento</option>
            <option value="preferencia">Preferência</option>
            <option value="configuracao">Configuração</option>
            <option value="outro">Outro</option>
          </select>
          <button
            type="button"
            onClick={salvar}
            className="bg-teal-600 text-white rounded-lg text-sm py-2 hover:bg-teal-500"
          >
            Salvar
          </button>
        </div>
        <textarea
          className="input-ai w-full min-h-[80px]"
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {filtradas.map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3"
          >
            <div>
              <div className="text-xs text-teal-600 uppercase tracking-wide">{r.categoria}</div>
              <div className="font-medium text-slate-800 dark:text-slate-100">{r.chave}</div>
              <div className="text-sm text-slate-500 whitespace-pre-wrap">{r.valor}</div>
            </div>
            <button
              type="button"
              onClick={() => NexusAI.deleteMemoria(empresaId, r.id)}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!filtradas.length && <p className="text-sm text-slate-400">Nenhum item encontrado.</p>}
      </div>
      <style>{`.input-ai{border:1px solid rgb(226 232 240);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;background:transparent}.dark .input-ai{border-color:rgb(51 65 85)}`}</style>
    </div>
  )
}

/* ───────────── Conhecimento ───────────── */

function ConhecimentoTab({ empresaId }: { empresaId: string }) {
  const [rows, setRows] = useState<AiConhecimentoDoc[]>([])
  const [busy, setBusy] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => NexusAI.subscribeConhecimento(empresaId, setRows), [empresaId])

  const [knowledgePrefs, setKnowledgePrefs] = useState<KnowledgePrefs>(() =>
    loadKnowledgePrefs(empresaId)
  )

  useEffect(() => {
    setKnowledgePrefs(loadKnowledgePrefs(empresaId))
  }, [empresaId])

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const f of Array.from(files)) {
        await NexusAI.uploadConhecimento(empresaId, f)
      }
    } finally {
      setBusy(false)
    }
  }

  const setCategoriaDoc = (docId: string, categoria: string) => {
    const next = {
      ...knowledgePrefs,
      categories: {
        ...knowledgePrefs.categories,
        [docId]: categoria,
      },
    }
    setKnowledgePrefs(next)
    saveKnowledgePrefs(empresaId, next)
  }

  const docsFiltrados = rows.filter((r) => {
    const q = busca.trim().toLowerCase()
    const categoriaDoc = knowledgePrefs.categories[r.id] || 'geral'
    const matchBusca =
      !q ||
      r.titulo.toLowerCase().includes(q) ||
      r.nomeArquivo.toLowerCase().includes(q) ||
      (r.conteudoTexto || '').toLowerCase().includes(q)
    const matchCategoria = filtroCategoria === 'todas' || filtroCategoria === categoriaDoc
    return matchBusca && matchCategoria
  })

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 max-w-3xl">
      <p className="text-sm text-slate-500">
        Base de conhecimento: PDF, DOCX e TXT. Na V1, TXT é indexado no prompt; PDF/DOCX ficam
        armazenados para versões futuras.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          upload(e.target.files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-500 disabled:opacity-50"
      >
        {busy ? 'Enviando…' : 'Enviar documento'}
      </button>
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título, arquivo ou conteúdo..."
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="todas">Todas as categorias</option>
          <option value="geral">Geral</option>
          <option value="vendas">Vendas</option>
          <option value="financeiro">Financeiro</option>
          <option value="operacao">Operação</option>
          <option value="juridico">Jurídico</option>
        </select>
      </div>
      <div className="space-y-2">
        {docsFiltrados.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="w-5 h-5 text-teal-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                  {r.titulo}
                </div>
                <div className="text-xs text-slate-400">
                  {r.tipo.toUpperCase()} · {r.status}
                  {r.tamanho ? ` · ${(r.tamanho / 1024).toFixed(1)} KB` : ''}
                </div>
                <div className="mt-1">
                  <select
                    value={knowledgePrefs.categories[r.id] || 'geral'}
                    onChange={(e) => setCategoriaDoc(r.id, e.target.value)}
                    className="rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-1 text-[11px]"
                  >
                    <option value="geral">Geral</option>
                    <option value="vendas">Vendas</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="operacao">Operação</option>
                    <option value="juridico">Jurídico</option>
                  </select>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => NexusAI.deleteConhecimento(empresaId, r.id)}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!docsFiltrados.length && (
          <p className="text-sm text-slate-400">Nenhum documento encontrado.</p>
        )}
      </div>
    </div>
  )
}

/* ───────────── Agentes ───────────── */

function AgentesTab() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
        {AI_AGENTS.map((a) => (
          <div
            key={a.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-slate-800 dark:text-white">{a.nome}</h3>
              <span
                className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  a.status === 'ativo'
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {a.status}
              </span>
            </div>
            <p className="text-sm text-slate-500">{a.descricao}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────── Config ───────────── */

function ConfigTab({ empresaId }: { empresaId: string }) {
  const [cfg, setCfg] = useState<AiConfig>({ ...DEFAULT_AI_CONFIG })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [keyConfigured, setKeyConfigured] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [logs, setLogs] = useState<AiLog[]>([])
  const [audit, setAudit] = useState<AiAuditLog[]>([])
  const keyDirtyRef = useRef(false)
  const providers = listLlmProviders()

  useEffect(() => {
    keyDirtyRef.current = false
    return NexusAI.subscribeConfig(empresaId, (remote) => {
      setKeyConfigured(Boolean(remote.openaiApiKey && remote.openaiApiKey.includes('•')))
      setCfg((local) => {
        if (keyDirtyRef.current) {
          return {
            ...remote,
            openaiApiKey: local.openaiApiKey,
          }
        }
        return remote
      })
    })
  }, [empresaId])
  useEffect(() => NexusAI.subscribeLogs(empresaId, setLogs), [empresaId])
  useEffect(() => NexusAI.subscribeAudit(empresaId, setAudit), [empresaId])

  const salvar = async () => {
    setSaveError('')
    try {
      const result = await NexusAI.saveConfig(empresaId, cfg)
      keyDirtyRef.current = false
      setKeyConfigured(Boolean((result as { openai_api_key_set?: boolean })?.openai_api_key_set) || keyConfigured || Boolean(cfg.openaiApiKey && !cfg.openaiApiKey.includes('•')))
      if (cfg.openaiApiKey && !cfg.openaiApiKey.includes('•')) {
        setCfg((c) => ({ ...c, openaiApiKey: '••••••••' }))
        setKeyConfigured(true)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 max-w-2xl space-y-4">
      <p className="text-sm text-slate-500">
        Cadastre a OPENAI_API_KEY abaixo e clique em Salvar. A chave fica no escopo desta empresa
        (API Nexus AI) e o chat passa a usar a OpenAI sem reiniciar o servidor.
      </p>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Segurança e Integração
        </h3>
        <div className="text-xs text-slate-500 space-y-1">
          <p>Empresa: {empresaId}</p>
          <p>Autenticação: Bearer API Key/JWT + headers X-Usuario-Id e X-Usuario-Nome.</p>
          <p>
            OpenAI:{' '}
            <span className={keyConfigured ? 'text-teal-600' : 'text-amber-600'}>
              {keyConfigured ? 'chave configurada nesta empresa' : 'chave ainda não configurada'}
            </span>
          </p>
        </div>
      </div>
      <Field label="Provedor LLM">
        <select
          className="field"
          value={cfg.llmProvider}
          onChange={(e) => setCfg({ ...cfg, llmProvider: e.target.value as AiConfig['llmProvider'] })}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.ready}>
              {p.label}
              {!p.ready ? ' (em breve)' : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Modelo">
        <select
          className="field"
          value={cfg.modelo}
          onChange={(e) => setCfg({ ...cfg, modelo: e.target.value })}
        >
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4.1-mini">gpt-4.1-mini</option>
          <option value="gpt-4.1">gpt-4.1</option>
        </select>
      </Field>
      <Field label="API Key OpenAI">
        <div className="flex gap-2">
          <input
            className="field flex-1"
            type={showKey ? 'text' : 'password'}
            value={cfg.openaiApiKey || ''}
            onChange={(e) => {
              keyDirtyRef.current = true
              setCfg({ ...cfg, openaiApiKey: e.target.value })
            }}
            placeholder="sk-..."
            autoComplete="off"
          />
          <button
            type="button"
            className="text-xs px-3 border rounded-lg border-slate-200 dark:border-slate-700"
            onClick={() => setShowKey((v) => !v)}
          >
            {showKey ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Cole a chave e salve. Depois disso o Chat usa OpenAI automaticamente.
        </p>
      </Field>
      <Field label={`Temperatura (${cfg.temperatura})`}>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={cfg.temperatura}
          onChange={(e) => setCfg({ ...cfg, temperatura: Number(e.target.value) })}
          className="w-full"
        />
      </Field>
      <Field label="Máx. tokens">
        <input
          className="field"
          type="number"
          min={256}
          max={8192}
          value={cfg.maxTokens}
          onChange={(e) => setCfg({ ...cfg, maxTokens: Number(e.target.value) || 2048 })}
        />
      </Field>
      <Field label="Idioma">
        <input
          className="field"
          value={cfg.idioma}
          onChange={(e) => setCfg({ ...cfg, idioma: e.target.value })}
        />
      </Field>
      <Field label="Prompt padrão">
        <textarea
          className="field min-h-[120px]"
          value={cfg.promptPadrao}
          onChange={(e) => setCfg({ ...cfg, promptPadrao: e.target.value })}
        />
      </Field>
      <Field label="Agente padrão">
        <select
          className="field"
          value={cfg.agentePadrao}
          onChange={(e) => setCfg({ ...cfg, agentePadrao: e.target.value as AiAgentId })}
        >
          {AI_AGENTS.filter((a) => a.status === 'ativo').map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={cfg.streaming}
          onChange={(e) => setCfg({ ...cfg, streaming: e.target.checked })}
        />
        Resposta em streaming
      </label>
      {saveError && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
          {saveError}
        </div>
      )}
      <button
        type="button"
        onClick={salvar}
        className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-lg text-sm"
      >
        {saved ? (keyConfigured ? 'Salvo — OpenAI ativa ✓' : 'Salvo ✓') : 'Salvar configurações'}
      </button>
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Logs de execução
          </h4>
          <div className="space-y-1 max-h-48 overflow-auto">
            {logs.slice(0, 15).map((r) => (
              <div key={r.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1">
                <span className="font-medium">{r.acao}</span> · {r.usuarioNome} · {r.tempoMs ?? '—'}ms
              </div>
            ))}
            {!logs.length && <p className="text-xs text-slate-400">Sem logs ainda.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Auditoria de acesso
          </h4>
          <div className="space-y-1 max-h-48 overflow-auto">
            {audit.slice(0, 15).map((r) => (
              <div key={r.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1">
                <span className="font-medium">{r.method}</span> {r.path} · {r.statusCode} ·{' '}
                {r.latencyMs ?? '—'}ms
              </div>
            ))}
            {!audit.length && <p className="text-xs text-slate-400">Sem eventos de auditoria.</p>}
          </div>
        </div>
      </div>
      <style>{`.field{width:100%;border:1px solid rgb(226 232 240);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;background:transparent;color:inherit}.dark .field{border-color:rgb(51 65 85)}`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

/* ───────────── Logs ───────────── */

function LogsTab({ empresaId }: { empresaId: string }) {
  const [rows, setRows] = useState<AiLog[]>([])
  useEffect(() => NexusAI.subscribeLogs(empresaId, setRows), [empresaId])

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-left">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Agente</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">ms</th>
              <th className="px-3 py-2">Tokens</th>
              <th className="px-3 py-2">Erro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.data} {r.hora}
                </td>
                <td className="px-3 py-2">{r.usuarioNome}</td>
                <td className="px-3 py-2">{r.agenteId}</td>
                <td className="px-3 py-2">{r.acao}</td>
                <td className="px-3 py-2">{r.tempoMs ?? '—'}</td>
                <td className="px-3 py-2">{r.tokens ?? '—'}</td>
                <td className="px-3 py-2 text-red-500 max-w-[200px] truncate">{r.erro || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-6 text-center text-slate-400 text-sm">Nenhum log ainda.</p>
        )}
      </div>
    </div>
  )
}
