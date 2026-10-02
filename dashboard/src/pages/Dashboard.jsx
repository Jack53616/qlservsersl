import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Gift, Crown, Zap, TimerOff, KeyRound, Crown as CrownIcon,
  KeyRound as KeyIcon, UserPlus, Settings as SettingsIcon, Users as UsersIcon
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import { api } from '../lib/api';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';

const COLORS = { paid: '#22ff8c', free: '#3b82f6', active: '#22ff8c', expired: '#ef4444', unused: '#64748b' };

function ChartCard({ title, action, children, delay = 0 }) {
  return (
    <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-ql-text">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { t, lang } = useLang();
  const { admin, isSuperAdmin } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.stats().then(setData).catch(() => {});
  }, []);

  const distributionData = useMemo(() => {
    if (!data) return [];
    return [
      { name: t('paid'), value: data.distribution.paid, color: COLORS.paid },
      { name: t('free'), value: data.distribution.free, color: COLORS.free },
    ];
  }, [data, t]);

  const statusData = useMemo(() => {
    if (!data) return [];
    return [
      { name: t('active'), value: data.subscriptionStatus.active, color: COLORS.active },
      { name: t('expired'), value: data.subscriptionStatus.expired, color: COLORS.expired },
      { name: t('unused'), value: data.subscriptionStatus.unused, color: COLORS.unused },
    ];
  }, [data, t]);

  const totalKeysForDonut = data ? data.totals.totalKeys : 0;
  const totalUsersForDonut = data ? data.totals.totalUsers : 0;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute -top-20 -right-10 w-72 h-72 bg-ql-green/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold">
              {t('welcome_back')} <span className="text-ql-green text-glow">{admin?.name}</span>
            </h1>
            <p className="text-sm text-ql-text-dim mt-1">{t('welcome_sub')}</p>
            <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-ql-green/10 text-ql-green ring-1 ring-ql-green/25">
              {isSuperAdmin ? t('super_admin') : t('admin')}
            </span>
          </div>
          <div className="max-w-xs text-sm text-ql-text-dim italic border-s-2 border-ql-green/40 ps-4 hidden md:block">
            "{t('quote')}"
            <div className="not-italic text-ql-green font-bold mt-1">QL Ai</div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label={t('total_users')} value={data?.totals.totalUsers || 0} color="green" delay={0} />
        <StatCard icon={Gift} label={t('free_users')} value={data?.totals.freeUsers || 0} color="blue" delay={50} />
        <StatCard icon={Crown} label={t('paid_users')} value={data?.totals.paidUsers || 0} color="purple" delay={100} />
        <StatCard icon={Zap} label={t('active_subscriptions')} value={data?.totals.activeSubscriptions || 0} color="green" delay={150} />
        <StatCard icon={TimerOff} label={t('expired_subscriptions')} value={data?.totals.expiredSubscriptions || 0} color="red" delay={200} />
        <StatCard icon={KeyRound} label={t('total_keys')} value={data?.totals.totalKeys || 0} color="orange" delay={250} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ChartCard title={t('user_growth')} delay={100}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.growth || []}>
                <defs>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.paid} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={COLORS.paid} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="freeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.free} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={COLORS.free} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2430" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#8b97a8', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8b97a8', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: '#0c1119', border: '1px solid #1b2430', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="paid" stroke={COLORS.paid} fill="url(#paidGrad)" strokeWidth={2} name={t('paid')} />
                <Area type="monotone" dataKey="free" stroke={COLORS.free} fill="url(#freeGrad)" strokeWidth={2} name={t('free')} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title={t('user_distribution')} delay={150}>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {distributionData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0c1119', border: '1px solid #1b2430', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xl font-extrabold num-tabular">{totalUsersForDonut.toLocaleString()}</div>
              <div className="text-[10px] text-ql-text-dim">{t('total_users')}</div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            {distributionData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                {d.name} <span className="text-ql-text-dim">{d.value}</span>
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title={t('subscription_status')} delay={200}>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0c1119', border: '1px solid #1b2430', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xl font-extrabold num-tabular">{totalKeysForDonut.toLocaleString()}</div>
              <div className="text-[10px] text-ql-text-dim">{t('total_keys')}</div>
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-2 text-xs flex-wrap">
            {statusData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                {d.name} <span className="text-ql-text-dim">{d.value}</span>
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent keys table */}
      <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: '250ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><KeyIcon size={16} className="text-ql-green" /> {t('recent_keys')}</h3>
          <Link to="/keys" className="text-xs text-ql-green hover:underline">{t('view_all')}</Link>
        </div>
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ql-text-dim text-xs text-start border-b border-ql-border">
                <th className="text-start font-medium pb-2 pe-3">{t('key')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('created_by')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('activated_by')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('expires_at')}</th>
                <th className="text-start font-medium pb-2">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentKeys || []).map((k) => (
                <tr key={k.id} className="border-b border-ql-border/50 last:border-0 hover:bg-white/[0.02]">
                  <td className="py-2.5 pe-3 font-mono text-xs text-ql-text">{k.key}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{k.createdBy || '—'}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{k.activatedBy || '—'}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString(lang) : '—'}</td>
                  <td className="py-2.5"><Badge status={k.expired ? 'expired' : k.status} label={t(k.expired ? 'expired' : k.status)} /></td>
                </tr>
              ))}
              {(!data?.recentKeys || data.recentKeys.length === 0) && (
                <tr><td colSpan={5} className="py-6 text-center text-ql-text-dim text-xs">{t('no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isSuperAdmin && (
          <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2"><CrownIcon size={16} className="text-ql-orange" /> {t('top_admins')}</h3>
              <Link to="/admins" className="text-xs text-ql-green hover:underline">{t('view_all')}</Link>
            </div>
            <div className="space-y-2">
              {(data?.topAdmins || []).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ql-orange to-ql-red flex items-center justify-center text-[11px] font-bold shrink-0">
                      {a.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate">{a.name}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-ql-text-dim shrink-0">
                    <span>{a.createdKeys} {t('created_keys')}</span>
                  </div>
                </div>
              ))}
              {(!data?.topAdmins || data.topAdmins.length === 0) && (
                <div className="py-6 text-center text-ql-text-dim text-xs">{t('no_data')}</div>
              )}
            </div>
          </div>
        )}

        <div className={`glass rounded-2xl p-4 animate-fade-up ${isSuperAdmin ? '' : 'lg:col-span-2'}`} style={{ animationDelay: '350ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{t('recent_activity')}</h3>
            <Link to="/activity" className="text-xs text-ql-green hover:underline">{t('view_all')}</Link>
          </div>
          <div className="space-y-3">
            {(data?.recentActivity || []).map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-ql-green mt-2 shrink-0 animate-pulse-dot" />
                <div className="min-w-0">
                  <div className="truncate">{a.message}</div>
                  <div className="text-[11px] text-ql-text-dim">{new Date(a.created_at).toLocaleString(lang)}</div>
                </div>
              </div>
            ))}
            {(!data?.recentActivity || data.recentActivity.length === 0) && (
              <div className="py-6 text-center text-ql-text-dim text-xs">{t('no_data')}</div>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: '400ms' }}>
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Zap size={16} className="text-ql-green" /> {t('quick_actions')}
          </h3>
          <div className="space-y-2.5">
            <QuickAction to="/keys" icon={KeyIcon} title={t('create_key')} sub={t('create_key_sub')} color="green" />
            {isSuperAdmin && <QuickAction to="/admins" icon={UserPlus} title={t('add_admin')} sub={t('add_admin_sub')} color="blue" />}
            <QuickAction to="/users" icon={UsersIcon} title={t('view_users')} sub={t('view_users_sub')} color="purple" />
            <QuickAction to="/settings" icon={SettingsIcon} title={t('system_settings')} sub={t('system_settings_sub')} color="orange" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, sub, color }) {
  const colorMap = {
    green: 'from-ql-green/20 to-ql-green/5 text-ql-green ring-ql-green/20',
    blue: 'from-ql-blue/20 to-ql-blue/5 text-ql-blue ring-ql-blue/20',
    purple: 'from-ql-purple/20 to-ql-purple/5 text-ql-purple ring-ql-purple/20',
    orange: 'from-ql-orange/20 to-ql-orange/5 text-ql-orange ring-ql-orange/20',
  }[color];
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-xl p-3 bg-gradient-to-br ring-1 hover:brightness-110 active:scale-[0.98] transition-all ${colorMap}`}>
      <div className="w-9 h-9 rounded-lg bg-black/25 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ql-text truncate">{title}</div>
        <div className="text-[11px] text-ql-text-dim truncate">{sub}</div>
      </div>
    </Link>
  );
}
