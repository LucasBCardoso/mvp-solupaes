import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  ClipboardList,
  Lightbulb,
  Users,
  Store,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../lib/auth';
import { Logo } from './Logo';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', gestorOnly: true },
  { to: '/mapa', icon: Map, label: 'Mapa', gestorOnly: false },
  { to: '/visitas', icon: ClipboardList, label: 'Visitas', gestorOnly: false },
  { to: '/clientes', icon: Store, label: 'Clientes', gestorOnly: false },
  { to: '/estrategias', icon: Lightbulb, label: 'Estratégias', gestorOnly: false },
  { to: '/usuarios', icon: Users, label: 'Usuários', gestorOnly: true },
];

export function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isGestor = user?.role === 'GESTOR' || user?.role === 'ADMIN';

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    logout();
    navigate('/login');
  };

  const visible = navItems.filter((i) => !i.gestorOnly || isGestor);

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="hidden md:flex w-64 shrink-0 bg-slate-900 text-slate-300 flex-col h-full">
        <div className="p-6 border-b border-slate-800/60">
          <Logo />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium',
                  isActive
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-900/30'
                    : 'hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="text-white text-xs font-medium truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800/50">
        <Logo />
        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-slate-800">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-30 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        {visible.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-1 touch-manipulation',
                isActive ? 'text-amber-600' : 'text-slate-500',
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
