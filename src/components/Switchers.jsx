import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const LABELS = { en: 'EN', ar: 'ع', nl: 'NL' };

export function LanguageSwitcher() {
  const { lang, setLang, supported } = useLang();
  return (
    <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
      {supported.map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={
            'px-2 py-1 ' +
            (lang === code
              ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-fg))]'
              : 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800')
          }
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="btn btn-ghost px-2 py-1 text-sm"
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
    >
      {theme === 'dark' ? '☀︎' : '☾'}
    </button>
  );
}
