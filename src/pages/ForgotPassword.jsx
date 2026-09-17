import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';

export default function ForgotPassword() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await api.post('/auth/forgot-password', { email });
      // The server intentionally returns the same response regardless of
      // whether the email matched a user — we mirror that here.
      setSent(true);
    } catch (err) {
      setErr(err.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card">
        <h1 className="text-xl font-semibold mb-2">{t('forgotPasswordTitle')}</h1>

        {sent ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {t('resetSent')}
            </p>
            <Link to="/login" className="btn btn-soft w-full">{t('backToLogin')}</Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('forgotPasswordHelp')}
            </p>
            <div>
              <label className="block text-sm mb-1">{t('email')}</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input" autoFocus
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={loading} className="btn btn-primary w-full">
              {loading ? t('loading') : t('sendResetLink')}
            </button>
            <Link to="/login" className="block text-center text-sm text-slate-500 hover:underline">
              {t('backToLogin')}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
