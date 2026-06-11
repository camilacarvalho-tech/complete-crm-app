import { NavLink } from 'react-router-dom';

import {
  LayoutDashboard,
  Users,
  TrendingUp,
  CheckSquare,
  BarChart3,
  Settings,
  Building2
} from 'lucide-react';

import { signOut } from 'firebase/auth';
import { auth } from '../../../firebase';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
  { to: '/tarefas', icon: CheckSquare, label: 'Tarefas' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
];

export function Sidebar() {
  async function handleLogout() {
    await signOut(auth);

    window.location.reload();
  }

  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-400" />

          <div>
            <h1 className="text-xl font-bold">CRM Pro</h1>

            <p className="text-xs text-gray-400">
              Sistema de Gestão
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />

                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <Settings className="w-5 h-5" />

          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}