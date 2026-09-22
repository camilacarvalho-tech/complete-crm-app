import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '../app/components/layout/Sidebar'
import { LeticiaWorker } from './LeticiaWorker'
import { GlobalSearchHost } from './layout/AppHeader'
import { ThemeToggle } from './layout/ThemeToggle'
import { useAppearance } from '../contexts/ThemeContext'
import { ErrorBoundary } from './ErrorBoundary'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { sidebarCollapsed } = useAppearance()
  return (
    <div className="flex min-h-screen nexus-shell">
      <LeticiaWorker />
      <div className={`${open ? 'block' : 'hidden'} md:block`}>
        <Sidebar />
      </div>
      <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-3 py-3 text-white" style={{ background: 'var(--code-sidebar)' }}>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">Nexus · CODE</span>
          <div className="ml-auto">
            <ThemeToggle className="!p-1.5" />
          </div>
        </header>
        <GlobalSearchHost />
        <main className="p-3 md:p-4" onClick={() => setOpen(false)}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
