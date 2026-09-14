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
  empresaNome?: string
  perfil?: string
}

interface AuthContextValue {
  user: User | null
  usuario: UsuarioAtual | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function profileToUsuario(user: User, profile: Record<string, unknown> | undefined, empresaNome?: string): UsuarioAtual {
  return {
    id: user.uid,
    nome: String(profile?.nome || user.displayName || user.email || ''),
    email: String(profile?.email || user.email || ''),
    empresaId: profile?.empresaId ? String(profile.empresaId) : 'nexus-homologacao-v1',
    empresaNome: empresaNome || (profile?.empresaNome ? String(profile.empresaNome) : ''),
    perfil: profile?.perfil ? String(profile.perfil) : 'VENDEDOR',
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
        const data = profile.exists() ? profile.data() : undefined
        const empId = data?.empresaId ? String(data.empresaId) : ''
        let empresaNome = ''
        if (empId) {
          try {
            const emp = await getDoc(doc(db, 'empresas', empId))
            if (emp.exists()) empresaNome = String(emp.data()?.nome || emp.data()?.razaoSocial || '')
          } catch { /* nome visível cai no fallback */ }
        }
        if (active) setUsuario(profileToUsuario(nextUser, data, empresaNome))
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
