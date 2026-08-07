import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, TrendingUp, CheckSquare, BarChart3, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase";
import logo from "../../../assets/LOGO RECOMECE.png";

const navItems = [
  { to: "/",           icon: LayoutDashboard, label: "Painel" },
  { to: "/clientes",   icon: Users,           label: "Clientes" },
  { to: "/pipeline",   icon: TrendingUp,      label: "Funil de Vendas" },
  { to: "/tarefas",    icon: CheckSquare,     label: "Atendimentos" },
  { to: "/relatorios", icon: BarChart3,       label: "Relatórios" },
];

export function Sidebar() {
  async function handleLogout() {
    await signOut(auth);
    window.location.reload();
  }

  return (
    <div
      className="w-60 h-screen fixed left-0 top-0 flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0f0c29 0%, #302b63 60%, #24243e 100%)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden bg-white"
          >
            <img src={logo} alt="Recomece Cred" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight">Recomece Cred</h1>
            <p className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>CRM Oficial</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px] font-medium ${
                isActive ? 'text-white' : 'text-white/50 hover:text-white/90 hover:bg-white/5'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'linear-gradient(90deg, #f59e0b33, #ef444422)', borderLeft: '3px solid #f59e0b', paddingLeft: '9px' }
                : { borderLeft: '3px solid transparent' }
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sair */}
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
  );
}
