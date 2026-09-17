import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import ValidatedField from '../components/ValidatedField';
import { validateEmail } from '../utils/validate';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    const ee = validateEmail(email);
    setEmailErr(ee);
    if (ee) return;

    setLoading(true);
    try {
      const data = await login(email, password);
      nav(`/${data.role}`);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card">
        <h1 className="text-xl font-semibold mb-4">{t('login')}</h1>
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          <ValidatedField label={t('email')} type="email" required autoComplete="email"
            value={email} onChange={setEmail}
            error={emailErr} />
          <div>
            <label className="block text-sm mb-1">{t('password')}</label>
            <input type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input" />
            <Link to="/forgot-password" className="text-xs text-slate-500 hover:underline block mt-1">
              {t('forgotPassword')}
            </Link>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={loading} className="btn btn-primary w-full">
            {loading ? t('loading') : t('login')}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-sm">
          <span className="text-slate-500 me-2">{t('needAccount')}</span>
          <Link to="/register" className="font-medium hover:underline" style={{ color: 'rgb(var(--accent))' }}>
            {t('register')}
          </Link>
        </div>
      </div>
    </div>
  );
}
