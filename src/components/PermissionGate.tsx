/**
 * GATE DE PERMISSÃO
 * Mostra conteúdo apenas se o usuário tiver permissão
 */

import React, { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, AlertCircle } from 'lucide-react'

interface PermissionGateProps {
  children: ReactNode
  requireMaster?: boolean
  requireEmpresario?: boolean
  requirePermission?: 'verFilaGeral' | 'verFinanceiroEquipe' | 'verRelatoriosEmpresa'
  fallback?: ReactNode
  showFallback?: boolean
}

const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requireMaster = false,
  requireEmpresario = false,
  requirePermission,
  fallback,
  showFallback = true
}) => {
  const { isMaster, isEmpresario, usuario } = useAuth()

  // Verificar permissões
  let hasPermission = true

  if (requireMaster && !isMaster) {
    hasPermission = false
  }

  if (requireEmpresario && !(isMaster || isEmpresario)) {
    hasPermission = false
  }

  if (requirePermission && usuario) {
    hasPermission = usuario[requirePermission] === true
  }

  // Se tiver permissão, mostra o conteúdo
  if (hasPermission) {
    return <>{children}</>
  }

  // Se não tiver permissão e não deve mostrar fallback, retorna null
  if (!showFallback) {
    return null
  }

  // Fallback customizado
  if (fallback) {
    return <>{fallback}</>
  }

  // Fallback padrão
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-lg border border-slate-700">
      <Lock className="w-12 h-12 text-slate-500 mb-4" />
      <h3 className="text-lg font-semibold text-slate-300 mb-2">
        Acesso Restrito
      </h3>
      <p className="text-sm text-slate-400 text-center max-w-md">
        Você não tem permissão para visualizar este conteúdo. Entre em contato com o
        administrador da empresa para solicitar acesso.
      </p>
    </div>
  )
}

/**
 * VARIAÇÃO: Alert de permissão inline
 */
export const PermissionAlert: React.FC<{
  message?: string
  className?: string
}> = ({ message = 'Você não tem permissão para esta ação', className = '' }) => {
  return (
    <div
      className={`flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-sm ${className}`}
    >
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  )
}

/**
 * VARIAÇÃO: Badge "Somente Admin"
 */
export const AdminOnlyBadge: React.FC<{ className?: string }> = ({
  className = ''
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 ${className}`}
    >
      <Lock size={12} />
      Somente Admin
    </span>
  )
}

export default PermissionGate
