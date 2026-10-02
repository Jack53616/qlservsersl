import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { strings } from '../i18n/strings';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('qlai_lang') || 'ar');

  useEffect(() => {
    localStorage.setItem('qlai_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = strings[lang].dir;
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    dir: strings[lang].dir,
    t: (key) => strings[lang][key] ?? key
  }), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
