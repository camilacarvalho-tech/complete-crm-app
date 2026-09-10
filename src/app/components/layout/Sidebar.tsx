import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase'
import { getSidebarNav, type MenuItem } from '../../../config/menuConfig'

const OUTROS_NICHOS_STORAGE_KEY = 'nexus-sidebar-outros-nichos-open'

function readOutrosNichosOpen(): boolean {
  try {
    return window.localStorage.getItem(OUTROS_NICHOS_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeOutrosNichosOpen(open: boolean) {
  try {
    window.localStorage.setItem(OUTROS_NICHOS_STORAGE_KEY, open ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}

function SidebarLink({ item }: { item: MenuItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px] font-medium ${
          isActive
            ? 'text-white bg-white/10'
            : item.featured
              ? 'text-white/80 hover:text-white hover:bg-white/5'
              : 'text-white/55 hover:text-white hover:bg-white/5'
        }`
      }
    >
      <item.icon className={`w-4 h-4 flex-shrink-0 ${item.featured ? 'text-orange-400' : ''}`} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">
          {item.badge}
        </span>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const location = useLocation()
  const { principal, outrosNichos } = getSidebarNav()
  const [outrosOpen, setOutrosOpen] = useState(false)
  const outrosActive = outrosNichos.some(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  )

  useEffect(() => {
    setOutrosOpen(readOutrosNichosOpen())
  }, [])

  function toggleOutrosNichos() {
    setOutrosOpen((current) => {
      const next = !current
      writeOutrosNichosOpen(next)
      return next
    })
  }

  async function handleLogout() {
    await signOut(auth)
    window.location.reload()
  }

  return (
    <div className="w-60 h-screen fixed left-0 top-0 flex flex-col bg-slate-950">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-orange-500 to-blue-600">
            <span className="text-white font-black text-sm">NX</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight">Nexus CRM</h1>
            <p className="text-[11px] font-semibold text-orange-400">CODE Tecnologia</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {principal.map((item) => (
          <SidebarLink key={item.path} item={item} />
        ))}

        {outrosNichos.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={toggleOutrosNichos}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px] font-medium w-full ${
                outrosActive
                  ? 'text-white bg-white/10'
                  : 'text-white/55 hover:text-white hover:bg-white/5'
              }`}
              aria-expanded={outrosOpen}
            >
              <ChevronDown
                className={`w-4 h-4 flex-shrink-0 transition-transform ${outrosOpen ? '' : '-rotate-90'}`}
              />
              <span className="flex-1 text-left">Outros Nichos</span>
            </button>

            {outrosOpen && (
              <div className="space-y-0.5 mt-0.5">
                {outrosNichos.map((item) => (
                  <SidebarLink key={item.path} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all w-full text-[13px] font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}
