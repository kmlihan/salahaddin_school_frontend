import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function StudentResults() {
  const { user } = useAuth();
  const { t, ml } = useLang();
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/exam-results/student/${user._id}`).then((r) => setResults(r.data));
  }, [user?._id]);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('myResults')}</h1>
      {results.length === 0 && <div className="card text-slate-500">—</div>}
      <div className="space-y-2">
        {results.map((r) => (
          <div key={r._id} className="card flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: r.passed ? '#16a34a' : '#dc2626' }}
            >
              {r.percentage}%
            </div>
            <div className="flex-1">
              <p className="font-medium">{r.exam ? ml(r.exam.title) : '—'}</p>
              <p className="text-xs text-slate-500">
                {new Date(r.submittedAt).toLocaleString()} · {r.totalScore}/{r.maxScore}
              </p>
            </div>
            <span className={'text-sm ' + (r.passed ? 'text-green-600' : 'text-red-600')}>
              {r.passed ? t('examPassed') : t('examFailed')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
