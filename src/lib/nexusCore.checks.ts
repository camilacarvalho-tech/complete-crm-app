import { findSimilarClientes, digits, stageIdFromLegacy, canMutate } from './nexusCore'

export function runNexusCoreChecks(): string[] {
  const errors: string[] = []
  if (digits('11.222.333-44') !== '1122233344') errors.push('digits')
  const list = [
    { id: '1', cpf: '12345678901', telefone: '11999999999', email: 'a@a.com' },
    { id: '2', cpf: '000', telefone: '11888888888', email: 'b@b.com' },
  ]
  const dup = findSimilarClientes(list, { cpf: '123.456.789-01' })
  if (dup.length !== 1) errors.push('dedupe-cpf')
  if (stageIdFromLegacy('Pago') !== 'concluido') errors.push('stage-pago')
  if (canMutate('CONSULTA')) errors.push('rbac-consulta')
  if (!canMutate('VENDEDOR')) errors.push('rbac-vendedor')
  return errors
}

if (typeof window === 'undefined') {
  const errors = runNexusCoreChecks()
  if (errors.length) throw new Error(errors.join(','))
}
