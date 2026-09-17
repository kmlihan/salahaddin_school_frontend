import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations, ml as mlRaw } from '../i18n/translations';

const LanguageContext = createContext(null);
export const useLang = () => useContext(LanguageContext);

const SUPPORTED = ['en', 'ar', 'nl'];

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('lang');
    return SUPPORTED.includes(saved) ? saved : 'en';
  });

  // Apply <html lang> and <html dir> on every change. Arabic is RTL.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', lang);
  }, [lang]);

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next);
  }, []);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang]
  );

  const ml = useCallback((field) => mlRaw(field, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, ml, supported: SUPPORTED }}>
      {children}
    </LanguageContext.Provider>
  );
}
