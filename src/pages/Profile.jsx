import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import ValidatedField from '../components/ValidatedField';
import PhoneInput from '../components/PhoneInput';
import { validateEmail, validateName, validatePhone, runValidators } from '../utils/validate';

export default function Profile() {
  const { user, role, updateUser } = useAuth();
  const { t } = useLang();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    photo: user?.photo || '',
  });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    const errs = runValidators({
      firstName: () => validateName(form.firstName),
      lastName:  () => validateName(form.lastName),
      email:     () => validateEmail(form.email),
      phone:     () => validatePhone(form.phone, { required: false }),
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      setMsg(t('saved'));
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  const onResetPwd = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await api.post('/auth/reset-password', pwd);
      setPwd({ currentPassword: '', newPassword: '' });
      setMsg(t('saved'));
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/upload', fd);
      set('photo', data.url);
    } catch (err) {
      setErr(err.response?.data?.message || t('error'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{t('profile')}</h1>
      <p className="text-sm text-slate-500">{t(role)}</p>

      <form onSubmit={onSave} noValidate className="card space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : null}
          </div>
          <input type="file" accept="image/*" onChange={onUpload} className="text-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ValidatedField label={t('firstName')} required
            value={form.firstName} onChange={(v) => set('firstName', v)}
            error={errors.firstName} />
          <ValidatedField label={t('lastName')} required
            value={form.lastName} onChange={(v) => set('lastName', v)}
            error={errors.lastName} />
          <ValidatedField label={t('email')} type="email" required
            value={form.email} onChange={(v) => set('email', v)}
            error={errors.email} />
          <PhoneInput label={t('phone')}
            value={form.phone} onChange={(v) => set('phone', v)}
            error={errors.phone} />
        </div>

        {Object.keys(errors).length > 0 && <p className="text-sm text-red-600">{t('errFixForm')}</p>}
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}

        <button className="btn btn-primary">{t('save')}</button>
      </form>

      <form onSubmit={onResetPwd} className="card space-y-3">
        <h2 className="font-semibold">{t('resetPassword')}</h2>
        <label className="block">
          <span className="block text-sm mb-1">{t('currentPassword')}</span>
          <input type="password" className="input"
                 value={pwd.currentPassword}
                 onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('newPassword')}</span>
          <input type="password" className="input"
                 value={pwd.newPassword}
                 onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} />
        </label>
        <button className="btn btn-primary">{t('save')}</button>
      </form>
    </div>
  );
}
