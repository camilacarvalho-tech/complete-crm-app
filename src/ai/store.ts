/**
 * Persistência Nexus AI — Firestore + Storage multi-tenant.
 * Isolamento: sempre empresas/{empresaId}/ai/...
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
import { AI_COLLECTIONS, aiCollection, aiConfigDoc } from './paths'
import {
  DEFAULT_AI_CONFIG,
  type AiAnexo,
  type AiAgentId,
  type AiConfig,
  type AiConhecimentoDoc,
  type AiConversa,
  type AiLog,
  type AiMemoriaItem,
  type AiMensagem,
  type ChatActor,
} from './types'

function assertEmpresa(empresaId: string) {
  if (!empresaId?.trim()) {
    throw new Error('Nexus AI: empresaId obrigatório (isolamento multiempresa).')
  }
}

function nowParts() {
  const d = new Date()
  return {
    data: d.toLocaleDateString('pt-BR'),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

function colPath(empresaId: string, name: string) {
  return aiCollection(empresaId, name) as unknown as [string, ...string[]]
}

// ─── Config ───────────────────────────────────────────────

export async function getConfig(empresaId: string): Promise<AiConfig> {
  assertEmpresa(empresaId)
  const path = aiConfigDoc(empresaId)
  const snap = await getDoc(doc(db, ...path))
  if (!snap.exists()) return { ...DEFAULT_AI_CONFIG }
  return { ...DEFAULT_AI_CONFIG, ...(snap.data() as Partial<AiConfig>) }
}

export async function saveConfig(empresaId: string, patch: Partial<AiConfig>): Promise<AiConfig> {
  assertEmpresa(empresaId)
  const current = await getConfig(empresaId)
  const next = { ...current, ...patch }
  const path = aiConfigDoc(empresaId)
  await setDoc(doc(db, ...path), { ...next, atualizadoEm: serverTimestamp() }, { merge: true })
  return next
}

export function subscribeConfig(empresaId: string, cb: (c: AiConfig) => void): Unsubscribe {
  assertEmpresa(empresaId)
  const path = aiConfigDoc(empresaId)
  return onSnapshot(doc(db, ...path), (snap) => {
    if (!snap.exists()) cb({ ...DEFAULT_AI_CONFIG })
    else cb({ ...DEFAULT_AI_CONFIG, ...(snap.data() as Partial<AiConfig>) })
  })
}

// ─── Conversas ─────────────────────────────────────────────

export async function createConversa(
  empresaId: string,
  actor: ChatActor,
  opts?: { titulo?: string; agenteId?: AiAgentId }
): Promise<AiConversa> {
  assertEmpresa(empresaId)
  const { data, hora } = nowParts()
  const agenteId = opts?.agenteId || DEFAULT_AI_CONFIG.agentePadrao
  const payload = {
    titulo: opts?.titulo || 'Nova conversa',
    usuarioId: actor.usuarioId,
    usuarioNome: actor.usuarioNome,
    empresaId,
    agenteId,
    qtdMensagens: 0,
    data,
    hora,
    arquivada: false,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  }
  const refDoc = await addDoc(collection(db, ...colPath(empresaId, AI_COLLECTIONS.conversas)), payload)
  return { id: refDoc.id, ...payload }
}

export async function listConversas(empresaId: string, max = 100): Promise<AiConversa[]> {
  assertEmpresa(empresaId)
  const q = query(
    collection(db, ...colPath(empresaId, AI_COLLECTIONS.conversas)),
    orderBy('atualizadoEm', 'desc'),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiConversa, 'id'>) }))
}

export function subscribeConversas(
  empresaId: string,
  cb: (rows: AiConversa[]) => void,
  max = 100
): Unsubscribe {
  assertEmpresa(empresaId)
  const q = query(
    collection(db, ...colPath(empresaId, AI_COLLECTIONS.conversas)),
    orderBy('atualizadoEm', 'desc'),
    limit(max)
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiConversa, 'id'>) })))
  })
}

export async function updateConversa(
  empresaId: string,
  conversaId: string,
  patch: Partial<AiConversa>
): Promise<void> {
  assertEmpresa(empresaId)
  const { id: _i, ...rest } = patch
  await updateDoc(doc(db, ...colPath(empresaId, AI_COLLECTIONS.conversas), conversaId), {
    ...rest,
    atualizadoEm: serverTimestamp(),
  })
}

export async function archiveConversa(empresaId: string, conversaId: string): Promise<void> {
  await updateConversa(empresaId, conversaId, { arquivada: true })
}

// ─── Mensagens (subcoleção da conversa) ────────────────────

function mensagensCol(empresaId: string, conversaId: string) {
  return collection(
    db,
    'empresas',
    empresaId,
    'ai',
    AI_COLLECTIONS.conversas,
    conversaId,
    AI_COLLECTIONS.mensagens
  )
}

export async function addMensagem(
  empresaId: string,
  conversaId: string,
  msg: Omit<AiMensagem, 'id' | 'conversaId' | 'criadoEm'>
): Promise<AiMensagem> {
  assertEmpresa(empresaId)
  const payload = {
    ...msg,
    conversaId,
    criadoEm: serverTimestamp(),
  }
  const refDoc = await addDoc(mensagensCol(empresaId, conversaId), payload)
  return { id: refDoc.id, ...payload }
}

export async function listMensagens(empresaId: string, conversaId: string): Promise<AiMensagem[]> {
  assertEmpresa(empresaId)
  const q = query(mensagensCol(empresaId, conversaId), orderBy('criadoEm', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiMensagem, 'id'>) }))
}

export function subscribeMensagens(
  empresaId: string,
  conversaId: string,
  cb: (rows: AiMensagem[]) => void
): Unsubscribe {
  assertEmpresa(empresaId)
  const q = query(mensagensCol(empresaId, conversaId), orderBy('criadoEm', 'asc'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiMensagem, 'id'>) })))
  })
}

export async function deleteLastAssistantMessage(
  empresaId: string,
  conversaId: string
): Promise<void> {
  const msgs = await listMensagens(empresaId, conversaId)
  const last = [...msgs].reverse().find((m) => m.role === 'assistant')
  if (!last) return
  await deleteDoc(doc(mensagensCol(empresaId, conversaId), last.id))
}

// ─── Memória ───────────────────────────────────────────────

export async function listMemoria(empresaId: string): Promise<AiMemoriaItem[]> {
  assertEmpresa(empresaId)
  const snap = await getDocs(collection(db, ...colPath(empresaId, AI_COLLECTIONS.memoria)))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiMemoriaItem, 'id'>) }))
}

export function subscribeMemoria(
  empresaId: string,
  cb: (rows: AiMemoriaItem[]) => void
): Unsubscribe {
  assertEmpresa(empresaId)
  return onSnapshot(collection(db, ...colPath(empresaId, AI_COLLECTIONS.memoria)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiMemoriaItem, 'id'>) })))
  })
}

export async function upsertMemoria(
  empresaId: string,
  item: Omit<AiMemoriaItem, 'id' | 'atualizadoEm'> & { id?: string }
): Promise<AiMemoriaItem> {
  assertEmpresa(empresaId)
  const payload = {
    chave: item.chave,
    valor: item.valor,
    categoria: item.categoria,
    atualizadoEm: serverTimestamp(),
  }
  if (item.id) {
    await updateDoc(doc(db, ...colPath(empresaId, AI_COLLECTIONS.memoria), item.id), payload)
    return { id: item.id, ...payload }
  }
  const refDoc = await addDoc(collection(db, ...colPath(empresaId, AI_COLLECTIONS.memoria)), payload)
  return { id: refDoc.id, ...payload }
}

export async function deleteMemoria(empresaId: string, id: string): Promise<void> {
  assertEmpresa(empresaId)
  await deleteDoc(doc(db, ...colPath(empresaId, AI_COLLECTIONS.memoria), id))
}

// ─── Conhecimento ──────────────────────────────────────────

function detectTipo(nome: string): AiConhecimentoDoc['tipo'] {
  const n = nome.toLowerCase()
  if (n.endsWith('.pdf')) return 'pdf'
  if (n.endsWith('.docx') || n.endsWith('.doc')) return 'docx'
  if (n.endsWith('.txt') || n.endsWith('.md')) return 'txt'
  return 'outro'
}

export async function listConhecimento(empresaId: string): Promise<AiConhecimentoDoc[]> {
  assertEmpresa(empresaId)
  const q = query(
    collection(db, ...colPath(empresaId, AI_COLLECTIONS.conhecimento)),
    orderBy('criadoEm', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiConhecimentoDoc, 'id'>) }))
}

export function subscribeConhecimento(
  empresaId: string,
  cb: (rows: AiConhecimentoDoc[]) => void
): Unsubscribe {
  assertEmpresa(empresaId)
  const q = query(
    collection(db, ...colPath(empresaId, AI_COLLECTIONS.conhecimento)),
    orderBy('criadoEm', 'desc')
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiConhecimentoDoc, 'id'>) })))
  })
}

export async function uploadConhecimento(
  empresaId: string,
  file: File,
  titulo?: string
): Promise<AiConhecimentoDoc> {
  assertEmpresa(empresaId)
  const tipo = detectTipo(file.name)
  const storagePath = `empresas/${empresaId}/ai/conhecimento/${Date.now()}_${file.name}`
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  let conteudoTexto = ''
  let status: AiConhecimentoDoc['status'] = 'pendente'
  if (tipo === 'txt') {
    try {
      conteudoTexto = (await file.text()).slice(0, 40000)
      status = 'indexado'
    } catch {
      status = 'erro'
    }
  }

  const payload = {
    titulo: titulo || file.name,
    tipo,
    nomeArquivo: file.name,
    tamanho: file.size,
    storagePath,
    url,
    conteudoTexto,
    status,
    criadoEm: serverTimestamp(),
  }
  const refDoc = await addDoc(
    collection(db, ...colPath(empresaId, AI_COLLECTIONS.conhecimento)),
    payload
  )
  return { id: refDoc.id, ...payload }
}

export async function deleteConhecimento(empresaId: string, id: string): Promise<void> {
  assertEmpresa(empresaId)
  const dref = doc(db, ...colPath(empresaId, AI_COLLECTIONS.conhecimento), id)
  const snap = await getDoc(dref)
  if (snap.exists()) {
    const data = snap.data() as AiConhecimentoDoc
    if (data.storagePath) {
      try {
        await deleteObject(ref(storage, data.storagePath))
      } catch {
        /* ignore */
      }
    }
  }
  await deleteDoc(dref)
}

export async function uploadChatAnexo(
  empresaId: string,
  file: File
): Promise<AiAnexo> {
  assertEmpresa(empresaId)
  const storagePath = `empresas/${empresaId}/ai/uploads/${Date.now()}_${file.name}`
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return {
    nome: file.name,
    tipo: file.type || 'application/octet-stream',
    url,
    storagePath,
    tamanho: file.size,
  }
}

// ─── Logs ──────────────────────────────────────────────────

export async function appendLog(
  empresaId: string,
  entry: Omit<AiLog, 'id' | 'data' | 'hora' | 'empresaId' | 'criadoEm'>
): Promise<void> {
  assertEmpresa(empresaId)
  const { data, hora } = nowParts()
  await addDoc(collection(db, ...colPath(empresaId, AI_COLLECTIONS.logs)), {
    ...entry,
    empresaId,
    data,
    hora,
    criadoEm: serverTimestamp(),
  })
}

export function subscribeLogs(
  empresaId: string,
  cb: (rows: AiLog[]) => void,
  max = 100
): Unsubscribe {
  assertEmpresa(empresaId)
  const q = query(
    collection(db, ...colPath(empresaId, AI_COLLECTIONS.logs)),
    orderBy('criadoEm', 'desc'),
    limit(max)
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AiLog, 'id'>) })))
  })
}
