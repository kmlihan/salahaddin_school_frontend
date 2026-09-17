import { useState } from 'react';
import api from '../../api/client';
import CrudTable from '../../components/CrudTable';
import Avatar from '../../components/Avatar';
import UserFilterBar from '../../components/UserFilterBar';
import ValidatedField from '../../components/ValidatedField';
import PhoneInput from '../../components/PhoneInput';
import { useLang } from '../../context/LanguageContext';
import { validateEmail, validateName, validatePhone, runValidators } from '../../utils/validate';

const empty = { firstName: '', lastName: '', email: '', phone: '', photo: '', hourlyRate: 0 };

export default function AdminTeachers() {
  const { t } = useLang();

  return (
    <CrudTable
      title={t('teachers')}
      endpoint="/teachers"
      emptyForm={empty}
      filters={{ q: '' }}
      FilterBar={(p) => <UserFilterBar {...p} />}
      columns={[
        { label: t('photo'),       render: (it) => <Avatar user={it} size={36} /> },
        { label: t('firstName'),   render: (it) => it.firstName },
        { label: t('lastName'),    render: (it) => it.lastName },
        { label: t('email'),       render: (it) => it.email },
        { label: t('phone'),       render: (it) => it.phone || '—' },
        { label: t('hourlyRate'),  render: (it) => `€ ${it.hourlyRate || 0}` },
      ]}
      Form={TeacherForm}
    />
  );
}

function TeacherForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => onChange({ ...value, [k]: v });

  const onUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const { data } = await api.post('/upload', fd);
      set('photo', data.url);
    } finally { setBusy(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = runValidators({
      firstName: () => validateName(value.firstName),
      lastName:  () => validateName(value.lastName),
      email:     () => validateEmail(value.email),
      phone:     () => validatePhone(value.phone, { required: false }),
    });
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar user={value} size={56} />
        <div>
          <input type="file" accept="image/*" onChange={onUpload} className="text-sm" />
          {busy && <span className="text-xs text-slate-500"> …</span>}
        </div>
      </div>
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
        <PhoneInput label={t('phone')}
          value={value.phone} onChange={(v) => set('phone', v)}
          error={errors.phone} />
        <label className="block">
          <span className="block text-sm mb-1">{t('hourlyRate')}</span>
          <input type="number" min="0" className="input"
                 value={value.hourlyRate ?? 0}
                 onChange={(e) => set('hourlyRate', Number(e.target.value))} />
        </label>
      </div>
      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-red-600">{t('errFixForm')}</p>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary">{t('save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}
