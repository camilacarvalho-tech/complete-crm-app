import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { LogIn, Mail, Lock } from 'lucide-react'

export default function Login() {
  const location = useLocation()
  const destinoLeadsMonitor = location.pathname.includes('leads-monitor')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [recuperar, setRecuperar] = useState(false)
  const [enviandoReset, setEnviandoReset] = useState(false)

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
            perfil: 'MASTER',
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
              { empresaId: 'nexus-homologacao-v1', perfil: 'MASTER', atualizadoEm: new Date() },
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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    if (!email.trim()) {
      setErro('Informe o e-mail da conta')
      return
    }
    setEnviandoReset(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSucesso('Se este e-mail estiver cadastrado, o Firebase envia o link de redefinição. Verifique a caixa de entrada.')
    } catch (error: any) {
      setErro('Não foi possível solicitar a recuperação. Confira o e-mail e tente novamente.')
      console.error(error)
    } finally {
      setEnviandoReset(false)
    }
  }

  const campo = 'w-full px-3 py-2.5 rounded-lg text-sm outline-none'
  const campoStyle = { background: 'var(--code-bg)', color: 'var(--code-text)', border: '1px solid var(--code-border)' }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(circle at top, #1a2744 0%, #070b16 55%)' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-7" style={{ background: 'var(--code-surface)', border: '1px solid var(--code-border)', boxShadow: '0 24px 60px rgba(0,0,0,.35)' }}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: 'linear-gradient(135deg, #f97316, #2563eb)' }}>
              <span className="text-xl font-black text-white">NX</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--code-text)' }}>Nexus CRM</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--code-muted)' }}>CODE Tecnologia</p>
            {destinoLeadsMonitor && (
              <p className="mt-2 text-xs" style={{ color: 'var(--code-muted)' }}>Entrada do Leads Monitor</p>
            )}
          </div>

          {recuperar ? (
          <form onSubmit={handleReset} className="space-y-6">
            <p className="text-sm" style={{ color: 'var(--code-muted)' }}>
              Recuperação via Firebase Authentication. Informe o e-mail da conta para receber o link.
            </p>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--code-muted)' }}>
                <Mail className="inline w-4 h-4 mr-2" />
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={campo}
                style={campoStyle}
                placeholder="seu@email.com"
              />
            </div>
            {erro && (
              <div className="px-3 py-2 rounded-lg text-sm" style={{ color: '#fecaca', border: '1px solid #7f1d1d' }}>{erro}</div>
            )}
            {sucesso && (
              <div className="px-3 py-2 rounded-lg text-sm" style={{ color: '#bbf7d0', border: '1px solid #14532d' }}>{sucesso}</div>
            )}
            <button
              type="submit"
              disabled={enviandoReset}
              className="w-full bg-gradient-to-r from-orange-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
            >
              {enviandoReset ? 'Enviando...' : 'Solicitar recuperação'}
            </button>
            <button
              type="button"
              onClick={() => { setRecuperar(false); setErro(''); setSucesso('') }}
              className="w-full text-sm font-semibold"
              style={{ color: 'var(--code-muted)' }}
            >
              Voltar ao login
            </button>
          </form>
          ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--code-muted)' }}>
                <Mail className="inline w-4 h-4 mr-2" />
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={campo}
                style={campoStyle}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--code-muted)' }}>
                <Lock className="inline w-4 h-4 mr-2" />
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className={campo}
                style={campoStyle}
                placeholder="••••••••"
              />
            </div>

            {erro && (
              <div className="px-3 py-2 rounded-lg text-sm" style={{ color: '#fecaca', border: '1px solid #7f1d1d' }}>
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="px-3 py-2 rounded-lg text-sm" style={{ color: '#bbf7d0', border: '1px solid #14532d' }}>
                {sucesso}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setRecuperar(true); setErro(''); setSucesso('') }}
              className="text-sm font-semibold"
              style={{ color: 'var(--code-orange)' }}
            >
              Esqueci minha senha
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          )}

          <div className="mt-6 text-center text-[11px]" style={{ color: 'var(--code-muted)' }}>
            <a href="https://codetechoficial.com.br/" target="_blank" rel="noreferrer" className="font-semibold" style={{ color: 'var(--code-orange)' }}>
              codetechoficial.com.br
            </a>
            <p className="mt-1">© 2026 Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </div>
  )
}
