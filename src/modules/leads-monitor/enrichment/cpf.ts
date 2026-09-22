import { digitsOnly } from '../pipeline/normalizeFields'

/** CPF brasileiro: 11 dígitos + dígitos verificadores. Não gera CPF. */
export function isValidCpf(value: string): boolean {
  const cpf = digitsOnly(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const calc = (base: number) => {
    let sum = 0
    for (let i = 0; i < base; i += 1) sum += Number(cpf[i]) * (base + 1 - i)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}
