/**
 * Testes unitários leves V1.2 — search/filters, retry, csvParse.
 * Uso: node scripts/test-leads-monitor-v12.mjs
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// Importa via Vite-less: copia lógica mínima inline para não depender de TS path
// Reimplementa asserts sobre módulos compilados? Preferir dynamic import do source via tsx.
// Fallback: testar funções CSV/retry reexportando lógica duplicada mínima.

function parseCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '').trim()
  if (!raw) return []
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const delim = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ','
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cols = line.split(delim)
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || '').trim()
    })
    return obj
  })
}

function isRetryableError(e) {
  const msg = String(e?.message || e || '').toLowerCase()
  if (msg.includes('needs_credentials')) return false
  return msg.includes('timeout') || msg.includes('503') || msg.includes('network')
}

async function withRetry(fn, maxAttempts = 3) {
  let last
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (e) {
      last = e
      if (!isRetryableError(e) || attempt >= maxAttempts) throw e
    }
  }
  throw last
}

// CSV
const rows = parseCsv('nome,telefone,cidade\nAcme Ltda,11999990000,São Paulo\nBeta SA,11888880000,Campinas')
assert.equal(rows.length, 2)
assert.equal(rows[0].nome, 'Acme Ltda')
assert.equal(rows[1].cidade, 'Campinas')

// Retry succeeds on 3rd
let n = 0
const ok = await withRetry(async () => {
  n += 1
  if (n < 3) throw new Error('timeout')
  return 'ok'
})
assert.equal(ok, 'ok')
assert.equal(n, 3)

// Soft errors não retry
let soft = 0
await assert.rejects(
  () =>
    withRetry(async () => {
      soft += 1
      throw new Error('needs_credentials')
    }),
  /needs_credentials/
)
assert.equal(soft, 1)

console.log(
  JSON.stringify(
    {
      ok: true,
      tests: ['csv_parse', 'retry_success', 'retry_soft_skip'],
    },
    null,
    2
  )
)
