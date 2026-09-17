import { isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validation helpers. Each function returns:
 *   - '' if the value is valid
 *   - a translation key (e.g. 'errEmailFormat') if invalid
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Unicode-aware: allows letters from any script, plus spaces, hyphens,
// apostrophes, dots. 1-60 characters. Matches Arabic, Dutch with diacritics,
// hyphenated names, etc.
const NAME_RE = /^[\p{L}][\p{L}\s'’\-\.]{0,59}$/u;

export function validateEmail(value, { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'errRequired' : '';
  if (!EMAIL_RE.test(v)) return 'errEmailFormat';
  return '';
}

export function validateName(value, { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'errRequired' : '';
  if (!NAME_RE.test(v)) return 'errNameFormat';
  return '';
}

/**
 * Phone validator. Expects an E.164-style number (e.g. "+32498123456").
 * Uses libphonenumber-js for proper per-country validation — knows the
 * length and prefix rules for every country.
 *
 *   ''     valid
 *   key    error translation key
 *
 * If `required` is false, an empty value passes.
 */
export function validatePhone(value, { required = false } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'errRequired' : '';
  // Accept either a full E.164 number, or a "+CC ..." form. The library
  // will refuse anything that doesn't start with + as missing country.
  if (!v.startsWith('+')) return 'errPhoneNeedsCountry';
  try {
    if (!isValidPhoneNumber(v)) return 'errPhoneFormat';
  } catch {
    return 'errPhoneFormat';
  }
  return '';
}

/**
 * Run a set of validators and return a { fieldName: errKey } map. Fields
 * with no error are omitted.
 */
export function runValidators(validators) {
  const errors = {};
  for (const [field, fn] of Object.entries(validators)) {
    const err = fn();
    if (err) errors[field] = err;
  }
  return errors;
}

/**
 * Generic non-empty validator for text fields like address parts.
 */
export function validateRequired(value, { min = 1, max = 200 } = {}) {
  const v = String(value || '').trim();
  if (!v) return 'errRequired';
  if (v.length < min) return 'errMinLength';
  if (v.length > max) return 'errMaxLength';
  return '';
}

/**
 * Postal code — country-agnostic. 2–12 chars of letters, digits, spaces,
 * hyphens. Tight enough to catch fat-finger errors, loose enough to
 * accept BE/NL/UK/etc. formats.
 */
const POSTAL_RE = /^[A-Za-z0-9 \-]{2,12}$/;
export function validatePostalCode(value, { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'errRequired' : '';
  if (!POSTAL_RE.test(v)) return 'errPostalCodeFormat';
  return '';
}

/**
 * Birthdate — must parse, must not be in the future, must be a sensible
 * age (≤ 120 years old). `required` defaults to true.
 */
export function validateBirthDate(value, { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'errRequired' : '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return 'errBirthDateFormat';
  const now = Date.now();
  if (d.getTime() > now) return 'errBirthDateFuture';
  const oneTwentyYearsMs = 120 * 365.25 * 24 * 60 * 60 * 1000;
  if (d.getTime() < now - oneTwentyYearsMs) return 'errBirthDateOld';
  return '';
}

/**
 * Compute age in whole years. Returns null for invalid input.
 */
export function ageFromBirthDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/**
 * Auto-suggest level from age. Returns 'A' for ages 6–12, 'B' for 13–16,
 * null otherwise (so the caller knows to require manual selection — i.e.
 * C and D, which are skill-based, not age-based).
 */
export function levelFromBirthDate(value) {
  const age = ageFromBirthDate(value);
  if (age == null) return null;
  if (age >= 6 && age <= 12) return 'A';
  if (age >= 13 && age <= 16) return 'B';
  return null;
}
