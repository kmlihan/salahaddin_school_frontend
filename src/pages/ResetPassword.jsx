import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';

/**
 * URL: /reset-password?token=...&email=...
 * The token + email come from the email link the user clicked. We submit
 * them along with the new password to /api/auth/reset-password-with-token.
 */
export default function ResetPassword() {
  const { t } = useLang();
  const [params] = useSearchParams();
  const nav = useNavigate();

  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const missing = !token || !email;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setErr('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password-with-token', {
        email, token, newPassword: password,
      });
      nav('/login', { replace: true });
    } catch (err) {
      setErr(err.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card">
        <h1 className="text-xl font-semibold mb-2">{t('setNewPassword')}</h1>

        {missing ? (
          <>
            <p className="text-sm text-red-600 mb-3">
              The reset link is missing or malformed. Request a new one.
            </p>
            <Link to="/forgot-password" className="btn btn-soft w-full">
              {t('forgotPassword')}
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-xs text-slate-500">
              {t('email')}: <span className="font-medium">{email}</span>
            </p>
            <div>
              <label className="block text-sm mb-1">{t('newPassword')}</label>
              <input
                type="password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input" autoFocus
              />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('newPassword')} ({t('confirm') || 'confirm'})</label>
              <input
                type="password" required minLength={6}
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="input"
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={loading} className="btn btn-primary w-full">
              {loading ? t('loading') : t('save')}
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
