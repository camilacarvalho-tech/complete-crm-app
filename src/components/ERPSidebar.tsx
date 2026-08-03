import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import {
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  // Ícones dos módulos ERP
  LayoutDashboard,
  DollarSign,
  CreditCard,
  Receipt,
  Users,
  Building2,
  Package,
  ShoppingCart,
  TrendingUp,
  FileText,
  UsersRound,
  Calendar,
  FolderOpen,
  BarChart3,
  Settings,
} from 'lucide-react'
import { useState } from 'react'

interface ERPSidebarProps {
  onCollapse?: (collapsed: boolean) => void
}

interface ERPMenuItem {
  path: string
  icon: any
  label: string
}

// 13 SUBMÓDULOS DO ERP (removido: Clientes, Agenda, Relatórios | adicionado: Patrimônio, Auditoria)
const ERP_MENU_ITEMS: ERPMenuItem[] = [
  { path: '/erp', icon: LayoutDashboard, label: 'Dashboard ERP' },
  { path: '/erp/financeiro-completo', icon: DollarSign, label: 'Fluxo de Caixa' },
  { path: '/erp/recebimentos', icon: CreditCard, label: 'Recebimentos' },
  { path: '/erp/contas-pagar', icon: Receipt, label: 'Contas a Pagar' },
  { path: '/erp/dre', icon: BarChart3, label: 'DRE' },
  { path: '/erp/faturamento', icon: TrendingUp, label: 'Faturamento' },
  { path: '/erp/fornecedores', icon: Building2, label: 'Fornecedores' },
  { path: '/erp/estoque', icon: Package, label: 'Estoque' },
  { path: '/erp/compras', icon: ShoppingCart, label: 'Compras' },
  { path: '/erp/vendas', icon: TrendingUp, label: 'Vendas' },
  { path: '/erp/contratos', icon: FileText, label: 'Contratos' },
  { path: '/erp/rh', icon: UsersRound, label: 'RH' },
  { path: '/erp/documentos', icon: FolderOpen, label: 'Documentos' },
  { path: '/erp/patrimonio', icon: Building2, label: 'Patrimônio' },
  { path: '/erp/auditoria', icon: BarChart3, label: 'Auditoria' },
  { path: '/erp/configuracoes', icon: Settings, label: 'Configurações' },
]

export default function ERPSidebar({ onCollapse }: ERPSidebarProps) {
  const navigate = useNavigate()
  const { darkMode, setDarkMode, zoomLevel, setZoomLevel } = useTheme()
  const { empresa } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    if (window.confirm('Deseja sair do sistema?')) {
      await signOut(auth)
      navigate('/')
    }
  }

  const handleCollapse = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    if (onCollapse) onCollapse(newCollapsed)
  }

  const handleZoomIn = () => {
    if (zoomLevel < 1.1) {
      setZoomLevel(Math.min(zoomLevel + 0.05, 1.1))
    }
  }

  const handleZoomOut = () => {
    if (zoomLevel > 0.7) {
      setZoomLevel(Math.max(zoomLevel - 0.05, 0.7))
    }
  }

  const handleResetZoom = () => {
    setZoomLevel(0.85)
  }

  const voltarParaCRM = () => {
    navigate('/')
  }

  return (
    <aside className={`fixed left-0 top-0 h-screen shadow-2xl flex flex-col transition-all duration-300 ${
      collapsed ? 'w-20' : 'w-72'
    } ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-white'
    }`}>
      {/* Header com Gradiente Roxo/Azul (diferente do CRM) */}
      <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 p-5 shadow-2xl overflow-hidden">
        {/* Efeitos de brilho animados */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-blue-400/20 to-indigo-400/30 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/30 rounded-full blur-2xl"></div>
        
        <div className={`relative flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {!collapsed && (
            <>
              <div className="bg-white rounded-xl p-2.5 shadow-2xl ring-4 ring-white/40 backdrop-blur-sm">
                <span className="text-2xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  ERP
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <h1 className="text-white text-xl font-black drop-shadow-2xl tracking-tight truncate">
                  Sistema ERP
                </h1>
                <p className="text-purple-100 text-xs font-semibold drop-shadow-lg truncate">
                  {empresa?.nomeFantasia || 'Gestão Integrada'}
                </p>
              </div>
            </>
          )}
          {collapsed && (
            <div className="bg-white rounded-xl p-2 shadow-2xl ring-4 ring-white/40">
              <span className="text-lg font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                ERP
              </span>
            </div>
          )}
        </div>

        {/* Botão Collapse/Expand */}
        <button
          onClick={handleCollapse}
          className={`absolute bottom-3 ${collapsed ? 'left-1/2 -translate-x-1/2' : 'right-3'} p-1.5 rounded-lg transition-all hover:scale-110 bg-white/90 text-purple-600 hover:bg-white shadow-lg backdrop-blur-sm`}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Botão Voltar para CRM + Controles */}
      {!collapsed && (
        <div className={`p-3 border-b ${
          darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
        }`}>
          {/* Botão Voltar para CRM */}
          <button
            onClick={voltarParaCRM}
            className={`w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all hover:scale-[1.02] ${
              darkMode
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar para CRM</span>
          </button>

          <div className="flex items-center justify-between">
            {/* Botão Dark/Light Mode */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                darkMode
                  ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
                  : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 hover:from-slate-300 hover:to-slate-400'
              } shadow-md`}
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Botões de Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.7}
                className={`p-1 rounded transition-all ${
                  zoomLevel <= 0.7 
                    ? 'text-slate-400 cursor-not-allowed' 
                    : darkMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Diminuir"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  darkMode
                    ? 'text-slate-300 hover:bg-slate-700'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Resetar Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 1.1}
                className={`p-1 rounded transition-all ${
                  zoomLevel >= 1.1 
                    ? 'text-slate-400 cursor-not-allowed' 
                    : darkMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Aumentar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu ERP */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {ERP_MENU_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/erp'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all font-medium ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 via-purple-700 to-blue-700 text-white shadow-xl scale-[1.02]'
                  : darkMode
                  ? 'text-slate-300 hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-600 hover:scale-[1.02]'
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:scale-[1.02]'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : ''}
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={`p-3 border-t ${
        darkMode ? 'border-slate-700' : 'border-slate-200'
      }`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all hover:scale-[1.02] font-medium ${
            darkMode
              ? 'text-red-400 hover:bg-slate-700'
              : 'text-red-600 hover:bg-red-50'
          } ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Sair do Sistema' : ''}
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          {!collapsed && <span>Sair do Sistema</span>}
        </button>
        
        {!collapsed && (
          <div className={`mt-3 text-center text-[10px] leading-tight ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <p className="font-semibold">Nexus ERP – Sistema Integrado</p>
            <p>Desenvolvido por CodeFlow Tecnologia</p>
            <p className="mt-0.5">© 2026 Todos os direitos reservados</p>
          </div>
        )}
      </div>
    </aside>
  )
}
