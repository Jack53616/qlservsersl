import { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../context/LangContext';
import Badge from '../components/Badge';

export default function UsersPage() {
  const { t, lang } = useLang();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [filters, setFilters] = useState({ q: '', status: '', billing: '' });

  const load = useCallback(() => {
    api.users({ ...filters, page, pageSize }).then((res) => {
      setItems(res.items);
      setTotal(res.total);
    }).catch(() => {});
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{t('nav_users')}</h1>

      <div className="glass rounded-2xl p-4 animate-fade-up">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 start-3 text-ql-text-dim" />
            <input
              value={filters.q}
              onChange={(e) => { setPage(0); setFilters((f) => ({ ...f, q: e.target.value })); }}
              placeholder={t('search')}
              className="w-full bg-black/25 border border-ql-border rounded-xl py-2 ps-9 pe-3 text-sm outline-none focus:border-ql-green/50"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => { setPage(0); setFilters((f) => ({ ...f, status: e.target.value })); }}
            className="bg-black/25 border border-ql-border rounded-xl py-2 px-3 text-sm outline-none focus:border-ql-green/50"
          >
            <option value="">{t('filter_by_status')}</option>
            {['active', 'expired', 'revoked'].map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
          <select
            value={filters.billing}
            onChange={(e) => { setPage(0); setFilters((f) => ({ ...f, billing: e.target.value })); }}
            className="bg-black/25 border border-ql-border rounded-xl py-2 px-3 text-sm outline-none focus:border-ql-green/50"
          >
            <option value="">{t('filter_by_billing')}</option>
            <option value="free">{t('free')}</option>
            <option value="paid">{t('paid')}</option>
          </select>
        </div>

        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ql-text-dim text-xs border-b border-ql-border">
                <th className="text-start font-medium pb-2 pe-3">{t('name')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('billing')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('key')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('created_by')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('activated_at')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('expires_at')}</th>
                <th className="text-start font-medium pb-2">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-ql-border/50 last:border-0 hover:bg-white/[0.02]">
                  <td className="py-2.5 pe-3 font-medium">{u.displayName || '—'}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{t(u.billing)}</td>
                  <td className="py-2.5 pe-3 font-mono text-xs text-ql-text-dim">{u.key}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{u.createdBy || '—'}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{u.activatedAt ? new Date(u.activatedAt).toLocaleDateString(lang) : '—'}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{u.expiresAt ? new Date(u.expiresAt).toLocaleDateString(lang) : (u.plan === 'lifetime' ? '∞' : '—')}</td>
                  <td className="py-2.5"><Badge status={u.expired ? 'expired' : u.status} label={t(u.expired ? 'expired' : u.status)} /></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-ql-text-dim text-xs">{t('no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-ql-text-dim">
          <span>{total} {t('total_users')}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg glass disabled:opacity-40">‹</button>
            <span className="px-3 py-1.5">{page + 1} / {pages}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg glass disabled:opacity-40">›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
