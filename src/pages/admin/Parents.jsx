import { useState } from 'react';
import CrudTable from '../../components/CrudTable';
import UserFilterBar from '../../components/UserFilterBar';
import ValidatedField from '../../components/ValidatedField';
import PhoneInput from '../../components/PhoneInput';
import { useLang } from '../../context/LanguageContext';
import { validateEmail, validateName, validatePhone, runValidators } from '../../utils/validate';

const empty = { firstName: '', lastName: '', email: '', phone: '' };

export default function AdminParents() {
  const { t } = useLang();
  return (
    <CrudTable
      title={t('parents')}
      endpoint="/parents"
      emptyForm={empty}
      filters={{ q: '' }}
      FilterBar={(p) => <UserFilterBar {...p} />}
      columns={[
        { label: t('firstName'), render: (it) => it.firstName },
        { label: t('lastName'),  render: (it) => it.lastName },
        { label: t('email'),     render: (it) => it.email },
        { label: t('phone'),     render: (it) => it.phone || '—' },
      ]}
      Form={ParentForm}
    />
  );
}

function ParentForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const [errors, setErrors] = useState({});
  const set = (k, v) => onChange({ ...value, [k]: v });

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
