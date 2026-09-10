import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function Onboarding() {
  const navigate = useNavigate()

  useEffect(() => {
    // Redireciona para dashboard após onboarding
    navigate('/')
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="text-white text-xl">Carregando...</div>
    </div>
  )
}
