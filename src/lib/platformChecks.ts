import { runLeticiaFlow } from './leticiaEngine'
import { buildDre, runFinanceAi } from './finance'
import { normalizeEmail, digits, toTitleCase } from './format'
import { findSimilarClientes, canMutate } from './nexusCore'

export function runPlatformChecks(): string[] {
  const errors: string[] = []
  if (normalizeEmail('  A@B.COM ') !== 'a@b.com') errors.push('email')
  if (digits('(11) 99999-8888') !== '11999998888') errors.push('phone')
  if (toTitleCase('maria da silva') !== 'Maria da Silva') errors.push('name')
  if (canMutate('CONSULTA')) errors.push('rbac')
  const dre = buildDre([{ id: '1', tipo: 'receita', valor: 100 }, { id: '2', tipo: 'despesa', categoria: 'custo', valor: 40 }])
  if (dre.receitaBruta !== 100 || dre.custos !== 40) errors.push('dre')
  const empty = runFinanceAi([])
  if (!empty.lines[0].includes('Nenhum lançamento')) errors.push('ai-empty')
  return errors
}

export async function runLeticiaCheck(): Promise<string[]> {
  const errors: string[] = []
  const r = await runLeticiaFlow(
    {
      nome: 't',
      passos: [
        { tipo: 'trigger', gatilho: 'novo_lead' },
        { tipo: 'condition', campo: 'produto', operador: 'eq', valor: 'CLT' },
        { tipo: 'action', acao: 'criar_tarefa', payload: 'x' },
      ],
    },
    { gatilho: 'novo_lead', record: { id: '1', produto: 'CLT' } },
    {
      sendWhatsApp: async () => ({ ok: false, message: 'WhatsApp Provider não configurado.' }),
      createTask: async () => {},
      addTag: async () => {},
      movePipeline: async () => {},
      notify: async () => {},
      log: async () => {},
    }
  )
  if (!r.executed.includes('tarefa')) errors.push('leticia-task')
  const skip = await runLeticiaFlow(
    { nome: 't', passos: [{ tipo: 'trigger', gatilho: 'proposta_criada' }] },
    { gatilho: 'novo_lead', record: {} },
    {
      sendWhatsApp: async () => ({ ok: true, message: '' }),
      createTask: async () => {},
      addTag: async () => {},
      movePipeline: async () => {},
      notify: async () => {},
      log: async () => {},
    }
  )
  if (!skip.skipped.includes('gatilho_nao_bate')) errors.push('leticia-skip')
  const dup = findSimilarClientes([{ id: '1', cpf: '12345678901' }], { cpf: '123.456.789-01' })
  if (dup.length !== 1) errors.push('dedupe')
  return errors
}
