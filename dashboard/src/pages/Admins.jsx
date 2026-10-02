import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, ShieldCheck, Shield } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../context/LangContext';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';

const empty = { username: '', password: '', name: '', role: 'admin', telegramId: '' };

export default function Admins() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  function load() {
    api.admins().then((res) => setItems(res.items)).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError('');
    setModalOpen(true);
  }

  function openEdit(a) {
    setEditing(a);
    setForm({ username: a.username, password: '', name: a.name, role: a.role, telegramId: a.telegramId || '' });
    setError('');
    setModalOpen(true);
  }

  async function submit() {
    setError('');
    try {
      if (editing) {
        const patch = { name: form.name, role: form.role, telegramId: form.telegramId || null };
        if (form.password) patch.password = form.password;
        await api.patchAdmin(editing.id, patch);
      } else {
        await api.createAdmin(form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.payload?.error || 'error');
    }
  }

  async function remove(a) {
    if (!confirm(`${t('delete')} ${a.name}?`)) return;
    try {
      await api.deleteAdmin(a.id);
      load();
    } catch (_) {}
  }

  async function toggleActive(a) {
    try {
      await api.patchAdmin(a.id, { active: !a.active });
      load();
    } catch (_) {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t('nav_admins')}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-ql-green to-ql-green-soft text-black font-semibold text-sm rounded-xl px-4 py-2 hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus size={16} /> {t('add_admin')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-4 animate-fade-up">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={a.name} url={a.avatarUrl} size={40} />
                <div className="min-w-0">
                  <div className="font-semibold truncate flex items-center gap-1.5">
                    {a.name}
                    {a.role === 'super_admin' ? <ShieldCheck size={14} className="text-ql-green shrink-0" /> : <Shield size={14} className="text-ql-text-dim shrink-0" />}
                  </div>
                  <div className="text-xs text-ql-text-dim truncate">@{a.username}</div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-white/10 text-ql-text-dim"><Edit2 size={14} /></button>
                <button onClick={() => remove(a)} className="p-1.5 rounded-lg hover:bg-ql-red/10 text-ql-red"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-black/25 rounded-xl p-2.5 text-center">
                <div className="text-lg font-extrabold num-tabular text-ql-green">{a.createdKeys}</div>
                <div className="text-[10px] text-ql-text-dim">{t('created_keys')}</div>
              </div>
              <div className="bg-black/25 rounded-xl p-2.5 text-center">
                <div className="text-lg font-extrabold num-tabular text-ql-blue">{a.activatedUsers}</div>
                <div className="text-[10px] text-ql-text-dim">{t('activated_users')}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button onClick={() => toggleActive(a)} className={`px-2.5 py-1 rounded-full ring-1 ${a.active ? 'text-ql-green bg-ql-green/10 ring-ql-green/25' : 'text-ql-text-dim bg-white/5 ring-white/10'}`}>
                {a.active ? t('active') : t('revoked')}
              </button>
              {a.users.length > 0 && (
                <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="text-ql-green hover:underline">
                  {t('nav_users')} ({a.users.length})
                </button>
              )}
            </div>

            {expanded === a.id && (
              <div className="mt-3 pt-3 border-t border-ql-border text-xs text-ql-text-dim flex flex-wrap gap-1.5 animate-fade-up">
                {a.users.map((u, i) => (
                  <span key={i} className="bg-white/5 px-2 py-1 rounded-lg">{u}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? t('edit') || 'Edit' : t('add_admin')}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm glass">{t('cancel')}</button>
            <button onClick={submit} className="px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-ql-green to-ql-green-soft text-black font-semibold">{t('save')}</button>
          </>
        }
      >
        {error && <div className="text-xs text-ql-red bg-ql-red/10 border border-ql-red/30 rounded-lg px-3 py-2">{error}</div>}
        <div>
          <label className="text-xs text-ql-text-dim mb-1.5 block">{t('name')}</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-black/30 border border-ql-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-ql-green/60" />
        </div>
        {!editing && (
          <div>
            <label className="text-xs text-ql-text-dim mb-1.5 block">{t('username')}</label>
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className="w-full bg-black/30 border border-ql-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-ql-green/60" />
          </div>
        )}
        <div>
          <label className="text-xs text-ql-text-dim mb-1.5 block">{t('password')} {editing && '(optional)'}</label>
          <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full bg-black/30 border border-ql-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-ql-green/60" />
        </div>
        <div>
          <label className="text-xs text-ql-text-dim mb-1.5 block">{t('role')}</label>
          <div className="flex gap-2">
            {['admin', 'super_admin'].map((r) => (
              <button key={r} onClick={() => setForm((f) => ({ ...f, role: r }))} className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${form.role === r ? 'bg-ql-green/15 border-ql-green/40 text-ql-green' : 'border-ql-border text-ql-text-dim'}`}>
                {r === 'super_admin' ? t('super_admin') : t('admin')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-ql-text-dim mb-1.5 block">{t('telegram_id')} ({t('all')} optional)</label>
          <input value={form.telegramId} onChange={(e) => setForm((f) => ({ ...f, telegramId: e.target.value }))} className="w-full bg-black/30 border border-ql-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-ql-green/60" />
        </div>
      </Modal>
    </div>
  );
}
