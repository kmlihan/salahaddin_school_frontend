
import { useState } from 'react';
import { useLang } from '../context/LanguageContext';

/**
 * Edits a multi-language string {en, ar, nl}.
 * The selected tab controls which language is being edited.
 */
export default function MultiLangInput({
  value = {},
  onChange,
  multiline = false,
  placeholder = '',
}) {
  const { t } = useLang();
  const [active, setActive] = useState('en');

  const set = (lang, v) => {
    onChange({
      ...value,
      [lang]: v,
    });
  };

  const Tab = ({ code, label }) => (
    <button
      type="button"
      onClick={() => setActive(code)}
      className={
        'px-2 py-1 text-xs rounded ' +
        (active === code
          ? 'bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]'
          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')
      }
    >
      {label}
    </button>
  );

  // Placeholder based on the selected NOTE language,
  // not the website language.
  const translatedPlaceholder = {
    en: t('notePlaceholderEn'),
    ar: t('notePlaceholderAr'),
    nl: t('notePlaceholderNl'),
  }[active];

  return (
    <div>
      <div className="flex gap-1 mb-1">
        <Tab code="en" label="EN" />
        <Tab code="ar" label="ع" />
        <Tab code="nl" label="NL" />
      </div>

      {multiline ? (
        <textarea
          dir={active === 'ar' ? 'rtl' : 'ltr'}
          value={value[active] || ''}
          onChange={(e) => set(active, e.target.value)}
          placeholder={translatedPlaceholder || placeholder}
          rows={4}
          className="input"
        />
      ) : (
        <input
          dir={active === 'ar' ? 'rtl' : 'ltr'}
          value={value[active] || ''}
          onChange={(e) => set(active, e.target.value)}
          placeholder={translatedPlaceholder || placeholder}
          className="input"
        />
      )}
    </div>
  );
}

