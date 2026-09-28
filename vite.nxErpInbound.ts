import { createHash, timingSafeEqual, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/** Rotas que o NX ERP já chama em nexus_crm_integracao.testar_conexao. */
const HEALTH_PATHS = new Set([
  '/api/integrations/nx-erp/health',
  '/api/nx-erp/health',
  '/api/health',
  '/health',
])

const HASH_FILE = '.nx-crm-inbound.sha256'
const QUEUE_FILE = '.nx-crm-inbound-queue.json'
const INBOX_POSTS = new Set([
  '/api/integrations/nx-erp/mensagens',
  '/api/integrations/nx-erp/eventos',
])

function hashFile(root: string) {
  return join(root, HASH_FILE)
}

function readHash(root: string): string {
  try {
    return readFileSync(hashFile(root), 'utf8').trim().toLowerCase()
  } catch {
    return ''
  }
}

function headerToken(req: { headers: Record<string, string | string[] | undefined> }): string {
  const raw = (name: string) => {
    const value = req.headers[name]
    return Array.isArray(value) ? value[0] || '' : value || ''
  }
  const auth = raw('authorization')
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return raw('x-crm-token').trim() || raw('x-cloud-token').trim()
}

function sameHash(stored: string, incoming: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(stored) || !incoming) return false
  const got = createHash('sha256').update(incoming).digest('hex')
  const a = Buffer.from(stored, 'hex')
  const b = Buffer.from(got, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

type Queued = { id: string; kind: 'mensagem' | 'evento'; body: Record<string, unknown> }

function queueFile(root: string) {
  return join(root, QUEUE_FILE)
}

function readQueue(root: string): Queued[] {
  try {
    const parsed = JSON.parse(readFileSync(queueFile(root), 'utf8')) as Queued[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(root: string, items: Queued[]) {
  writeFileSync(queueFile(root), JSON.stringify(items), { encoding: 'utf8' })
}

function stripSecrets(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (/token|secret|authorization|senha|password|bearer/i.test(key)) continue
    out[key] = value
  }
  return out
}

function sendJson(res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void }, code: number, body: unknown) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export function nxErpInboundPlugin(): Plugin {
  return {
    name: 'nx-erp-inbound',
    configureServer(server) {
      const root = server.config.root
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0]
        if (path.startsWith('/__nx_erp_local')) {
          next()
          return
        }
        if (path === '/__nx_crm_inbound/seal' && req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
          req.on('end', () => {
            let sha = ''
            try {
              const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { sha256?: string }
              sha = String(parsed.sha256 || '').trim().toLowerCase()
            } catch {
              sha = ''
            }
            if (!/^[a-f0-9]{64}$/.test(sha)) {
              sendJson(res, 400, { ok: false, erro: 'Hash inválido' })
              return
            }
            writeFileSync(hashFile(root), sha, { encoding: 'utf8' })
            sendJson(res, 200, { ok: true })
          })
          return
        }
        if (path === '/__nx_crm_inbound/pending' && req.method === 'GET') {
          sendJson(res, 200, { ok: true, items: readQueue(root) })
          return
        }
        if (path === '/__nx_crm_inbound/ack' && req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
          req.on('end', () => {
            let ids: string[] = []
            try {
              const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { ids?: string[] }
              ids = Array.isArray(parsed.ids) ? parsed.ids.map(String) : []
            } catch {
              ids = []
            }
            const drop = new Set(ids)
            writeQueue(root, readQueue(root).filter((item) => !drop.has(item.id)))
            sendJson(res, 200, { ok: true })
          })
          return
        }
        if (req.method === 'POST' && INBOX_POSTS.has(path)) {
          const stored = readHash(root)
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
          req.on('end', () => {
            if (!stored || !sameHash(stored, headerToken(req))) {
              sendJson(res, 401, { ok: false, erro: 'Token ausente ou inválido' })
              return
            }
            let body: Record<string, unknown> = {}
            try {
              const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
              if (parsed && typeof parsed === 'object') body = stripSecrets(parsed)
            } catch {
              sendJson(res, 400, { ok: false, erro: 'JSON inválido' })
              return
            }
            const kind = path.endsWith('/eventos') ? 'evento' : 'mensagem'
            const queue = readQueue(root)
            queue.push({ id: randomUUID(), kind, body })
            writeQueue(root, queue)
            sendJson(res, 202, { ok: true })
          })
          return
        }
        if (req.method === 'GET' && HEALTH_PATHS.has(path)) {
          const stored = readHash(root)
          if (!stored) {
            sendJson(res, 401, { ok: false, erro: 'Chave de entrada do CRM ainda não gerada' })
            return
          }
          if (!sameHash(stored, headerToken(req))) {
            sendJson(res, 401, { ok: false, erro: 'Token ausente ou inválido' })
            return
          }
          sendJson(res, 200, {
            ok: true,
            status: 'online',
            service: 'Nexus CRM',
            direction: 'nx-erp-to-crm',
          })
          return
        }
        next()
      })
    },
  }
}
