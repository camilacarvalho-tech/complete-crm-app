import { Outlet } from 'react-router-dom'

export default function ERPLayout() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  )
}
