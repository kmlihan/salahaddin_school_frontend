import { useEffect, useRef, useState } from 'react';
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
} from 'libphonenumber-js';
import { useLang } from '../context/LanguageContext';

/**
 * Country options. Order: realistic audience first (Belgium / Netherlands
 * are the school's most common), then nearby Europe, then the Maghreb and
 * the Gulf, then a couple of internationals. Adding more is one line.
 */
const COUNTRY_CHOICES = [
  { code: 'BE', name: 'Belgium',     flag: '🇧🇪' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'FR', name: 'France',      flag: '🇫🇷' },
  { code: 'DE', name: 'Germany',     flag: '🇩🇪' },
  { code: 'GB', name: 'UK',          flag: '🇬🇧' },
  { code: 'MA', name: 'Morocco',     flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria',     flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisia',     flag: '🇹🇳' },
  { code: 'EG', name: 'Egypt',       flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia',flag: '🇸🇦' },
  { code: 'AE', name: 'UAE',         flag: '🇦🇪' },
  { code: 'TR', name: 'Turkey',      flag: '🇹🇷' },
  { code: 'US', name: 'USA',         flag: '🇺🇸' },
];
const VALID_CODES = new Set(COUNTRY_CHOICES.map((c) => c.code));

/**
 * Phone input.
 *
 * Storage / wire format: the parent's `value` is E.164 (e.g. "+32498123456"),
 * which is also what the validator and server expect.
 *
 * Internal state: we keep two local pieces of state — `country` (the picker)
 * and `national` (the raw text the user has typed). `national` is whatever
 * the user types; we DON'T re-format it on each keystroke. That way the
 * input stays a plain controlled input that always reflects the user's
 * keystrokes, no cursor jumps.
 *
 * The E.164 value is *derived*: dial-code + cleaned digits from `national`.
 * We push that to the parent via onChange whenever either changes.
 *
 * On mount we parse the incoming value and populate the local state from
 * it. After that the parent's value follows our local state, so we don't
 * need to keep syncing back from the prop on every render.
 */
export default function PhoneInput({
  value = '',
  onChange,
  error = '',
  required = false,
  label,
  disabled = false,
}) {
  const { t } = useLang();

  // Initialise local state from the incoming value exactly ONCE. After that
  // the parent receives whatever we emit; we don't re-derive from `value`,
  // because doing so would fight React's input semantics (cursor jumps,
  // refused keystrokes, etc).
  const [{ country, national }, setLocal] = useState(() => initialiseFrom(value));

  // If the parent value changes from the outside (e.g. form reset, or
  // editing a different record), reseed our local state. We use a ref to
  // hold the last value we EMITTED so we don't reseed in response to our
  // own emissions.
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value === lastEmitted.current) return;
    setLocal(initialiseFrom(value));
    lastEmitted.current = value;
  }, [value]);

  const emit = (nextCountry, nextNational) => {
    const e164 = recompose(nextCountry, nextNational);
    lastEmitted.current = e164;
    onChange(e164);
  };

  const setCountry = (code) => {
    setLocal({ country: code, national });
    emit(code, national);
  };
  const setNational = (text) => {
    setLocal({ country, national: text });
    emit(country, text);
  };

  const hasError = !!error;
  const dial = country ? `+${getCountryCallingCode(country)}` : '';

  return (
    <label className="block">
      {label && (
        <span className="block text-sm mb-1">
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </span>
      )}

      <div
        className={
          'flex items-stretch rounded-md border overflow-hidden ' +
          (hasError
            ? 'border-red-500'
            : 'border-slate-300 dark:border-slate-700')
        }
      >
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={disabled}
          aria-label="Country"
          className="bg-slate-50 dark:bg-slate-800 px-2 py-2 text-sm border-e border-slate-300 dark:border-slate-700 focus:outline-none"
          style={{ minWidth: 110 }}
        >
          {COUNTRY_CHOICES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} +{getCountryCallingCode(c.code)} {c.name}
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => setNational(e.target.value)}
          disabled={disabled}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          placeholder={dial ? `${dial} 498 12 34 56` : 'Phone number'}
          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
          style={{ direction: 'ltr' }}
        />
      </div>

      {hasError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t(error)}</p>
      )}
    </label>
  );
}

/**
 * Parse an incoming E.164 string into { country, national }. Falls back to
 * Belgium and an empty national field if parsing fails — picker stays
 * usable, user can keep typing.
 */
function initialiseFrom(value) {
  const v = String(value || '').trim();
  if (!v) return { country: 'BE', national: '' };
  const parsed = parsePhoneNumberFromString(v);
  if (parsed && parsed.country && VALID_CODES.has(parsed.country)) {
    // Pre-format the existing number nicely for display when editing.
    return { country: parsed.country, national: parsed.formatNational() };
  }
  // Couldn't parse, or the country is one we don't list. Show the digits
  // we have and default the picker.
  return { country: 'BE', national: v.replace(/^\+\d+/, '') };
}

/**
 * Combine a country and the user's typed national string into E.164.
 * Strip non-digits from the national input (so spaces, dashes, parens
 * the user might type don't end up in the wire value).
 */
function recompose(country, nationalText) {
  const digits = String(nationalText || '').replace(/\D/g, '');
  if (!country) return digits ? `+${digits}` : '';
  const dial = getCountryCallingCode(country);
  if (!digits) return `+${dial}`;
  return `+${dial}${digits}`;
}
