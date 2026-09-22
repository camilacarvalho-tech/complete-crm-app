/**
 * Fila local de enriquecimento — não usa jobQueue do Monitor.
 * Concorrência 2. Retry no máximo 1 vez só em ERROR. Sem loop infinito.
 */
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { OportunidadeMonitor } from '../types'
import type { EnrichmentQueueStatus } from './enrichmentTypes'
import { enrichExistingPersonLead } from './enrichmentEngine'
import type { EnrichmentResult } from './enrichmentResult'

export type EnrichmentQueueJob = {
  personId: string
  status: EnrichmentQueueStatus
  attempts: number
  result?: EnrichmentResult
  error?: string
}

const CONCURRENCY = 2
const MAX_ATTEMPTS = 2

export type EnrichmentQueueProgress = {
  pending: number
  processing: number
  completed: number
  failed: number
  skipped: number
  jobs: EnrichmentQueueJob[]
  noProvider: boolean
  message?: string
}

function tally(jobs: EnrichmentQueueJob[]): EnrichmentQueueProgress {
  return {
    pending: jobs.filter((j) => j.status === 'pending').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
    skipped: jobs.filter((j) => j.status === 'skipped').length,
    jobs: [...jobs],
    noProvider: jobs.some((j) => j.result?.status === 'NO_PROVIDER'),
  }
}

export async function runEnrichmentQueue(opts: {
  empresaId: string
  people: CompanyPeopleResearch[]
  companies: OportunidadeMonitor[]
  actor?: { usuarioId?: string; usuarioNome?: string }
  onProgress?: (p: EnrichmentQueueProgress) => void
}): Promise<EnrichmentQueueProgress> {
  const jobs: EnrichmentQueueJob[] = opts.people.map((p) => ({
    personId: p.id,
    status: 'pending',
    attempts: 0,
  }))
  const byId = new Map(opts.people.map((p) => [p.id, p]))
  opts.onProgress?.(tally(jobs))

  let next = 0
  const worker = async () => {
    for (;;) {
      const index = next
      next += 1
      if (index >= jobs.length) return
      const job = jobs[index]
      const person = byId.get(job.personId)
      if (!person) {
        job.status = 'skipped'
        opts.onProgress?.(tally(jobs))
        continue
      }
      job.status = 'processing'
      opts.onProgress?.(tally(jobs))
      const company = opts.companies.find((c) => c.id === person.opportunityId) || null
      while (job.attempts < MAX_ATTEMPTS) {
        job.attempts += 1
        try {
          const result = await enrichExistingPersonLead({
            empresaId: opts.empresaId,
            person,
            company,
            allPeople: opts.people,
            actor: opts.actor,
          })
          job.result = result
          if (result.status === 'ERROR' && job.attempts < MAX_ATTEMPTS) continue
          if (result.status === 'NO_PROVIDER' || result.status === 'NOT_ENRICHED') job.status = 'skipped'
          else if (result.status === 'ERROR') {
            job.status = 'failed'
            job.error = result.errors[0] || result.message
          } else job.status = 'completed'
          break
        } catch (e: unknown) {
          job.error = e instanceof Error ? e.message : 'erro'
          if (job.attempts >= MAX_ATTEMPTS) {
            job.status = 'failed'
            break
          }
        }
      }
      opts.onProgress?.(tally(jobs))
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(jobs.length, 1)) }, () => worker()))
  const final = tally(jobs)
  if (!jobs.length) {
    final.message = 'Nenhuma pessoa selecionada.'
  } else if (final.noProvider && final.completed === 0) {
    final.message = 'Nenhuma fonte de enriquecimento está configurada.'
  }
  return final
}
