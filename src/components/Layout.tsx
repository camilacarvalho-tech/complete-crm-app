import { Outlet } from 'react-router-dom'
import { Sidebar } from '../app/components/layout/Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 ml-60">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
