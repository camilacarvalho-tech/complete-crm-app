/**
 * BADGE DE PERMISSÃO
 * Exibe visualmente o nível de acesso do usuário
 */

import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Crown, User } from 'lucide-react'

interface PermissionBadgeProps {
  showIcon?: boolean
  showText?: boolean
  className?: string
}

const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  showIcon = true,
  showText = true,
  className = ''
}) => {
  const { usuario, isMaster, isEmpresario, isFuncionario } = useAuth()

  if (!usuario) return null

  let icon = <User size={16} />
  let text = 'Funcionário'
  let bgColor = 'bg-blue-500'
  let textColor = 'text-white'

  if (isMaster) {
    icon = <Crown size={16} />
    text = 'Master'
    bgColor = 'bg-gradient-to-r from-yellow-500 to-orange-500'
    textColor = 'text-white'
  } else if (isEmpresario) {
    icon = <Shield size={16} />
    text = 'Empresário'
    bgColor = 'bg-gradient-to-r from-purple-500 to-pink-500'
    textColor = 'text-white'
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor} ${textColor} text-xs font-semibold ${className}`}
    >
      {showIcon && icon}
      {showText && <span>{text}</span>}
    </div>
  )
}

export default PermissionBadge
