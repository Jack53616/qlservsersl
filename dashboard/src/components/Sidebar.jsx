import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, KeyRound, Users, ShieldCheck, History, Settings, Circle
} from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onNavigate }) {
  const { t } = useLang();
  const { isSuperAdmin } = useAuth();

  const items = [
    { to: '/', icon: LayoutDashboard, label: t('nav_dashboard'), end: true },
    { to: '/keys', icon: KeyRound, label: t('nav_keys') },
    { to: '/users', icon: Users, label: t('nav_users') },
    ...(isSuperAdmin ? [{ to: '/admins', icon: ShieldCheck, label: t('nav_admins') }] : []),
    { to: '/activity', icon: History, label: t('nav_activity') },
    { to: '/settings', icon: Settings, label: t('nav_settings') },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl glass glow-green flex items-center justify-center shrink-0 overflow-hidden">
          <img src="./logo.png" alt="QL Ai" className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="font-extrabold text-ql-text leading-tight">{t('brand')}</div>
          <div className="text-[11px] text-ql-text-dim leading-tight">{t('brandSub')}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none">
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 relative overflow-hidden ${
                isActive
                  ? 'bg-ql-green/10 text-ql-green border border-ql-green/25 shadow-[0_0_20px_-6px_rgba(34,255,140,0.35)]'
                  : 'text-ql-text-dim hover:text-ql-text hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-2xl glass p-4 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-ql-green/15 rounded-full blur-2xl" />
        <div className="relative">
          <img src="./logo.png" alt="QL Ai" className="w-10 h-10 rounded-xl mb-2 object-cover" />
          <div className="font-bold text-sm">{t('brand')}</div>
          <div className="text-[11px] text-ql-text-dim">Smart Trading · Better Future</div>
        </div>
      </div>

      <div className="px-5 pb-5 text-[11px] text-ql-text-dim flex items-center justify-between">
        <span>{t('version')} 1.0</span>
        <span className="flex items-center gap-1.5">
          <Circle size={8} className="fill-ql-green text-ql-green animate-pulse-dot" />
          Online
        </span>
      </div>
    </div>
  );
}
