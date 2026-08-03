import { useState } from 'react';
import { User, Lock, Bell, Palette, Settings as SettingsIcon } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../../firebase';


type Tab = 'profile' | 'password' | 'notifications' | 'appearance' | 'system';

export function Configuracoes() {
  const [activeTab, setActiveTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const tabs = [
    { id: 'profile' as Tab, label: 'Perfil', icon: User },
    { id: 'password' as Tab, label: 'Redefinir Senha', icon: Lock },
    { id: 'notifications' as Tab, label: 'Notificações', icon: Bell },
    { id: 'appearance' as Tab, label: 'Aparência', icon: Palette },
    { id: 'system' as Tab, label: 'Sistema', icon: SettingsIcon },
  ];

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de redefinição.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A2332 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #1A8B9D 50%, #2ECC71 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Configurações
        </h1>

        <div className="flex gap-6">
          {/* Sidebar com as tabs */}
          <div className="w-64 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                  activeTab === tab.id ? '' : 'hover:bg-white/5'
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        background: 'linear-gradient(90deg, rgba(255, 107, 53, 0.1) 0%, rgba(26, 139, 157, 0.15) 50%, rgba(46, 204, 113, 0.1) 100%)',
                        borderLeft: '3px solid #1A8B9D',
                        paddingLeft: '13px',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(26, 139, 157, 0.2)',
                      }
                    : {
                        borderLeft: '3px solid transparent',
                        color: '#A8B2C1',
                      }
                }
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Conteúdo da tab ativa */}
          <div className="flex-1 bg-[#0F1921]/50 backdrop-blur-sm rounded-xl p-6 border" style={{ borderColor: 'rgba(26, 139, 157, 0.2)' }}>
            {activeTab === 'password' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Redefinir Senha</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Digite seu e-mail abaixo para receber um link de redefinição de senha.
                </p>

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu-email@exemplo.com"
                      className="w-full px-4 py-3 rounded-lg bg-[#0A1628] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A8B9D]"
                      style={{
                        borderColor: 'rgba(26, 139, 157, 0.3)',
                      }}
                    />
                  </div>

                  {message && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                      {message}
                    </div>
                  )}

                  {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{
                      background: 'linear-gradient(135deg, #FF6B35 0%, #1A8B9D 50%, #2ECC71 100%)',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
                    }}
                  >
                    {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Perfil</h2>
                <p className="text-gray-400">Em breve: edição de perfil, foto, nome, etc.</p>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Notificações</h2>
                <p className="text-gray-400">Em breve: preferências de notificações por e-mail, push, etc.</p>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Aparência</h2>
                <p className="text-gray-400">Em breve: temas claro/escuro, cores personalizadas, etc.</p>
              </div>
            )}

            {activeTab === 'system' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Sistema</h2>
                <p className="text-gray-400">Em breve: configurações de nicho (ex: Clínica Veterinária), integrações, etc.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-400">
          <p>Desenvolvido por <span className="font-semibold" style={{ color: '#1A8B9D' }}>CodeFlow Tecnologia</span></p>
          <p className="mt-1">© 2026 CodeFlow Tecnologia. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
