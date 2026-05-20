import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  CheckSquare,
  FileText,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/strategy', icon: Search, label: '전략 분석' },
  { to: '/tasks', icon: CheckSquare, label: '개선 과제' },
  { to: '/report', icon: FileText, label: '보고서' },
  { to: '/settings', icon: Settings, label: '설정' },
];

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 hidden md:flex flex-col bg-navy-900 border-r border-white/10">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <span className="text-navy-900 font-bold text-sm">W</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">WOS</p>
            <p className="text-slate-400 text-xs mt-0.5">오프보딩 분석</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-teal-500/15 text-teal-400 font-medium border border-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-slate-500 text-xs">v1.0.0 · WOS HR</p>
      </div>
    </aside>
  );
}
