import { Bell, Search, User } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useState } from 'react'

export default function TopBar() {
  const { darkMode } = useTheme()
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false)
  
  const notificacoes = [
    { id: 1, texto: '3 novos leads aguardando atendimento', tipo: 'info', lida: false },
    { id: 2, texto: 'Cliente João Silva enviou documentação', tipo: 'success', lida: false },
    { id: 3, texto: '2 propostas aguardando aprovação', tipo: 'warning', lida: true },
  ]

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return (
    <div className={`sticky top-0 z-40 flex items-center justify-between px-8 py-4 border-b ${
      darkMode 
        ? 'bg-slate-900/95 border-slate-700 backdrop-blur-sm' 
        : 'bg-white/95 border-slate-200 backdrop-blur-sm'
    }`}>
      {/* Busca */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-slate-400' : 'text-slate-400'
          }`} />
          <input
            type="text"
            placeholder="Buscar clientes, propostas..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-all ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-orange-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'
            } focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-4 ml-6">
        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => setNotificacoesAbertas(!notificacoesAbertas)}
            className={`relative p-2 rounded-lg transition-all ${
              darkMode
                ? 'hover:bg-slate-800 text-slate-300'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Bell className="w-6 h-6" />
            {naoLidas > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {naoLidas}
              </span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {notificacoesAbertas && (
            <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border overflow-hidden ${
              darkMode
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-slate-200'
            }`}>
              <div className={`px-4 py-3 border-b font-semibold ${
                darkMode ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-800'
              }`}>
                Notificações ({naoLidas} não lidas)
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notificacoes.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b transition-colors ${
                      darkMode
                        ? 'border-slate-700 hover:bg-slate-700/50'
                        : 'border-slate-100 hover:bg-slate-50'
                    } ${!notif.lida ? (darkMode ? 'bg-slate-700/30' : 'bg-blue-50') : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                        !notif.lida ? 'bg-blue-500' : 'bg-transparent'
                      }`}></div>
                      <div className="flex-1">
                        <p className={`text-sm ${
                          darkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>{notif.texto}</p>
                        <p className={`text-xs mt-1 ${
                          darkMode ? 'text-slate-500' : 'text-slate-500'
                        }`}>Há 5 minutos</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`px-4 py-3 text-center border-t ${
                darkMode ? 'border-slate-700' : 'border-slate-200'
              }`}>
                <button className={`text-sm font-semibold ${
                  darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'
                }`}>
                  Ver todas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Perfil */}
        <button className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
          darkMode
            ? 'hover:bg-slate-800 text-slate-300'
            : 'hover:bg-slate-100 text-slate-600'
        }`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            U
          </div>
          <div className="text-left hidden md:block">
            <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Usuário
            </p>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Admin
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
