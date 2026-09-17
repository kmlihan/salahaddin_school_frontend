import { useLang } from '../context/LanguageContext';

/**
 * Reusable input + label + inline error message.
 *
 * Props:
 *   - label, value, onChange  (the basics)
 *   - type                    'text' | 'email' | 'tel' | 'number' | 'password' | etc
 *   - error                   translation key for the error message, or '' for none
 *   - required, placeholder, autoComplete, dir, disabled
 *
 * The error is displayed only if `error` is a non-empty string. We also
 * apply a red ring on the input itself when there's an error so it's
 * visually obvious which field is the problem.
 */
export default function ValidatedField({
  label,
  value,
  onChange,
  type = 'text',
  error = '',
  required = false,
  placeholder,
  autoComplete,
  dir,
  disabled = false,
}) {
  const { t } = useLang();
  const hasError = !!error;

  return (
    <label className="block">
      <span className="block text-sm mb-1">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir={dir}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        className={
          'input ' +
          (hasError
            ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
            : '')
        }
        style={hasError ? { boxShadow: '0 0 0 1px rgb(239 68 68 / 0.5)' } : undefined}
      />
      {hasError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t(error)}</p>
      )}
    </label>
  );
}
