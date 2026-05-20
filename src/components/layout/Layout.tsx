import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Search, CheckSquare, FileText, Settings,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/Toast';

const BOTTOM_NAV = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/strategy', icon: Search, label: '전략' },
  { to: '/tasks', icon: CheckSquare, label: '과제' },
  { to: '/report', icon: FileText, label: '보고서' },
  { to: '/settings', icon: Settings, label: '설정' },
];

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-navy-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex bg-navy-900 border-t border-white/10">
        {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${
                isActive ? 'text-teal-400' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <ToastContainer />
    </div>
  );
}
