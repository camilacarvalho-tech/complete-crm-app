import { Bell, Search, User } from 'lucide-react';

export function Header({ title }: { title: string }) {
  return (
    <header className="bg-white border-b border-gray-100 h-16 fixed top-0 left-64 right-0 z-10 shadow-sm">
      <div className="h-full px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, #f97316, #ef4444)' }} />
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 w-72"
              style={{ '--tw-ring-color': '#f97316' } as any}
            />
          </div>
          <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Administrador</p>
              <p className="text-xs text-gray-400">admin@crm.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
