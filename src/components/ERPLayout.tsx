import { Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import ERPSidebar from './ERPSidebar'
import TopBar from './TopBar'
import { useState } from 'react'

export default function ERPLayout() {
  const { darkMode } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50'
    }`}>
      <ERPSidebar onCollapse={setSidebarCollapsed} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <TopBar />
        <main className="flex-1 p-8 flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className={`mt-8 pt-4 border-t text-center text-xs ${
            darkMode ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-500'
          }`}>
            Nexus ERP – Sistema Integrado de Gestão | Desenvolvido por CODE TECNOLOGIA EMPRESARIAL
          </footer>
        </main>
      </div>
    </div>
  )
}
