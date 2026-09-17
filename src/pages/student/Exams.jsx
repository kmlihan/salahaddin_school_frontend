import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function StudentExams() {
  const { user } = useAuth();
  const { t, ml } = useLang();
  const [exams, setExams] = useState([]);
  const [resultsByExam, setResultsByExam] = useState({}); // examId -> result
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const [{ data: exams }, { data: results }] = await Promise.all([
        api.get('/exams'),
        user?._id ? api.get(`/exam-results/student/${user._id}`) : Promise.resolve({ data: [] }),
      ]);
      const map = {};
      for (const r of results) {
        const examId = r.exam?._id || r.exam;
        if (examId) map[String(examId)] = r;
      }
      setResultsByExam(map);
      setExams(exams);
      setLoading(false);
    };
    run().catch(() => setLoading(false));
  }, [user?._id]);

  if (loading) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('myExams')}</h1>
      {exams.length === 0 && <div className="card text-slate-500">—</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exams.map((e) => {
          // The server may already tell us via `alreadyTaken`; we also fall
          // back to the local results map for safety.
          const taken = e.alreadyTaken || !!resultsByExam[String(e._id)];
          const prevResult = resultsByExam[String(e._id)];
          const passed = prevResult?.passed;

          return (
            <div key={e._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{ml(e.title)}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {e.section} · {t('level')} {e.level}
                    {e.type === 'unit' ? ' · 🎓' : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {e.questions?.length || 0} questions · pass ≥ {e.passingGrade}%
                  </p>
                </div>
                {taken && (
                  <span
                    className={
                      'text-xs px-2 py-1 rounded font-medium ms-2 ' +
                      (passed
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300')
                    }
                  >
                    {prevResult ? `${prevResult.percentage}%` : '✓'}
                  </span>
                )}
              </div>

              <div className="mt-3">
                {taken ? (
                  <Link to="/student/results" className="btn btn-soft text-sm">
                    {t('myResults')}
                  </Link>
                ) : (
                  <Link to={`/student/exams/${e._id}`} className="btn btn-primary text-sm">
                    {t('startExam')}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
