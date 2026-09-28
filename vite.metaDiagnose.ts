import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { Plugin } from 'vite'

function readEnvFile(root: string): Record<string, string> {
  const env: Record<string, string> = {}
  let text = ''
  try {
    text = readFileSync(join(root, 'functions', '.env'), 'utf8')
  } catch {
    return env
  }
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index < 1) continue
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim()
  }
  return env
}

export function metaDiagnosePlugin(): Plugin {
  return {
    name: 'meta-whatsapp-diagnose',
    configureServer(server) {
      const require = createRequire(import.meta.url)
      const { diagnoseMeta } = require('./functions/metaWhatsappDiagnose.js') as {
        diagnoseMeta: (env: Record<string, string>) => Promise<unknown>
      }
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0]
        if (path !== '/__meta_whatsapp/diagnose' || req.method !== 'GET') {
          next()
          return
        }
        void diagnoseMeta(readEnvFile(server.config.root))
          .then((report) => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(report))
          })
          .catch(() => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Falha ao consultar a Meta' }))
          })
      })
    },
  }
}
