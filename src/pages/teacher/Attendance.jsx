import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import Avatar from '../../components/Avatar';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';

const STATUSES = ['present', 'late', 'excused', 'absent'];

const STATUS_COLOURS = {
  present: { bg: '#16a34a', text: 'white' },
  late:    { bg: '#f59e0b', text: 'white' },
  excused: { bg: '#6366f1', text: 'white' },
  absent:  { bg: '#dc2626', text: 'white' },
};

const HOURS = [1, 2, 3];
const todayStr = () => new Date().toISOString().slice(0, 10);

function genderTintClass(student) {
  return student?.gender === 'female'
    ? 'bg-pink-50 dark:bg-pink-950/40'
    : 'bg-blue-50 dark:bg-blue-950/40';
}

function studentMatches(student, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [student.firstName, student.lastName, student.email]
    .filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every((chunk) => hay.includes(chunk));
}

/**
 * Teacher per-hour attendance.
 *
 * Flow: pick a date + an hour (1st / 2nd / 3rd), the full student roster
 * loads grouped by level, the teacher taps a status chip per student,
 * then Save. Records are written with the chosen `hour` so the parent
 * dashboard's per-hour breakdown reflects them.
 *
 * Re-opening the same date + hour reloads whatever was already recorded
 * so edits overwrite rather than duplicate. Switching the hour reloads
 * that hour's marks independently — hour 1 and hour 2 are separate.
 */
export default function TeacherAttendance() {
  const { t } = useLang();
  const dialog = useDialog();

  const [date, setDate] = useState(todayStr());
  const [hour, setHour] = useState(1);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({}); // { [studentId]: status }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');

  const load = async (dateStr, hourVal) => {
    setErr(''); setBusy(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        api.get('/students'),
        api.get('/attendance', { params: { date: dateStr, hour: hourVal } }),
      ]);
      setStudents(stuRes.data);
      const map = {};
      for (const r of attRes.data) {
        const sid = r.student?._id || r.student;
        if (sid) map[String(sid)] = r.status;
      }
      setRecords(map);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  // Reload whenever the date or hour changes — each (date, hour) slot is
  // its own independent attendance sheet.
  useEffect(() => { load(date, hour); /* eslint-disable-next-line */ }, [date, hour]);

  const setStatus = (sid, status) =>
    setRecords((r) => ({ ...r, [String(sid)]: status }));

  // Attendance is retrospective, so future dates are the only ones
  // blocked (mirrors the server rule).
  const isFuture = date > todayStr();

  const onSave = async () => {
    if (isFuture) {
      await dialog.notify({ variant: 'error', title: t('futureDateBlocked') || 'Cannot record attendance for a future date' });
      return;
    }
    setBusy(true); setErr('');
    try {
      const payload = {
        date,
        hour,
        records: Object.entries(records).map(([student, status]) => ({ student, status })),
      };
      await api.post('/attendance/bulk', payload);
      await dialog.notify({ variant: 'success', title: t('attendanceSaved') || 'Attendance saved' });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  const filteredStudents = useMemo(
    () => students.filter((s) => studentMatches(s, search)),
    [students, search]
  );

  const byLevel = useMemo(() => {
    const out = {};
    for (const s of filteredStudents) {
      const k = s.level || '?';
      (out[k] = out[k] || []).push(s);
    }
    return out;
  }, [filteredStudents]);
  const levels = Object.keys(byLevel).sort();

  // Counters over the full set (not the filtered view) so the teacher
  // sees overall progress regardless of the search box.
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  for (const v of Object.values(records)) if (counts[v] != null) counts[v]++;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('attendanceTitle') || t('attendance')}</h1>

      <div className="card flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-xs mb-1">{t('pickDate')}</span>
          <input
            type="date"
            className="input"
            max={todayStr()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <div className="block">
          <span className="block text-xs mb-1">{t('hour') || 'Hour'}</span>
          <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden">
            {HOURS.map((h) => {
              const active = hour === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour(h)}
                  className={
                    'px-4 py-1.5 text-sm transition ' +
                    (active
                      ? 'bg-[rgb(var(--accent))] text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
                  }
                >
                  {(t('hourN') || 'Hour {n}').replace('{n}', h)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block flex-1 min-w-[220px]">
          <span className="block text-xs mb-1">{t('searchStudents') || 'Search students'}</span>
          <input
            type="text"
            className="input"
            placeholder={t('searchStudents') || 'Search students'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {/* Counters + save */}
      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const c = STATUS_COLOURS[s];
            return (
              <span
                key={s}
                className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ backgroundColor: c.bg, color: c.text }}
              >
                {t(s)}: {counts[s]}
              </span>
            );
          })}
        </div>
        <div className="ms-auto">
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={busy || isFuture}
            title={isFuture ? (t('futureDateBlocked') || 'Cannot record attendance for a future date') : ''}
          >
            {busy ? t('loading') : t('save')}
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {isFuture && (
        <p className="text-sm text-amber-600">
          {t('futureDateBlocked') || 'Cannot record attendance for a future date'}
        </p>
      )}

      {busy && students.length === 0 && (
        <p className="text-sm text-slate-500">{t('loading')}…</p>
      )}

      {levels.length === 0 && !busy && (
        <div className="card text-center text-slate-500">
          {t('noResults') || t('noMatchingStudents') || '—'}
        </div>
      )}

      {levels.map((lv) => (
        <section key={lv} className="space-y-2">
          <h2 className="font-semibold text-sm text-slate-600 dark:text-slate-400">
            {t('level')} {lv} · {byLevel[lv].length}
          </h2>
          <div className="space-y-2">
            {byLevel[lv].map((s) => (
              <StudentRow
                key={s._id}
                student={s}
                status={records[String(s._id)]}
                onStatus={(st) => setStatus(s._id, st)}
                t={t}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StudentRow({ student, status, onStatus, t }) {
  const tint = genderTintClass(student);
  const c = STATUS_COLOURS[status];

  const statusStyle = c
    ? {
        boxShadow: `inset 4px 0 0 0 ${c.bg}`,
        backgroundImage: `linear-gradient(${c.bg}1A, ${c.bg}1A)`,
      }
    : undefined;

  return (
    <div
      className={'card flex items-center gap-3 transition-colors duration-150 ' + tint}
      style={statusStyle}
    >
      <Avatar user={student} size={36} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{student.firstName} {student.lastName}</p>
        <p className="text-xs text-slate-500 truncate">{student.email}</p>
      </div>
      <div className="flex gap-1 flex-wrap">
        {STATUSES.map((st) => {
          const active = status === st;
          const sc = STATUS_COLOURS[st];
          return (
            <button
              key={st}
              type="button"
              onClick={() => onStatus(st)}
              className="text-xs px-2 py-1 rounded-full font-semibold transition"
              style={{
                backgroundColor: active ? sc.bg : 'transparent',
                color: active ? sc.text : sc.bg,
                border: `1.5px solid ${sc.bg}`,
              }}
            >
              {t(st)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
