import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase'
import { MENU_SECTIONS, type MenuItem } from '../../../config/menuConfig'
import { useAuth } from '../../../contexts/AuthContext'
import { useAppearance } from '../../../contexts/ThemeContext'
import { useNexusStore } from '../../../contexts/NexusStore'
import { canAccessPath } from '../../../lib/nexusCore'

function SidebarLink({ item, collapsed }: { item: MenuItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] font-medium ${
          isActive
            ? 'text-white bg-white/10'
            : item.featured
              ? 'text-white/80 hover:text-white hover:bg-white/5'
              : 'text-white/55 hover:text-white hover:bg-white/5'
        }`
      }
    >
      <item.icon className={`w-4 h-4 flex-shrink-0 ${item.featured ? 'text-orange-400' : ''}`} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">{item.badge}</span>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const { usuario } = useAuth()
  const { sidebarCollapsed, setSidebarCollapsed } = useAppearance()
  const { conversas, agenda } = useNexusStore()
  const unreadChat = conversas.items.filter((c) => Number(c.naoLidas || 0) > 0 && c.canal !== 'interno').length
  const overdueTasks = agenda.items.filter((a) => String(a.status || '') === 'atrasada').length

  async function handleLogout() {
    await signOut(auth)
    window.location.reload()
  }

  return (
    <div className={`${sidebarCollapsed ? 'w-16' : 'w-60'} h-screen fixed left-0 top-0 flex flex-col nexus-sidebar z-20 transition-[width]`}>
      <div className="px-3 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 nexus-cta">
            <span className="text-white font-black text-sm">NX</span>
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-sm font-black text-white leading-tight">Nexus CRM</h1>
              <p className="text-[11px] font-semibold text-orange-400">CODE Tecnologia</p>
            </div>
          )}
        </div>
        <button type="button" className="mt-3 text-white/50 hover:text-white" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}>
          {sidebarCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {MENU_SECTIONS.map((section) => {
          const items = section.items.filter((item) => canAccessPath(usuario?.perfil, item.path))
          if (!items.length) return null
          return (
            <div key={section.title} className="mb-3">
                    {!sidebarCollapsed && <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{section.title}</p>}
              {items.map((item) => {
                const badge = item.path === '/whatsapp' && unreadChat ? String(unreadChat) : item.path === '/tarefas' && overdueTasks ? String(overdueTasks) : item.badge
                return <SidebarLink key={item.path} item={{ ...item, badge }} collapsed={sidebarCollapsed} />
              })}
            </div>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        {!sidebarCollapsed && <p className="px-3 mb-2 text-[11px] text-white/40 truncate">{usuario?.nome || usuario?.email}</p>}
        <button
          onClick={handleLogout}
          title="Sair"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all w-full text-[13px] font-medium"
        >
          <LogOut className="w-4 h-4" />
          {!sidebarCollapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  )
}
