import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Avatar from '../../components/Avatar';
import UserFilterBar from '../../components/UserFilterBar';
import { useLang } from '../../context/LanguageContext';

/**
 * Teachers use this page to find a student and open their notes / progress
 * view. Read-only — teachers don't create or delete students.
 */
export default function TeacherStudents() {
  const { t } = useLang();
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ q: '', gender: '' });
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.gender) params.gender = filters.gender;
      const { data } = await api.get('/students', { params });
      setStudents(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters)]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('students')}</h1>

      <UserFilterBar value={filters} onChange={setFilters} withGender />

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2">{t('photo')}</th>
              <th className="text-start px-3 py-2">{t('firstName')}</th>
              <th className="text-start px-3 py-2">{t('lastName')}</th>
              <th className="text-start px-3 py-2">{t('email')}</th>
              <th className="text-start px-3 py-2">{t('level')}</th>
              <th className="text-start px-3 py-2">{t('tableGender')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">—</td></tr>}
            {students.map((s) => (
              <tr
                key={s._id}
                className={
                  'border-t border-slate-200 dark:border-slate-800 ' +
                  (s.gender === 'female'
                    ? 'bg-pink-50 dark:bg-pink-950/30'
                    : 'bg-blue-50 dark:bg-blue-950/30')
                }
              >
                <td className="px-3 py-2"><Avatar user={s} size={36} /></td>
                <td className="px-3 py-2">{s.firstName}</td>
                <td className="px-3 py-2">{s.lastName}</td>
                <td className="px-3 py-2">{s.email}</td>
                <td className="px-3 py-2">{s.level}</td>
                <td className="px-3 py-2">
                  <span className={
                    'text-xs px-2 py-0.5 rounded ' +
                    (s.gender === 'female'
                      ? 'bg-pink-200 text-pink-900 dark:bg-pink-900/50 dark:text-pink-200'
                      : 'bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200')
                  }>
                    {s.gender || 'male'}
                  </span>
                </td>
                <td className="px-3 py-2 text-end">
                  <Link to={`/teacher/students/${s._id}/notes`} className="btn btn-primary text-xs">
                    {t('notes')}
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
