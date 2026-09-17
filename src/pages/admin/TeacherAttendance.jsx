import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import Avatar from '../../components/Avatar';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';

// Hour numbers we show as checkboxes. Three by default to match the spec.
// If the school later needs more, change this array — backend supports up
// to 12 already.
const HOUR_NUMBERS = [1, 2, 3];

const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Admin daily teacher-attendance recording.
 *
 *   1. Pick a date (today or future — past blocked via `min` and the server)
 *   2. Page loads all teachers + any existing record for that date
 *   3. For each teacher: three checkboxes (1st h / 2nd h / 3rd h)
 *   4. Save → POST /api/teacher-attendance/bulk (upserts by teacher+day)
 */
export default function AdminTeacherAttendance() {
  const { t } = useLang();
  const dialog = useDialog();
  const min = todayStr();

  const [date, setDate] = useState(min);
  const [teachers, setTeachers] = useState([]);
  // hoursByTeacher = { [teacherId]: Set<number> } — Set so toggling is O(1).
  const [hoursByTeacher, setHoursByTeacher] = useState({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async (dateStr) => {
    setErr(''); setBusy(true);
    try {
      const [tRes, aRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/teacher-attendance', { params: { date: dateStr } }),
      ]);
      setTeachers(tRes.data);

      const map = {};
      for (const r of aRes.data) {
        const tid = r.teacher?._id || r.teacher;
        if (tid) map[String(tid)] = new Set((r.hours || []).map(Number));
      }
      setHoursByTeacher(map);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };
  useEffect(() => { load(date); /* eslint-disable-next-line */ }, [date]);

  const toggleHour = (teacherId, n) => {
    setHoursByTeacher((cur) => {
      const next = { ...cur };
      const set = new Set(next[teacherId] || []);
      if (set.has(n)) set.delete(n); else set.add(n);
      next[teacherId] = set;
      return next;
    });
  };

  const isPast = date < min;

  const onSave = async () => {
    if (isPast) {
      await dialog.notify({ variant: 'error', title: t('pastDateBlocked') });
      return;
    }
    setBusy(true); setErr('');
    try {
      const payload = {
        date,
        records: Object.entries(hoursByTeacher).map(([teacher, hoursSet]) => ({
          teacher,
          hours: [...hoursSet].sort((a, b) => a - b),
        })),
      };
      await api.post('/teacher-attendance/bulk', payload);
      await dialog.notify({ variant: 'success', title: t('attendanceSaved') });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  // Search filter — name + email
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const hay = `${t.firstName || ''} ${t.lastName || ''} ${t.email || ''}`.toLowerCase();
      return q.split(/\s+/).every((c) => hay.includes(c));
    });
  }, [teachers, search]);

  // Quick stats for the summary chips at the top.
  const totalHours = Object.values(hoursByTeacher)
    .reduce((sum, set) => sum + (set?.size || 0), 0);
  const teachersRecorded = Object.values(hoursByTeacher)
    .filter((set) => set?.size > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">{t('teacherAttendanceTitle')}</h1>
        <button
          className="btn btn-primary"
          disabled={busy || isPast}
          onClick={onSave}
        >
          {busy ? t('loading') : t('saveAttendance')}
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-xs mb-1">{t('pickDate')}</span>
          <input type="date" className="input" min={min}
                 value={date}
                 onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block flex-1 min-w-[220px]">
          <span className="block text-xs mb-1">{t('searchStudents').replace('parent', 'email')}</span>
          <input type="text" className="input"
                 placeholder={t('searchStudents').replace('parent', 'email')}
                 value={search}
                 onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100">
            {teachersRecorded} / {teachers.length}
          </span>
          <span className="px-2 py-1 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
            {t('workedHours')}: {totalHours}
          </span>
        </div>
      </div>

      {isPast && <p className="text-sm text-red-600">{t('pastDateBlocked')}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map((teacher) => {
          const set = hoursByTeacher[String(teacher._id)] || new Set();
          return (
            <TeacherRow
              key={teacher._id}
              teacher={teacher}
              hourSet={set}
              onToggle={(n) => toggleHour(String(teacher._id), n)}
              t={t}
            />
          );
        })}
      </div>

      {!busy && filtered.length === 0 && (
        <div className="card text-slate-500">{t('noMatchingStudents').replace('students', 'teachers')}</div>
      )}
    </div>
  );
}

function TeacherRow({ teacher, hourSet, onToggle, t }) {
  const anyChecked = hourSet.size > 0;

  // Soft tint when at least one hour is checked, so the eye picks out
  // who's been recorded vs who hasn't.
  const cls = anyChecked
    ? 'bg-emerald-50 dark:bg-emerald-950/30'
    : '';

  return (
    <div className={'card flex items-center gap-3 transition-colors ' + cls}>
      <Avatar user={teacher} size={36} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{teacher.firstName} {teacher.lastName}</p>
        <p className="text-xs text-slate-500 truncate">{teacher.email}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {HOUR_NUMBERS.map((n) => {
          const on = hourSet.has(n);
          return (
            <label
              key={n}
              className={
                'inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold cursor-pointer transition ' +
                (on
                  ? 'bg-emerald-600 border-emerald-700 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800')
              }
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => onToggle(n)}
              />
              {t('hourN').replace('{n}', n)}
            </label>
          );
        })}
      </div>
    </div>
  );
}
