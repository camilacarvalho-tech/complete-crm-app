/**
 * CONTEXT DE AUTENTICAÇÃO - CREDFLOW PLATFORM 2.0
 * Gerencia autenticação e permissões multi-tenant
 * 
 * 3 NÍVEIS DE VISIBILIDADE:
 * - Master: CEO/Dona da plataforma (vê tudo)
 * - Empresário: Dono da empresa cliente (vê sua empresa)
 * - Funcionário: Atendente (vê apenas seus registros)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { setCurrentUser } from '../services/database.service'
import { Usuario, PerfilUsuario, Empresa } from '../types/database.types'

/** E-mails Master da plataforma (alinhado a firestore.rules) */
const MASTER_EMAILS = new Set([
  'carvalhoduraocamila@gmail.com',
  'laiane26022@gmail.com',
])

/** Empresa padrão vinculada ao Master para Nexus AI / CRM */
const MASTER_EMPRESA_ID = 'nexus-homologacao-v1'

function isMasterEmail(email?: string | null): boolean {
  return Boolean(email && MASTER_EMAILS.has(email.trim().toLowerCase()))
}

// ============================================
// TIPOS
// ============================================

interface AuthContextType {
  // Estado de autenticação
  user: User | null
  usuario: (Usuario & { nicho?: string, perfil?: string }) | null
  empresa: Empresa | null
  loading: boolean
  
  // Funções de autenticação
  signIn: (email: string, senha: string) => Promise<void>
  signOut: () => Promise<void>
  
  // Verificações de permissão
  isMaster: boolean
  isEmpresario: boolean
  isFuncionario: boolean
  
  // Permissões específicas
  canViewFilaGeral: boolean
  canViewFinanceiroEquipe: boolean
  canViewRelatoriosEmpresa: boolean
  
  // Helpers
  canView: (record: any) => boolean
  canEdit: (record: any) => boolean
  canDelete: (record: any) => boolean
  canCreate: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)

  // ============================================
  // VERIFICAÇÕES DE PERFIL
  // ============================================

  const isMaster = usuario?.perfil === PerfilUsuario.MASTER
  const isEmpresario = usuario?.perfil === PerfilUsuario.EMPRESARIO
  const isFuncionario = usuario?.perfil === PerfilUsuario.FUNCIONARIO

  const canViewFilaGeral = usuario?.verFilaGeral === true
  const canViewFinanceiroEquipe = usuario?.verFinanceiroEquipe === true
  const canViewRelatoriosEmpresa = usuario?.verRelatoriosEmpresa === true

  // ============================================
  // CARREGAR DADOS DO USUÁRIO
  // ============================================

  const loadUserData = async (firebaseUser: User) => {
    try {
      const email = (firebaseUser.email || '').trim().toLowerCase()
      const userRef = doc(db, 'usuarios', firebaseUser.uid)
      const usuarioDoc = await getDoc(userRef)

      let usuarioData: Usuario

      if (!usuarioDoc.exists()) {
        if (!isMasterEmail(email)) {
          console.error('Usuário não encontrado no banco de dados')
          throw new Error('Dados do usuário não encontrados')
        }

        // Bootstrap Master: admin + empresa para Nexus AI reconhecer no 1º login
        usuarioData = {
          id: firebaseUser.uid,
          empresaId: MASTER_EMPRESA_ID,
          nome: email === 'carvalhoduraocamila@gmail.com' ? 'Camila Carvalho' : email.split('@')[0],
          email,
          telefone: '',
          avatar: '',
          perfil: PerfilUsuario.MASTER,
          verFilaGeral: true,
          verFinanceiroEquipe: true,
          verRelatoriosEmpresa: true,
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        }

        try {
          await setDoc(userRef, {
            empresaId: usuarioData.empresaId,
            nome: usuarioData.nome,
            email: usuarioData.email,
            telefone: usuarioData.telefone,
            avatar: usuarioData.avatar,
            perfil: usuarioData.perfil,
            verFilaGeral: true,
            verFinanceiroEquipe: true,
            verRelatoriosEmpresa: true,
            ativo: true,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          })
        } catch (persistErr) {
          console.warn(
            'Perfil Master ativo em sessão; publique firestore.rules para persistir no Firebase:',
            persistErr
          )
        }
      } else {
        usuarioData = {
          id: usuarioDoc.id,
          ...usuarioDoc.data(),
        } as Usuario

        if (usuarioData.criadoEm && typeof (usuarioData.criadoEm as any).toDate === 'function') {
          usuarioData.criadoEm = (usuarioData.criadoEm as any).toDate()
        }
        if (usuarioData.atualizadoEm && typeof (usuarioData.atualizadoEm as any).toDate === 'function') {
          usuarioData.atualizadoEm = (usuarioData.atualizadoEm as any).toDate()
        }
        if (usuarioData.ultimoAcesso && typeof (usuarioData.ultimoAcesso as any).toDate === 'function') {
          usuarioData.ultimoAcesso = (usuarioData.ultimoAcesso as any).toDate()
        }
      }

      // Master: garantir perfil admin e empresaId para Nexus AI
      if (usuarioData.perfil === PerfilUsuario.MASTER || isMasterEmail(email)) {
        const needsLink =
          usuarioData.perfil !== PerfilUsuario.MASTER ||
          !usuarioData.empresaId ||
          usuarioData.empresaId === ''
        if (needsLink) {
          usuarioData = {
            ...usuarioData,
            perfil: PerfilUsuario.MASTER,
            empresaId: usuarioData.empresaId || MASTER_EMPRESA_ID,
          }
          try {
            await setDoc(
              userRef,
              {
                perfil: PerfilUsuario.MASTER,
                empresaId: usuarioData.empresaId,
                atualizadoEm: new Date(),
              },
              { merge: true }
            )
          } catch {
            /* rules antigas: sessão local já está correta */
          }
        }
      }

      setUsuario(usuarioData)

      setCurrentUser({
        id: usuarioData.id,
        empresaId: usuarioData.empresaId,
        perfil: usuarioData.perfil,
      })

      if (usuarioData.empresaId) {
        localStorage.setItem('empresaId', usuarioData.empresaId)
        localStorage.setItem('nexus_empresa_id', usuarioData.empresaId)
      }

      if (usuarioData.empresaId) {
        const empresaDoc = await getDoc(doc(db, 'empresas', usuarioData.empresaId))

        if (empresaDoc.exists()) {
          const empresaData = {
            id: empresaDoc.id,
            ...empresaDoc.data(),
          } as Empresa

          if (empresaData.criadoEm && typeof (empresaData.criadoEm as any).toDate === 'function') {
            empresaData.criadoEm = (empresaData.criadoEm as any).toDate()
          }
          if (empresaData.atualizadoEm && typeof (empresaData.atualizadoEm as any).toDate === 'function') {
            empresaData.atualizadoEm = (empresaData.atualizadoEm as any).toDate()
          }
          if (empresaData.dataInicio && typeof (empresaData.dataInicio as any).toDate === 'function') {
            empresaData.dataInicio = (empresaData.dataInicio as any).toDate()
          }
          if (empresaData.dataVencimento && typeof (empresaData.dataVencimento as any).toDate === 'function') {
            empresaData.dataVencimento = (empresaData.dataVencimento as any).toDate()
          }

          setEmpresa(empresaData)
          setUsuario({
            ...usuarioData,
            nicho: empresaData.nicho,
          })
        }
      } else if (usuarioData.perfil === PerfilUsuario.MASTER) {
        const empresasSnap = await getDocs(collection(db, 'empresas'))
        if (!empresasSnap.empty) {
          const first = empresasSnap.docs[0]
          const empresaData = { id: first.id, ...first.data() } as Empresa
          setEmpresa(empresaData)
          localStorage.setItem('empresaId', first.id)
          localStorage.setItem('nexus_empresa_id', first.id)
        }
      }

      console.log('✅ Dados do usuário carregados:', {
        nome: usuarioData.nome,
        perfil: usuarioData.perfil,
        empresa: usuarioData.empresaId || localStorage.getItem('empresaId'),
      })
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error)
      throw error
    }
  }

  // ============================================
  // LOGIN
  // ============================================

  const signIn = async (email: string, senha: string) => {
    try {
      setLoading(true)

      // Fazer login no Firebase Auth (persistência já configurada globalmente)
      const userCredential = await signInWithEmailAndPassword(auth, email, senha)
      
      // Carregar dados do Firestore
      await loadUserData(userCredential.user)

      console.log('✅ Login realizado com sucesso')
    } catch (error: any) {
      console.error('❌ Erro no login:', error)
      
      // Mensagens de erro amigáveis
      let errorMessage = 'Erro ao fazer login'
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde'
      }

      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // LOGOUT
  // ============================================

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setUsuario(null)
      setEmpresa(null)
      setCurrentUser(null)
      console.log('✅ Logout realizado com sucesso')
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error)
      throw error
    }
  }

  // ============================================
  // VERIFICAÇÕES DE PERMISSÃO
  // ============================================

  /**
   * Verifica se o usuário pode VER um registro
   */
  const canView = (record: any): boolean => {
    if (!usuario) return false

    // Master vê tudo
    if (isMaster) return true

    // Verifica se é da mesma empresa
    if (record.empresaId !== usuario.empresaId) return false

    // Empresário vê tudo da empresa
    if (isEmpresario) return true

    // Funcionário vê apenas seus registros (ou registros sem dono se tiver permissão)
    if (isFuncionario) {
      return (
        record.atendenteId === usuario.id ||
        record.criadoPor === usuario.id ||
        (!record.atendenteId && canViewFilaGeral)
      )
    }

    return false
  }

  /**
   * Verifica se o usuário pode EDITAR um registro
   */
  const canEdit = (record: any): boolean => {
    if (!usuario) return false

    // Master e Empresário podem editar tudo da empresa
    if (isMaster || isEmpresario) {
      return true
    }

    // Funcionário pode editar apenas seus registros
    if (isFuncionario) {
      return (
        record.empresaId === usuario.empresaId &&
        (record.atendenteId === usuario.id || record.criadoPor === usuario.id)
      )
    }

    return false
  }

  /**
   * Verifica se o usuário pode EXCLUIR um registro
   */
  const canDelete = (record: any): boolean => {
    // Mesma lógica de edição
    return canEdit(record)
  }

  /**
   * Verifica se o usuário pode CRIAR registros
   */
  const canCreate = (): boolean => {
    return usuario !== null
  }

  // ============================================
  // MONITORAR AUTENTICAÇÃO
  // ============================================

  useEffect(() => {
    // Configurar persistência local ANTES de monitorar autenticação
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Erro ao configurar persistência:', error)
    })

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true)

      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          await loadUserData(firebaseUser)
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error)
          // NÃO desloga automaticamente - mantém a sessão
          // O usuário só sai quando clicar explicitamente em "Sair"
        }
      } else {
        setUser(null)
        setUsuario(null)
        setEmpresa(null)
        setCurrentUser(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // ============================================
  // PROVIDER VALUE
  // ============================================

  const value: AuthContextType = {
    // Estado
    user,
    usuario,
    empresa,
    loading,

    // Funções
    signIn,
    signOut,

    // Verificações de perfil
    isMaster,
    isEmpresario,
    isFuncionario,

    // Permissões específicas
    canViewFilaGeral,
    canViewFinanceiroEquipe,
    canViewRelatoriosEmpresa,

    // Helpers
    canView,
    canEdit,
    canDelete,
    canCreate
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================
// HOOK PERSONALIZADO
// ============================================

export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  
  return context
}

// ============================================
// COMPONENTE DE PROTEÇÃO DE ROTA
// ============================================

interface ProtectedRouteProps {
  children: ReactNode
  requiredPerfil?: PerfilUsuario[]
  requiredPermission?: 'verFilaGeral' | 'verFinanceiroEquipe' | 'verRelatoriosEmpresa'
  fallback?: ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPerfil,
  requiredPermission,
  fallback = <div className="p-8 text-center text-red-500">❌ Acesso negado</div>
}) => {
  const { usuario, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!usuario) {
    return <>{fallback}</>
  }

  // Verificar perfil exigido
  if (requiredPerfil && !requiredPerfil.includes(usuario.perfil)) {
    return <>{fallback}</>
  }

  // Verificar permissão específica
  if (requiredPermission) {
    const hasPermission = usuario[requiredPermission] === true
    if (!hasPermission) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

// ============================================
// HOOK DE PERMISSÕES CONDICIONAIS
// ============================================

export const usePermissions = () => {
  const {
    isMaster,
    isEmpresario,
    isFuncionario,
    canViewFilaGeral,
    canViewFinanceiroEquipe,
    canViewRelatoriosEmpresa,
    canView,
    canEdit,
    canDelete,
    canCreate
  } = useAuth()

  return {
    // Perfis
    isMaster,
    isEmpresario,
    isFuncionario,

    // Permissões específicas
    canViewFilaGeral,
    canViewFinanceiroEquipe,
    canViewRelatoriosEmpresa,

    // Verificações de CRUD
    canView,
    canEdit,
    canDelete,
    canCreate,

    // Verificações específicas
    canAccessPainelMaster: isMaster,
    canManageUsers: isMaster || isEmpresario,
    canManageFinanceiro: isMaster || isEmpresario,
    canManageEmpresas: isMaster,
    canViewAllClientes: isMaster || isEmpresario || canViewFilaGeral,
    canViewAllConversas: isMaster || isEmpresario,
    canManageCampanhas: isMaster || isEmpresario,
    canManageModulos: isMaster || isEmpresario
  }
}

export default AuthContext
