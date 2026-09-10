import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export interface UsuarioAtual {
  id: string
  nome: string
  email: string
  empresaId: string | null
  perfil?: string
}

interface AuthContextValue {
  user: User | null
  usuario: UsuarioAtual | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function profileToUsuario(user: User, profile: Record<string, unknown> | undefined): UsuarioAtual {
  return {
    id: user.uid,
    nome: String(profile?.nome || user.displayName || user.email || ''),
    email: String(profile?.email || user.email || ''),
    empresaId: profile?.empresaId ? String(profile.empresaId) : null,
    perfil: profile?.perfil ? String(profile.perfil) : undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        if (active) {
          setUser(null)
          setUsuario(null)
          setLoading(false)
        }
        return
      }
      if (active) {
        setUser(nextUser)
        setLoading(true)
      }
      try {
        const profile = await getDoc(doc(db, 'usuarios', nextUser.uid))
        if (active) setUsuario(profileToUsuario(nextUser, profile.exists() ? profile.data() : undefined))
      } catch (error) {
        console.warn('[auth] não foi possível carregar o perfil do usuário', error)
        if (active) setUsuario(profileToUsuario(nextUser, undefined))
      } finally {
        if (active) setLoading(false)
      }
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({ user, usuario, loading }), [user, usuario, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
