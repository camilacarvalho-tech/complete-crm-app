/**
 * Retorna empresaId da sessão Auth — com fallback seguro ao storage.
 */
import { useAuth } from '../contexts/AuthContext'

export function useEmpresaId(): string | null {
  const { empresa, usuario } = useAuth()
  return (
    empresa?.id ||
    usuario?.empresaId ||
    localStorage.getItem('empresaId') ||
    localStorage.getItem('nexus_empresa_id') ||
    null
  )
}

export function requireEmpresaId(empresaId: string | null): asserts empresaId is string {
  if (!empresaId) {
    throw new Error('Empresa não identificada. Faça login ou complete o onboarding.')
  }
}
