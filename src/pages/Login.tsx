import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react'
import { PerfilUsuario } from '../types/database.types'

export default function Login() {
  const location = useLocation()
  const destinoLeadsMonitor = location.pathname.includes('leads-monitor')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha)
      const normalized = email.trim().toLowerCase()
      const masterEmails = new Set(['carvalhoduraocamila@gmail.com', 'laiane26022@gmail.com'])
      const userRef = doc(db, 'usuarios', userCredential.user.uid)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists() && masterEmails.has(normalized)) {
        try {
          await setDoc(userRef, {
            empresaId: 'nexus-homologacao-v1',
            nome: normalized === 'carvalhoduraocamila@gmail.com' ? 'Camila Carvalho' : normalized.split('@')[0],
            email: normalized,
            telefone: '',
            avatar: '',
            perfil: PerfilUsuario.MASTER,
            verFilaGeral: true,
            verFinanceiroEquipe: true,
            verRelatoriosEmpresa: true,
            ativo: true,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          })
          setSucesso('Conta Master vinculada à empresa. Entrando...')
        } catch (persistErr) {
          console.warn('Bootstrap Master: sessão seguirá via AuthContext', persistErr)
        }
      } else if (userDoc.exists() && masterEmails.has(normalized)) {
        const data = userDoc.data()
        if (!data?.empresaId) {
          try {
            await setDoc(
              userRef,
              { empresaId: 'nexus-homologacao-v1', perfil: PerfilUsuario.MASTER, atualizadoEm: new Date() },
              { merge: true }
            )
          } catch {
            /* AuthContext completa o vínculo */
          }
        }
      }
    } catch (error: any) {
      setErro('E-mail ou senha incorretos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-orange-500 to-blue-600 rounded-xl p-4 mb-4">
              <span className="text-4xl font-bold text-white">NX</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Nexus CRM</h1>
            <p className="text-slate-600 mt-2">Gestão Inteligente</p>
            {destinoLeadsMonitor && (
              <div className="mt-4 text-left bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-lg px-3 py-2">
                Faça login para abrir o <strong>Nexus Leads Monitor</strong> e validar o fluxo completo.
              </div>
            )}
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Mail className="inline w-4 h-4 mr-2" />
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Lock className="inline w-4 h-4 mr-2" />
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {sucesso}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            
            {/* Botão de Teste */}
            <button
              type="button"
              onClick={() => {
                setEmail('carvalhoduraocamila@gmail.com')
                setSenha('')
              }}
              className="w-full bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold hover:bg-slate-300 transition text-sm"
            >
              Preencher e-mail Master
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-slate-500">
            <p>Desenvolvido por <span className="font-semibold text-orange-600">CodeFlow Tecnologia</span></p>
            <p className="mt-1">© 2026 Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </div>
  )
}
