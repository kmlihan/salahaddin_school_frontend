import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';

export default function ParentExams() {
  const { t, ml } = useLang();
  const [exams, setExams] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/exams')
      .then((r) => setExams(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [t]);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('exams')}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exams.length === 0 && <div className="card text-slate-500">—</div>}
        {exams.map((e) => (
          <div key={e._id} className="card">
            <h3 className="font-semibold">{ml(e.title)}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {e.section} · {t('level')} {e.level}
              {e.type === 'unit' ? ' · 🎓' : ''}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {e.questions?.length || 0} questions · pass ≥ {e.passingGrade}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
