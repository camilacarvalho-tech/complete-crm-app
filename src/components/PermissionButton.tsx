/**
 * BOTÃO COM VERIFICAÇÃO DE PERMISSÃO
 * Desabilita automaticamente se o usuário não tiver permissão
 */

import React, { ButtonHTMLAttributes } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock } from 'lucide-react'

interface PermissionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  requireMaster?: boolean
  requireEmpresario?: boolean
  requirePermission?: 'verFilaGeral' | 'verFinanceiroEquipe' | 'verRelatoriosEmpresa'
  record?: any // Para verificar permissão de editar/excluir registro específico
  action?: 'view' | 'edit' | 'delete' | 'create'
  hideIfNoPermission?: boolean
}

const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  requireMaster = false,
  requireEmpresario = false,
  requirePermission,
  record,
  action,
  hideIfNoPermission = false,
  disabled,
  className = '',
  ...props
}) => {
  const {
    isMaster,
    isEmpresario,
    usuario,
    canView,
    canEdit,
    canDelete,
    canCreate
  } = useAuth()

  // Verificar permissões
  let hasPermission = true

  // Verificar perfil obrigatório
  if (requireMaster && !isMaster) {
    hasPermission = false
  }

  if (requireEmpresario && !(isMaster || isEmpresario)) {
    hasPermission = false
  }

  // Verificar permissão específica
  if (requirePermission && usuario) {
    hasPermission = usuario[requirePermission] === true
  }

  // Verificar ação específica em registro
  if (record && action) {
    switch (action) {
      case 'view':
        hasPermission = canView(record)
        break
      case 'edit':
        hasPermission = canEdit(record)
        break
      case 'delete':
        hasPermission = canDelete(record)
        break
      case 'create':
        hasPermission = canCreate()
        break
    }
  }

  // Ocultar se não tiver permissão
  if (!hasPermission && hideIfNoPermission) {
    return null
  }

  // Desabilitar se não tiver permissão
  const isDisabled = disabled || !hasPermission

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        ${className}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {!hasPermission && <Lock size={14} className="inline mr-1" />}
      {children}
    </button>
  )
}

export default PermissionButton
