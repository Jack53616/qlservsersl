import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (_err) {
      setError(t('invalid_credentials'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-ql-green/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-ql-blue/10 rounded-full blur-3xl" />
      </div>

      <button
        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        className="absolute top-5 right-5 glass rounded-full px-3 py-2 text-xs flex items-center gap-1.5 text-ql-text-dim hover:text-ql-green transition-colors"
      >
        <Languages size={14} /> {lang === 'ar' ? 'EN' : 'AR'}
      </button>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl glass glow-green flex items-center justify-center mb-4 overflow-hidden">
            <img src="./logo.png" alt="QL Ai" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-ql-text">{t('login_title')}</h1>
          <p className="text-sm text-ql-text-dim mt-1">{t('login_sub')}</p>
        </div>

        <form onSubmit={onSubmit} className="glass rounded-2xl p-6 space-y-4 shadow-2xl">
          <div>
            <label className="text-xs text-ql-text-dim mb-1.5 block">{t('username')}</label>
            <div className="relative">
              <User size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-ql-text-dim" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/30 border border-ql-border rounded-xl py-2.5 ps-9 pe-3 text-sm outline-none focus:border-ql-green/60 focus:ring-2 focus:ring-ql-green/20 transition-all"
                autoFocus
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-ql-text-dim mb-1.5 block">{t('password')}</label>
            <div className="relative">
              <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-ql-text-dim" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/30 border border-ql-border rounded-xl py-2.5 ps-9 pe-3 text-sm outline-none focus:border-ql-green/60 focus:ring-2 focus:ring-ql-green/20 transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-ql-red bg-ql-red/10 border border-ql-red/30 rounded-lg px-3 py-2 animate-fade-up">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-ql-green to-ql-green-soft text-black font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {t('sign_in')}
          </button>
        </form>
      </div>
    </div>
  );
}
