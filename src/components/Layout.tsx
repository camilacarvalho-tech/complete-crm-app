import { Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useState } from 'react'

export default function Layout() {
  const { darkMode } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-slate-950' 
        : 'bg-gradient-to-br from-orange-50 via-blue-50 to-green-50'
    }`}>
      <Sidebar onCollapse={setSidebarCollapsed} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <TopBar />
        <main className="flex-1 p-8 flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className={`mt-8 pt-4 border-t text-center text-xs ${
            darkMode ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-500'
          }`}>
            Nexus CRM – Gestão Inteligente | Desenvolvido por CODE TECNOLOGIA EMPRESARIAL | Todos os direitos reservados
          </footer>
        </main>
      </div>
    </div>
  )
}
