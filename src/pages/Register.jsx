import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import ValidatedField from '../components/ValidatedField';
import PhoneInput from '../components/PhoneInput';
import {
  validateEmail, validatePhone, validateName, validateRequired,
  validatePostalCode, validateBirthDate, ageFromBirthDate, levelFromBirthDate,
  runValidators,
} from '../utils/validate';

/**
 * Public registration. Same field rules as the admin StudentForm so the
 * model never receives partial data: birthdate, emergency phone and full
 * address are all required. Level auto-fills from birthdate when age
 * lands in the 6–16 range; for ages outside that window, the parent
 * picks C (reads Arabic) or D (reads Quran) explicitly.
 */
export default function Register() {
  const { t } = useLang();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const [errors, setErrors] = useState({});

  const [parent, setParent] = useState({
    firstName: '', lastName: '', email: '', phone: '',
  });
  const [student, setStudent] = useState({
    firstName: '', lastName: '', email: '',
    level: '', gender: 'male',
    birthDate: '',
    phone: '', emergencyPhone: '',
    address: { street: '', houseNumber: '', city: '', postalCode: '', country: '' },
  });
  const [message, setMessage] = useState('');

  const setP = (k, v) => setParent((p) => ({ ...p, [k]: v }));
  const setS = (k, v) => setStudent((s) => ({ ...s, [k]: v }));
  const setSAddr = (k, v) => setStudent((s) => ({ ...s, address: { ...s.address, [k]: v } }));

  // Auto-suggest the student's level when birthDate lands in the auto-range.
  // Doesn't override a manual pick so a parent who already selected C / D
  // for a skill-based reason keeps it.
  const onBirthDateChange = (v) => {
    setStudent((s) => {
      const next = { ...s, birthDate: v };
      if (!s.level) {
        const auto = levelFromBirthDate(v);
        if (auto) next.level = auto;
      }
      return next;
    });
  };

  const ageHint = ageFromBirthDate(student.birthDate);
  const suggestedLevel = levelFromBirthDate(student.birthDate);

  // Build the full set of validators. Re-evaluated each call; cheap.
  const validate = () => runValidators({
    'parent.firstName': () => validateName(parent.firstName),
    'parent.lastName':  () => validateName(parent.lastName),
    'parent.email':     () => validateEmail(parent.email),
    'parent.phone':     () => validatePhone(parent.phone, { required: false }),

    'student.firstName':      () => validateName(student.firstName),
    'student.lastName':       () => validateName(student.lastName),
    'student.email':          () => validateEmail(student.email),
    'student.birthDate':      () => validateBirthDate(student.birthDate),
    'student.level':          () => student.level ? '' : 'errRequired',
    'student.phone':          () => validatePhone(student.phone, { required: false }),
    'student.emergencyPhone': () => validatePhone(student.emergencyPhone, { required: true }),
    'student.address.street':      () => validateRequired(student.address.street),
    'student.address.houseNumber': () => validateRequired(student.address.houseNumber),
    'student.address.city':        () => validateRequired(student.address.city),
    'student.address.postalCode':  () => validatePostalCode(student.address.postalCode),
    'student.address.country':     () => validateRequired(student.address.country),
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerErr('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await api.post('/registrations', { parent, student, message });
      setSubmitted(true);
    } catch (err) {
      setServerErr(err.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="card text-center">
          <h1 className="text-xl font-semibold mb-2">{t('registerThanksTitle')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            {t('registerThanksText')}
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/" className="btn btn-soft">{t('home')}</Link>
            <Link to="/login" className="btn btn-primary">{t('login')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">{t('registerTitle')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">{t('registerHelp')}</p>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {/* Parent */}
          <fieldset className="space-y-3">
            <legend className="font-semibold mb-1">{t('parent')}</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ValidatedField label={t('firstName')} required
                value={parent.firstName} onChange={(v) => setP('firstName', v)}
                error={errors['parent.firstName']} />
              <ValidatedField label={t('lastName')} required
                value={parent.lastName} onChange={(v) => setP('lastName', v)}
                error={errors['parent.lastName']} />
              <ValidatedField label={t('email')} type="email" required autoComplete="email"
                value={parent.email} onChange={(v) => setP('email', v)}
                error={errors['parent.email']} />
              <PhoneInput label={t('phone')}
                value={parent.phone} onChange={(v) => setP('phone', v)}
                error={errors['parent.phone']} />
            </div>
          </fieldset>

          {/* Student basics */}
          <fieldset className="space-y-3">
            <legend className="font-semibold mb-1">{t('student')}</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ValidatedField label={t('firstName')} required
                value={student.firstName} onChange={(v) => setS('firstName', v)}
                error={errors['student.firstName']} />
              <ValidatedField label={t('lastName')} required
                value={student.lastName} onChange={(v) => setS('lastName', v)}
                error={errors['student.lastName']} />
              <ValidatedField label={t('email')} type="email" required
                value={student.email} onChange={(v) => setS('email', v)}
                error={errors['student.email']} />

              <label className="block">
                <span className="block text-sm mb-1">{t('tableGender')}</span>
                <select className="input"
                  value={student.gender}
                  onChange={(e) => setS('gender', e.target.value)}>
                  <option value="male">{t('male') || 'male'}</option>
                  <option value="female">{t('female') || 'female'}</option>
                </select>
              </label>

              {/* Birthdate with live age + level hint */}
              <label className="block">
                <span className="block text-sm mb-1">{t('birthDate')} *</span>
                <input
                  type="date"
                  className={'input ' + (errors['student.birthDate'] ? 'border-red-500' : '')}
                  value={student.birthDate || ''}
                  onChange={(e) => onBirthDateChange(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
                {errors['student.birthDate'] && (
                  <p className="mt-1 text-xs text-red-600">{t(errors['student.birthDate'])}</p>
                )}
                {ageHint != null && !errors['student.birthDate'] && (
                  <p className="mt-1 text-xs text-slate-500">
                    {t('age') || 'Age'}: {ageHint}
                    {suggestedLevel && <> · {t('autoLevel') || 'Auto level'}: <strong>{suggestedLevel}</strong></>}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="block text-sm mb-1">{t('level')} *</span>
                <select
                  className={'input ' + (errors['student.level'] ? 'border-red-500' : '')}
                  value={student.level || ''}
                  onChange={(e) => setS('level', e.target.value)}
                >
                  <option value="">— {t('selectLevel') || 'Select level'} —</option>
                  <option value="A">A · {t('levelADesc') || 'ages 6–12'}</option>
                  <option value="B">B · {t('levelBDesc') || 'ages 13–16'}</option>
                  <option value="C">C · {t('levelCDesc') || 'reads Arabic'}</option>
                  <option value="D">D · {t('levelDDesc') || 'reads Quran'}</option>
                </select>
                {errors['student.level'] && (
                  <p className="mt-1 text-xs text-red-600">{t(errors['student.level'])}</p>
                )}
              </label>
            </div>

            {/* Phones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PhoneInput label={t('phone')}
                value={student.phone} onChange={(v) => setS('phone', v)}
                error={errors['student.phone']} />
              <PhoneInput
                label={(t('emergencyPhone') || 'Emergency phone') + ' *'}
                value={student.emergencyPhone}
                onChange={(v) => setS('emergencyPhone', v)}
                error={errors['student.emergencyPhone']}
              />
            </div>

            {/* Address */}
            <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 space-y-3">
              <p className="text-sm font-semibold">{t('address') || 'Address'} *</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <ValidatedField label={t('street') || 'Street'} required
                    value={student.address.street}
                    onChange={(v) => setSAddr('street', v)}
                    error={errors['student.address.street']} />
                </div>
                <ValidatedField label={t('houseNumber') || 'House number'} required
                  value={student.address.houseNumber}
                  onChange={(v) => setSAddr('houseNumber', v)}
                  error={errors['student.address.houseNumber']} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ValidatedField label={t('city') || 'City'} required
                  value={student.address.city}
                  onChange={(v) => setSAddr('city', v)}
                  error={errors['student.address.city']} />
                <ValidatedField label={t('postalCode') || 'Postal code'} required
                  value={student.address.postalCode}
                  onChange={(v) => setSAddr('postalCode', v)}
                  error={errors['student.address.postalCode']} />
                <ValidatedField label={t('country') || 'Country'} required
                  value={student.address.country}
                  onChange={(v) => setSAddr('country', v)}
                  error={errors['student.address.country']} />
              </div>
            </div>
          </fieldset>

          <label className="block">
            <span className="block text-sm mb-1">{t('messageOptional')}</span>
            <textarea className="input" rows={3}
              value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>

          {Object.keys(errors).length > 0 && (
            <p className="text-sm text-red-600">{t('errFixForm')}</p>
          )}
          {serverErr && <p className="text-sm text-red-600">{serverErr}</p>}

          <div className="flex items-center gap-3">
            <button disabled={busy} className="btn btn-primary">
              {busy ? t('loading') : t('submit')}
            </button>
            <Link to="/login" className="text-sm text-slate-500 hover:underline">
              {t('backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
