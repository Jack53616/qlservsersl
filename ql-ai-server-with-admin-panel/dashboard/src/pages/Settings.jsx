import { useRef, useState } from 'react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { Languages, ShieldCheck, Camera, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import Avatar from '../components/Avatar';

export default function Settings() {
  const { t, lang, setLang } = useLang();
  const { admin, setAdmin, isSuperAdmin } = useAuth();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await api.uploadAvatar(file);
      setAdmin(res.admin);
    } catch (_err) {
      setError(t('upload_failed') || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{t('nav_settings')}</h1>

      <div className="glass rounded-2xl p-5 animate-fade-up space-y-4 max-w-lg">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <Avatar name={admin?.name} url={admin?.avatarUrl} size={64} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              title={t('change_photo')}
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onPickFile} />
          </div>
          <div>
            <div className="font-semibold flex items-center gap-1.5">
              {admin?.name}
              {isSuperAdmin && <ShieldCheck size={14} className="text-ql-green" />}
            </div>
            <div className="text-xs text-ql-text-dim">@{admin?.username} · {isSuperAdmin ? t('super_admin') : t('admin')}</div>
            <button onClick={() => fileRef.current?.click()} className="text-xs text-ql-green hover:underline mt-1">{t('change_photo')}</button>
          </div>
        </div>
        {error && <div className="text-xs text-ql-red bg-ql-red/10 border border-ql-red/30 rounded-lg px-3 py-2">{error}</div>}

        <div className="pt-4 border-t border-ql-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Languages size={16} className="text-ql-text-dim" />
              {t('nav_settings')} — {lang === 'ar' ? 'اللغة' : 'Language'}
            </div>
            <div className="flex gap-1.5">
              {['ar', 'en'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${lang === l ? 'bg-ql-green/15 border-ql-green/40 text-ql-green' : 'border-ql-border text-ql-text-dim'}`}
                >
                  {l === 'ar' ? 'العربية' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
