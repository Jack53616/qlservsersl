import { useEffect, useState, useCallback } from 'react';
import { Plus, Copy, Check, MoreVertical, Trash2, Ban, Search, LogOut } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../context/LangContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

const PLAN_OPTIONS = ['minute', 'daily', 'weekly', 'monthly', 'lifetime'];

export default function Keys() {
  const { t, lang } = useLang();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [filters, setFilters] = useState({ q: '', status: '', billing: '', plan: '' });
  const [openMenu, setOpenMenu] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlan, setNewPlan] = useState('monthly');
  const [newBilling, setNewBilling] = useState('paid');
  const [createdKey, setCreatedKey] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.keys({ ...filters, page, pageSize }).then((res) => {
      setItems(res.items);
      setTotal(res.total);
    }).catch(() => {});
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  function copy(row) {
    navigator.clipboard?.writeText(row.key).catch(() => {});
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function createKey() {
    setBusy(true);
    try {
      const res = await api.createKey(newPlan, newBilling);
      setCreatedKey(res.key);
      load();
    } catch (_) {} finally {
      setBusy(false);
    }
  }

  async function doAction(row, action, extra = {}) {
    setOpenMenu(null);
    try {
      await api.patchKey(row.id, { action, ...extra });
      load();
    } catch (_) {}
  }

  async function doDelete(row) {
    setOpenMenu(null);
    try {
      await api.deleteKey(row.id);
      load();
    } catch (_) {}
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold">{t('nav_keys')}</h1>
        <button
          onClick={() => { setCreateOpen(true); setCreatedKey(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-ql-green to-ql-green-soft text-black font-semibold text-sm rounded-xl px-4 py-2 hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus size={16} /> {t('create_key')}
        </button>
      </div>

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
            {['unused', 'active', 'expired', 'revoked'].map((s) => <option key={s} value={s}>{t(s)}</option>)}
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
          <select
            value={filters.plan}
            onChange={(e) => { setPage(0); setFilters((f) => ({ ...f, plan: e.target.value })); }}
            className="bg-black/25 border border-ql-border rounded-xl py-2 px-3 text-sm outline-none focus:border-ql-green/50"
          >
            <option value="">{t('filter_by_plan')}</option>
            {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{t(p)}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ql-text-dim text-xs border-b border-ql-border">
                <th className="text-start font-medium pb-2 pe-3">{t('key')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('plan')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('billing')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('created_by')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('activated_by')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('expires_at')}</th>
                <th className="text-start font-medium pb-2 pe-3">{t('status')}</th>
                <th className="text-start font-medium pb-2">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((k) => (
                <tr key={k.id} className="border-b border-ql-border/50 last:border-0 hover:bg-white/[0.02]">
                  <td className="py-2.5 pe-3">
                    <button onClick={() => copy(k)} className="flex items-center gap-1.5 font-mono text-xs hover:text-ql-green transition-colors">
                      {k.key} {copiedId === k.id ? <Check size={13} className="text-ql-green" /> : <Copy size={13} className="text-ql-text-dim" />}
                    </button>
                  </td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{k.planLabel}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{t(k.billing)}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{k.createdBy || '—'}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{k.activatedBy || '—'}</td>
                  <td className="py-2.5 pe-3 text-ql-text-dim">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString(lang) : (k.plan === 'lifetime' && k.activatedAt ? '∞' : '—')}</td>
                  <td className="py-2.5 pe-3"><Badge status={k.expired ? 'expired' : k.status} label={t(k.expired ? 'expired' : k.status)} /></td>
                  <td className="py-2.5 relative">
                    <button onClick={() => setOpenMenu(openMenu === k.id ? null : k.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-ql-text-dim">
                      <MoreVertical size={16} />
                    </button>
                    {openMenu === k.id && (
                      <div className="absolute end-0 mt-1 w-48 glass rounded-xl p-1.5 shadow-2xl z-10 animate-fade-up">
                        {k.status !== 'unused' && k.status !== 'revoked' && (
                          <>
                            <button onClick={() => doAction(k, 'extend', { days: 1 })} className="w-full text-start px-3 py-1.5 rounded-lg text-xs hover:bg-white/5">+1 {lang === 'ar' ? 'يوم' : 'day'}</button>
                            <button onClick={() => doAction(k, 'extend', { days: -1 })} className="w-full text-start px-3 py-1.5 rounded-lg text-xs hover:bg-white/5">-1 {lang === 'ar' ? 'يوم' : 'day'}</button>
                            <button onClick={() => doAction(k, 'billing', { billing: k.billing === 'free' ? 'paid' : 'free' })} className="w-full text-start px-3 py-1.5 rounded-lg text-xs hover:bg-white/5">
                              {k.billing === 'free' ? t('paid') : t('free')}
                            </button>
                            <button onClick={() => doAction(k, 'logout_device')} className="w-full text-start px-3 py-1.5 rounded-lg text-xs text-ql-orange hover:bg-ql-orange/10 flex items-center gap-1.5">
                              <LogOut size={13} /> {t('logout_device')}
                            </button>
                            <button onClick={() => doAction(k, 'revoke')} className="w-full text-start px-3 py-1.5 rounded-lg text-xs text-ql-red hover:bg-ql-red/10 flex items-center gap-1.5">
                              <Ban size={13} /> {t('revoke')}
                            </button>
                          </>
                        )}
                        {k.status === 'unused' && (
                          <button onClick={() => doDelete(k)} className="w-full text-start px-3 py-1.5 rounded-lg text-xs text-ql-red hover:bg-ql-red/10 flex items-center gap-1.5">
                            <Trash2 size={13} /> {t('delete')}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-ql-text-dim text-xs">{t('no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-ql-text-dim">
          <span>{total} {t('total_keys')}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg glass disabled:opacity-40">‹</button>
            <span className="px-3 py-1.5">{page + 1} / {pages}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg glass disabled:opacity-40">›</button>
          </div>
        </div>
      </div>

      <Modal
        open={createOpen}
        title={t('create_key')}
        onClose={() => setCreateOpen(false)}
        footer={!createdKey && (
          <>
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl text-sm glass">{t('cancel')}</button>
            <button disabled={busy} onClick={createKey} className="px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-ql-green to-ql-green-soft text-black font-semibold disabled:opacity-60">{t('create_key')}</button>
          </>
        )}
      >
        {createdKey ? (
          <div className="text-center py-4">
            <div className="text-xs text-ql-text-dim mb-2">{t('create_key')}</div>
            <div className="font-mono text-lg text-ql-green text-glow bg-black/30 rounded-xl py-3 px-4 inline-block">{createdKey}</div>
            <button
              onClick={() => { navigator.clipboard?.writeText(createdKey); }}
              className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-ql-green hover:underline"
            >
              <Copy size={13} /> {t('copy')}
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs text-ql-text-dim mb-1.5 block">{t('plan')}</label>
              <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="w-full bg-black/30 border border-ql-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-ql-green/60">
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{t(p)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ql-text-dim mb-1.5 block">{t('billing')}</label>
              <div className="flex gap-2">
                {['paid', 'free'].map((b) => (
                  <button
                    key={b}
                    onClick={() => setNewBilling(b)}
                    className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${newBilling === b ? 'bg-ql-green/15 border-ql-green/40 text-ql-green' : 'border-ql-border text-ql-text-dim'}`}
                  >
                    {t(b)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
