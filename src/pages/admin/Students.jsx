import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import CrudTable from '../../components/CrudTable';
import Avatar from '../../components/Avatar';
import UserFilterBar from '../../components/UserFilterBar';
import ValidatedField from '../../components/ValidatedField';
import PhoneInput from '../../components/PhoneInput';
import { useLang } from '../../context/LanguageContext';
import {
  validateEmail, validateName, validatePhone, validateRequired,
  validatePostalCode, validateBirthDate, ageFromBirthDate, levelFromBirthDate,
  runValidators,
} from '../../utils/validate';

const RELATIONSHIPS = ['mother', 'father', 'guardian', 'other'];

const empty = {
  firstName: '', lastName: '', email: '',
  parents: [{ parent: '', relationship: 'guardian' }],
  level: '', // blank — auto-filled from birthDate when entered
  gender: 'male',
  paidAmount: 0,
  photo: '',
  birthDate: '',
  phone: '',
  emergencyPhone: '',
  address: { street: '', houseNumber: '', city: '', postalCode: '', country: '' },
};

export default function AdminStudents() {
  const { t } = useLang();
  const nav = useNavigate();
  const [parents, setParents] = useState([]);

  const reloadParents = () => api.get('/parents').then((r) => setParents(r.data));
  useEffect(() => { reloadParents(); }, []);

  // Display the parents column. Handles both new parents[] and the
  // legacy single parent field, since older rows haven't been re-saved.
  const parentNames = (it) => {
    const list = (it.parents || []).map((p) => p.parent).filter(Boolean);
    if (list.length === 0 && it.parent) list.push(it.parent);
    if (list.length === 0) return '—';
    return list.map((p) => {
      if (typeof p === 'object' && p) return `${p.firstName} ${p.lastName}`;
      const found = parents.find((x) => x._id === p);
      return found ? `${found.firstName} ${found.lastName}` : '?';
    }).join(', ');
  };

  const rowClass = (it) =>
    it.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30'
      : 'bg-blue-50 dark:bg-blue-950/30';

  return (
    <CrudTable
      title={t('students')}
      endpoint="/students"
      emptyForm={empty}
      filters={{ q: '', gender: '' }}
      FilterBar={(p) => <UserFilterBar {...p} withGender />}
      rowClass={rowClass}
      columns={[
        { label: t('photo'),       render: (it) => <Avatar user={it} size={36} /> },
        { label: t('firstName'),   render: (it) => it.firstName },
        { label: t('lastName'),    render: (it) => it.lastName },
        { label: t('email'),       render: (it) => it.email },
        { label: t('level'),       render: (it) => it.level },
        { label: t('tableGender'), render: (it) => (
            <span className={
              'text-xs px-2 py-0.5 rounded ' +
              (it.gender === 'female'
                ? 'bg-pink-200 text-pink-900 dark:bg-pink-900/50 dark:text-pink-200'
                : 'bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200')
            }>
              {it.gender || 'male'}
            </span>
          ) },
        { label: t('parent'),      render: parentNames },
        { label: t('birthDate'),   render: (it) => it.birthDate ? new Date(it.birthDate).toLocaleDateString() : '—' },
        { label: t('tablePaid'),   render: (it) => `€ ${it.paidAmount || 0}` },
      ]}
      Form={(p) => (
        <StudentForm {...p} parents={parents} reloadParents={reloadParents} />
      )}
      extraRowActions={(it) => (
        <button
          className="btn btn-soft text-xs"
          onClick={() => nav(`/admin/students/${it._id}/notes`)}
          title={t('notes')}
        >
          {t('notes')}
        </button>
      )}
    />
  );
}

/* ============================================================ form */

function StudentForm({ value, onChange, onSubmit, onCancel, parents, reloadParents }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  // Normalise the parents array on first render — incoming data may have
  // a populated parents[].parent (object) or a legacy single `parent`
  // ref. Convert into the editor-friendly shape: array of {parent: id,
  // relationship}. We do this once at form-mount via useMemo so the
  // dropdowns don't flicker.
  const normalizedParents = useMemo(() => {
    if (Array.isArray(value.parents) && value.parents.length > 0) {
      return value.parents.map((p) => ({
        parent: typeof p.parent === 'object' && p.parent ? p.parent._id : (p.parent || ''),
        relationship: p.relationship || 'guardian',
      }));
    }
    if (value.parent) {
      const id = typeof value.parent === 'object' ? value.parent._id : value.parent;
      return [{ parent: id || '', relationship: 'guardian' }];
    }
    return [{ parent: '', relationship: 'guardian' }];
  // We only want this calculation when the underlying object identity
  // changes, not on every keystroke — value mutates a lot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value._id]);

  const [parentRows, setParentRows] = useState(normalizedParents);

  // Inline-create-parent panel state
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [newParent, setNewParent] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const set = (k, v) => onChange({ ...value, [k]: v });
  const setAddr = (k, v) => set('address', { ...(value.address || {}), [k]: v });

  /* ---------- birthDate auto-level ---------- */

  // When the user enters a birthDate that falls in the auto-range, fill
  // the level field if it's empty. Doesn't override a manually-picked
  // level — admin can still override (e.g. for C / D skill-based levels).
  const onBirthDateChange = (v) => {
    const next = { ...value, birthDate: v };
    if (!value.level) {
      const auto = levelFromBirthDate(v);
      if (auto) next.level = auto;
    }
    onChange(next);
  };

  const ageHint = ageFromBirthDate(value.birthDate);
  const suggestedLevel = levelFromBirthDate(value.birthDate);

  /* ---------- photo upload ---------- */

  const onUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const { data } = await api.post('/upload', fd);
      set('photo', data.url);
    } finally { setBusy(false); }
  };

  /* ---------- parent rows ---------- */

  const addParentRow = () => {
    setParentRows((r) => [...r, { parent: '', relationship: 'guardian' }]);
  };
  const removeParentRow = (i) => {
    // Don't allow removing the last row — at least one parent is required.
    setParentRows((r) => r.length > 1 ? r.filter((_, idx) => idx !== i) : r);
  };
  const setParentRow = (i, patch) => {
    setParentRows((r) => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  };

  /* ---------- inline parent creation ---------- */

  const setNP = (k, v) => setNewParent((p) => ({ ...p, [k]: v }));

  const onCreateNewParent = async () => {
    const errs = runValidators({
      'newParent.firstName': () => validateName(newParent.firstName),
      'newParent.lastName':  () => validateName(newParent.lastName),
      'newParent.email':     () => validateEmail(newParent.email),
      'newParent.phone':     () => validatePhone(newParent.phone, { required: false }),
    });
    setErrors((e) => ({ ...e, ...errs }));
    if (Object.keys(errs).length) return;

    try {
      const { data: p } = await api.post('/parents', newParent);
      reloadParents();
      // Drop the newly-created parent into the first empty parent row,
      // or append a new row if all rows are full.
      const emptyIdx = parentRows.findIndex((r) => !r.parent);
      if (emptyIdx >= 0) {
        setParentRow(emptyIdx, { parent: p._id });
      } else {
        setParentRows((r) => [...r, { parent: p._id, relationship: 'guardian' }]);
      }
      setNewParent({ firstName: '', lastName: '', email: '', phone: '' });
      setShowCreatePanel(false);
    } catch (err) {
      setErrors((e) => ({ ...e, _server: err.response?.data?.message || t('error') }));
    }
  };

  /* ---------- submit ---------- */

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build validators based on what's required by the new model.
    const validators = {
      firstName:      () => validateName(value.firstName),
      lastName:       () => validateName(value.lastName),
      email:          () => validateEmail(value.email),
      birthDate:      () => validateBirthDate(value.birthDate),
      level:          () => value.level ? '' : 'errRequired',
      emergencyPhone: () => validatePhone(value.emergencyPhone, { required: true }),
      'address.street':      () => validateRequired(value.address?.street),
      'address.houseNumber': () => validateRequired(value.address?.houseNumber),
      'address.city':        () => validateRequired(value.address?.city),
      'address.postalCode':  () => validatePostalCode(value.address?.postalCode),
      'address.country':     () => validateRequired(value.address?.country),
    };

    // Optional fields: phone (student's own).
    if (value.phone) {
      validators.phone = () => validatePhone(value.phone, { required: false });
    }

    // Parent rows: at least one with a non-empty parent id, all rows
    // need a relationship, no duplicate parent ids.
    const seen = new Set();
    let parentsErr = '';
    if (!parentRows.some((r) => r.parent)) {
      parentsErr = 'errParentRequired';
    } else {
      for (const r of parentRows) {
        if (r.parent && seen.has(r.parent)) { parentsErr = 'errDuplicateParent'; break; }
        if (r.parent) seen.add(r.parent);
      }
    }
    validators.parents = () => parentsErr;

    const errs = runValidators(validators);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      // Submit only filled rows — empty entries (a half-added row the
      // user changed their mind about) are dropped.
      const cleanedParents = parentRows
        .filter((r) => r.parent)
        .map((r) => ({ parent: r.parent, relationship: r.relationship }));

      onSubmit({ ...value, parents: cleanedParents, parent: cleanedParents[0].parent });
    } catch (err) {
      setErrors({ _server: err.response?.data?.message || t('error') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* photo */}
      <div className="flex items-center gap-3">
        <Avatar user={value} size={56} />
        <div>
          <input type="file" accept="image/*" onChange={onUpload} className="text-sm" />
          {busy && <span className="text-xs text-slate-500"> …</span>}
        </div>
      </div>

      {/* name + email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ValidatedField label={t('firstName')} required
          value={value.firstName} onChange={(v) => set('firstName', v)}
          error={errors.firstName} />
        <ValidatedField label={t('lastName')} required
          value={value.lastName} onChange={(v) => set('lastName', v)}
          error={errors.lastName} />
        <ValidatedField label={t('email')} type="email" required
          value={value.email} onChange={(v) => set('email', v)}
          error={errors.email} />
        <label className="block">
          <span className="block text-sm mb-1">{t('tableGender')}</span>
          <select value={value.gender} onChange={(e) => set('gender', e.target.value)} className="input">
            <option value="male">{t('male') || 'male'}</option>
            <option value="female">{t('female') || 'female'}</option>
          </select>
        </label>
      </div>

      {/* birthdate + level (with auto-suggest hint) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block md:col-span-1">
          <span className="block text-sm mb-1">{t('birthDate')} *</span>
          <input
            type="date"
            className={'input ' + (errors.birthDate ? 'border-red-500' : '')}
            value={value.birthDate ? String(value.birthDate).slice(0, 10) : ''}
            onChange={(e) => onBirthDateChange(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          {errors.birthDate && <p className="mt-1 text-xs text-red-600">{t(errors.birthDate)}</p>}
          {ageHint != null && !errors.birthDate && (
            <p className="mt-1 text-xs text-slate-500">
              {t('age') || 'Age'}: {ageHint}
              {suggestedLevel && <> · {t('autoLevel') || 'Auto level'}: <strong>{suggestedLevel}</strong></>}
            </p>
          )}
        </label>

        <label className="block">
          <span className="block text-sm mb-1">{t('level')} *</span>
          <select
            className={'input ' + (errors.level ? 'border-red-500' : '')}
            value={value.level || ''}
            onChange={(e) => set('level', e.target.value)}
          >
            <option value="">— {t('selectLevel') || 'Select level'} —</option>
            <option value="A">A · {t('levelADesc') || 'ages 6–12'}</option>
            <option value="B">B · {t('levelBDesc') || 'ages 13–16'}</option>
            <option value="C">C · {t('levelCDesc') || 'reads Arabic'}</option>
            <option value="D">D · {t('levelDDesc') || 'reads Quran'}</option>
          </select>
          {errors.level && <p className="mt-1 text-xs text-red-600">{t(errors.level)}</p>}
        </label>

        <label className="block">
          <span className="block text-sm mb-1">{t('tablePaid')}</span>
          <input type="number" min="0" className="input"
                 value={value.paidAmount ?? 0}
                 onChange={(e) => set('paidAmount', Number(e.target.value))} />
        </label>
      </div>

      {/* phones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PhoneInput
          label={t('phone')}
          value={value.phone || ''}
          onChange={(v) => set('phone', v)}
          error={errors.phone}
        />
        <PhoneInput
          label={(t('emergencyPhone') || 'Emergency phone') + ' *'}
          value={value.emergencyPhone || ''}
          onChange={(v) => set('emergencyPhone', v)}
          error={errors.emergencyPhone}
        />
      </div>

      {/* address */}
      <fieldset className="border border-slate-300 dark:border-slate-700 rounded-md p-3 space-y-3">
        <legend className="px-2 text-sm font-semibold">{t('address') || 'Address'} *</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <ValidatedField
              label={t('street') || 'Street'} required
              value={value.address?.street || ''}
              onChange={(v) => setAddr('street', v)}
              error={errors['address.street']}
            />
          </div>
          <ValidatedField
            label={t('houseNumber') || 'House number'} required
            value={value.address?.houseNumber || ''}
            onChange={(v) => setAddr('houseNumber', v)}
            error={errors['address.houseNumber']}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ValidatedField
            label={t('city') || 'City'} required
            value={value.address?.city || ''}
            onChange={(v) => setAddr('city', v)}
            error={errors['address.city']}
          />
          <ValidatedField
            label={t('postalCode') || 'Postal code'} required
            value={value.address?.postalCode || ''}
            onChange={(v) => setAddr('postalCode', v)}
            error={errors['address.postalCode']}
          />
          <ValidatedField
            label={t('country') || 'Country'} required
            value={value.address?.country || ''}
            onChange={(v) => setAddr('country', v)}
            error={errors['address.country']}
          />
        </div>
      </fieldset>

      {/* parents */}
      <fieldset className="border border-slate-300 dark:border-slate-700 rounded-md p-3 space-y-3">
        <legend className="px-2 text-sm font-semibold">{t('parents') || 'Parents / guardians'} *</legend>

        {parentRows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
            <div className="md:col-span-7">
              <span className="block text-xs mb-1">{t('parent')} #{i + 1}</span>
              <select
                className="input"
                value={row.parent}
                onChange={(e) => setParentRow(i, { parent: e.target.value })}
              >
                <option value="">— {t('selectAParent') || 'Select a parent'} —</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName} ({p.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <span className="block text-xs mb-1">{t('relationship') || 'Relationship'}</span>
              <select
                className="input"
                value={row.relationship}
                onChange={(e) => setParentRow(i, { relationship: e.target.value })}
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {t(r) || r}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1 flex items-end h-full">
              {parentRows.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost text-red-600"
                  onClick={() => removeParentRow(i)}
                  title={t('remove') || 'Remove'}
                  style={{ marginTop: 22 }}
                >×</button>
              )}
            </div>
          </div>
        ))}

        {errors.parents && (
          <p className="text-xs text-red-600">{t(errors.parents)}</p>
        )}

        <div className="flex gap-2 flex-wrap">
          <button type="button" className="btn btn-soft text-xs" onClick={addParentRow}>
            + {t('addParent') || 'Add another parent'}
          </button>
          <button type="button" className="btn btn-soft text-xs"
                  onClick={() => setShowCreatePanel(!showCreatePanel)}>
            {showCreatePanel ? t('cancel') : (t('addNewParent') || 'Create a new parent')}
          </button>
        </div>

        {showCreatePanel && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
            <p className="text-xs text-slate-500">
              {t('createNewParentHint') || 'Fill in the new parent details, then click Create.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ValidatedField label={t('firstName')} required
                value={newParent.firstName} onChange={(v) => setNP('firstName', v)}
                error={errors['newParent.firstName']} />
              <ValidatedField label={t('lastName')} required
                value={newParent.lastName} onChange={(v) => setNP('lastName', v)}
                error={errors['newParent.lastName']} />
              <ValidatedField label={t('email')} type="email" required
                value={newParent.email} onChange={(v) => setNP('email', v)}
                error={errors['newParent.email']} />
              <PhoneInput label={t('phone')}
                value={newParent.phone} onChange={(v) => setNP('phone', v)}
                error={errors['newParent.phone']} />
            </div>
            <button type="button" className="btn btn-primary text-sm" onClick={onCreateNewParent}>
              {t('create') || 'Create'}
            </button>
          </div>
        )}
      </fieldset>

      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-red-600">
          {errors._server || t('errFixForm')}
        </p>
      )}

      <div className="flex gap-2">
        <button disabled={busy} className="btn btn-primary">
          {busy ? t('loading') : t('save')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}
