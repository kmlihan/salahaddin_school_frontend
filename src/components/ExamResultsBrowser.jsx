import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Avatar from './Avatar';
import { useLang } from '../context/LanguageContext';

/**
 * All exam results visible to the current user. Admin & teacher see every
 * submission; parent sees their children; student sees their own (the
 * existing /student/results page is more specific for them but this is
 * harmless if reused).
 */
export default function ExamResultsBrowser({ title, detailPathPrefix }) {
  const { t, ml } = useLang();
  const [results, setResults] = useState([]);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState({ q: '', passed: '' });

  useEffect(() => {
    api.get('/exam-results')
      .then((r) => setResults(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [t]);

  const visible = results.filter((r) => {
    if (filter.passed === 'pass' && !r.passed) return false;
    if (filter.passed === 'fail' && r.passed) return false;
    if (filter.q) {
      const hay = [
        r.student?.firstName, r.student?.lastName,
        ml(r.exam?.title), r.exam?.section,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(filter.q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{title || 'Exam results'}</h1>

      <div className="card flex flex-wrap gap-3 items-end">
        <label className="block flex-1 min-w-[200px]">
          <span className="block text-xs mb-1">Search (student, exam, section)</span>
          <input className="input" placeholder="Type to filter…"
            value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        </label>
        <label className="block">
          <span className="block text-xs mb-1">Status</span>
          <select className="input" value={filter.passed} onChange={(e) => setFilter({ ...filter, passed: e.target.value })}>
            <option value="">All</option>
            <option value="pass">Passed</option>
            <option value="fail">Failed</option>
          </select>
        </label>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2"></th>
              <th className="text-start px-3 py-2">{t('student')}</th>
              <th className="text-start px-3 py-2">Exam</th>
              <th className="text-start px-3 py-2">{t('section')}</th>
              <th className="text-start px-3 py-2">{t('level')}</th>
              <th className="text-start px-3 py-2">{t('score')}</th>
              <th className="text-start px-3 py-2">Status</th>
              <th className="text-start px-3 py-2">When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">—</td></tr>
            )}
            {visible.map((r) => (
              <tr key={r._id}
                className={
                  'border-t border-slate-200 dark:border-slate-800 ' +
                  (r.student?.gender === 'female'
                    ? 'bg-pink-50 dark:bg-pink-950/30'
                    : 'bg-blue-50 dark:bg-blue-950/30')
                }
              >
                <td className="px-3 py-2"><Avatar user={r.student} size={28} /></td>
                <td className="px-3 py-2">{r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}</td>
                <td className="px-3 py-2">{r.exam ? ml(r.exam.title) : '—'}</td>
                <td className="px-3 py-2">{r.exam?.section || '—'}</td>
                <td className="px-3 py-2">{r.exam?.level || r.student?.level || '—'}</td>
                <td className="px-3 py-2 font-medium">{r.percentage}% <span className="text-xs text-slate-500">({r.totalScore}/{r.maxScore})</span></td>
                <td className="px-3 py-2">
                  <span className={
                    'text-xs px-2 py-0.5 rounded ' +
                    (r.passed
                      ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300')
                  }>
                    {r.passed ? t('examPassed') : t('examFailed')}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {new Date(r.submittedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-end">
                  <Link to={`${detailPathPrefix}/${r._id}`} className="btn btn-soft text-xs">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
