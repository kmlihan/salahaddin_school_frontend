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

const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Read a student's parent's display name no matter how `parent` arrives:
 *   - undefined / null / empty string  -> ''
 *   - populated object {firstName, lastName, email}
 *   - bare ObjectId string (rare here, but defensive)
 */
function parentDisplay(student) {
  const p = student?.parent;
  if (!p) return '';
  if (typeof p === 'object') {
    return `${p.firstName || ''} ${p.lastName || ''} ${p.email || ''}`.trim();
  }
  return '';
}

/**
 * Free-text filter across firstName + lastName + email + parent's name/email.
 * Case-insensitive, multi-word: each whitespace-separated chunk in the query
 * must appear somewhere in the haystack.
 */
function studentMatches(student, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [
    student.firstName, student.lastName, student.email,
    parentDisplay(student),
  ].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every((chunk) => hay.includes(chunk));
}

/**
 * Tailwind classes for the gender-tinted background. Picks a soft pastel in
 * light mode and a deeply tinted but dark-friendly variant in dark mode.
 *
 *   - male:   blue-50  / dark blue-950 at 40 % opacity
 *   - female: pink-50  / dark pink-950 at 40 % opacity
 *
 * Used for both Record-tab cards and History-tab rows AND the chip picker
 * so the male/female cue is consistent everywhere.
 */
function genderTintClass(student) {
  return student?.gender === 'female'
    ? 'bg-pink-50 dark:bg-pink-950/40'
    : 'bg-blue-50 dark:bg-blue-950/40';
}

export default function AdminAttendance() {
  const { t } = useLang();
  const [tab, setTab] = useState('record');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('attendanceTitle')}</h1>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab('record')}
          className={'btn text-sm ' + (tab === 'record' ? 'btn-primary' : 'btn-ghost')}
        >
          {t('record')}
        </button>
        <button
          onClick={() => setTab('history')}
          className={'btn text-sm ' + (tab === 'history' ? 'btn-primary' : 'btn-ghost')}
        >
          {t('history')}
        </button>
      </div>

      {tab === 'record' ? <RecordTab /> : <HistoryTab />}
    </div>
  );
}

/* ---------- RECORD TAB ---------------------------------------------------- */

function RecordTab() {
  const { t } = useLang();
  const dialog = useDialog();
  const min = todayStr();

  const [date, setDate] = useState(min);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState(''); // '' | 'male' | 'female'

  const load = async (dateStr) => {
    setErr(''); setBusy(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        api.get('/students'),
        api.get('/attendance', { params: { date: dateStr } }),
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

  useEffect(() => { load(date); /* eslint-disable-next-line */ }, [date]);

  const setStatus = (sid, status) => setRecords((r) => ({ ...r, [String(sid)]: status }));
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
        records: Object.entries(records).map(([student, status]) => ({ student, status })),
      };
      await api.post('/attendance/bulk', payload);
      await dialog.notify({ variant: 'success', title: t('attendanceSaved') });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  // Apply search + gender filter before grouping by level so the empty-state
  // messaging works against the visible set.
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (!studentMatches(s, search)) return false;
      // Default 'male' if the student has no gender stored — matches how
      // the rest of the UI tints unknown-gender as male.
      if (genderFilter && (s.gender || 'male') !== genderFilter) return false;
      return true;
    });
  }, [students, search, genderFilter]);

  const byLevel = useMemo(() => {
    const out = {};
    for (const s of filteredStudents) {
      const k = s.level || '?';
      (out[k] = out[k] || []).push(s);
    }
    return out;
  }, [filteredStudents]);
  const levels = Object.keys(byLevel).sort();

  // Status counters reflect the FULL student set, not the filtered view —
  // the user wants to know how many of all students are recorded so far.
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  for (const v of Object.values(records)) if (counts[v] != null) counts[v]++;

  return (
    <>
      <div className="card flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-xs mb-1">{t('pickDate')}</span>
          <input type="date" className="input"
                 min={min} value={date}
                 onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="block flex-1 min-w-[220px]">
          <span className="block text-xs mb-1">{t('searchStudents')}</span>
          <input
            type="text" className="input"
            placeholder={t('searchStudents')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {/*
          Gender toggle — three buttons: all / male / female. Each lights up
          in its representative colour when active so the filter state is
          obvious. Composes with the search box.
        */}
        <div className="block">
          <span className="block text-xs mb-1">{t('tableGender')}</span>
          <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden">
            <GenderToggleBtn
              label={t('allStudents')}
              active={genderFilter === ''}
              onClick={() => setGenderFilter('')}
              activeStyle={{ backgroundColor: '#64748B', color: 'white' }}
            />
            <GenderToggleBtn
              label={t('male') || 'male'}
              active={genderFilter === 'male'}
              onClick={() => setGenderFilter('male')}
              activeStyle={{ backgroundColor: '#2563EB', color: 'white' }}
            />
            <GenderToggleBtn
              label={t('female') || 'female'}
              active={genderFilter === 'female'}
              onClick={() => setGenderFilter('female')}
              activeStyle={{ backgroundColor: '#DB2777', color: 'white' }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {STATUSES.map((s) => (
            <span
              key={s}
              className="px-2 py-1 rounded-full font-semibold"
              style={{ backgroundColor: STATUS_COLOURS[s].bg, color: STATUS_COLOURS[s].text }}
            >
              {t(s)}: {counts[s]}
            </span>
          ))}
          <span className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {t('notRecorded')}: {students.length - Object.keys(records).length}
          </span>
        </div>

        <button
          className="btn btn-primary ms-auto"
          disabled={busy || isPast || Object.keys(records).length === 0}
          onClick={onSave}
        >
          {busy ? t('loading') : t('saveAttendance')}
        </button>
      </div>

      {isPast && <p className="text-sm text-red-600">{t('pastDateBlocked')}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {students.length === 0 && !busy && (
        <div className="card text-slate-500">{t('noStudentsFound')}</div>
      )}

      {students.length > 0 && filteredStudents.length === 0 && (
        <div className="card text-slate-500">{t('noMatchingStudents')}</div>
      )}

      {levels.map((lv) => (
        <section key={lv} className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase">
            {t('level')} {lv}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {byLevel[lv].map((s) => (
              <StudentRow
                key={s._id}
                student={s}
                status={records[String(s._id)] || ''}
                onStatus={(st) => setStatus(s._id, st)}
                t={t}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/* ---------- HISTORY TAB --------------------------------------------------- */

function HistoryTab() {
  const { t } = useLang();
  const today = todayStr();

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(today);

  const [allStudents, setAllStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // empty = all
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/students').then((r) => setAllStudents(r.data)).catch(() => {});
  }, []);

  const load = async () => {
    setBusy(true); setErr('');
    try {
      const params = { from, to };
      if (selectedIds.length) params.students = selectedIds.join(',');
      const { data } = await api.get('/attendance/range', { params });
      setRecords(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to, selectedIds.length, selectedIds.join(',')]);

  const toggleStudent = (id) =>
    setSelectedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const clearSelected = () => setSelectedIds([]);

  // Filter the chip list (purely cosmetic — search narrows what's shown,
  // doesn't auto-select). Selected chips outside the search are still kept
  // in selectedIds and still affect the query.
  const filteredChips = useMemo(
    () => allStudents.filter((s) => studentMatches(s, search)),
    [allStudents, search]
  );

  return (
    <>
      <div className="card space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs mb-1">{t('from')}</span>
            <input type="date" className="input" value={from} max={to}
                   onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1">{t('to')}</span>
            <input type="date" className="input" value={to} min={from}
                   onChange={(e) => setTo(e.target.value)} />
          </label>
          <div className="ms-auto text-xs text-slate-500">
            {selectedIds.length === 0
              ? t('allStudents')
              : `${selectedIds.length} ${t('studentsSelected')}`}
          </div>
        </div>

        <label className="block">
          <span className="block text-xs mb-1">{t('searchStudents')}</span>
          <input
            type="text" className="input"
            placeholder={t('searchStudents')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs">{t('selectStudents')}</span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                className="text-xs text-slate-500 hover:underline"
                onClick={clearSelected}
              >
                {t('allStudents')}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {filteredChips.map((s) => {
              const active = selectedIds.includes(s._id);
              const tint = genderTintClass(s);
              const parentName = parentDisplay(s);

              // When inactive, show the soft gender tint so the picker itself
              // makes male/female obvious. When active, swap to the accent
              // colour so the "selected" state still reads loudly.
              const cls = active
                ? 'bg-[rgb(var(--accent))] text-white border-transparent'
                : `${tint} text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:opacity-90`;

              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => toggleStudent(s._id)}
                  title={parentName ? `${t('parent')}: ${parentName}` : ''}
                  className={
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm transition ' + cls
                  }
                >
                  <Avatar user={s} size={20} />
                  <span>{s.firstName} {s.lastName}</span>
                </button>
              );
            })}
            {allStudents.length === 0 && <span className="text-xs text-slate-500">—</span>}
            {allStudents.length > 0 && filteredChips.length === 0 && (
              <span className="text-xs text-slate-500">{t('noMatchingStudents')}</span>
            )}
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2"></th>
              <th className="text-start px-3 py-2">{t('student')}</th>
              <th className="text-start px-3 py-2">{t('parent')}</th>
              <th className="text-start px-3 py-2">{t('level')}</th>
              <th className="text-start px-3 py-2">{t('tableDate')}</th>
              <th className="text-start px-3 py-2">{t('tableStatus')}</th>
              <th className="text-start px-3 py-2">{t('notes')}</th>
            </tr>
          </thead>
          <tbody>
            {!busy && records.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                {t('noResults')}
              </td></tr>
            )}
            {records.map((r) => {
              const c = STATUS_COLOURS[r.status] || { bg: '#64748B', text: 'white' };
              const tint = genderTintClass(r.student);
              const pName = parentDisplay(r.student);
              return (
                <tr key={r._id} className={'border-t border-slate-200 dark:border-slate-800 ' + tint}>
                  <td className="px-3 py-2"><Avatar user={r.student} size={28} /></td>
                  <td className="px-3 py-2">
                    {r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">{pName || '—'}</td>
                  <td className="px-3 py-2">{r.student?.level || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: c.bg, color: c.text }}
                    >
                      {t(r.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.note || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- shared row used by Record tab --------------------------------- */

/**
 * One segment of the all/male/female toggle. When inactive it shows a muted
 * label; when active it picks up the colour passed via activeStyle so the
 * blue/pink mapping reads at a glance.
 */
function GenderToggleBtn({ label, active, onClick, activeStyle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3 py-1.5 text-xs transition ' +
        (active
          ? ''
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
      }
      style={active ? activeStyle : undefined}
    >
      {label}
    </button>
  );
}

function StudentRow({ student, status, onStatus, t }) {
  const tint = genderTintClass(student);
  const c = STATUS_COLOURS[status]; // undefined when not recorded yet

  // When a status is set, draw a thick coloured left edge + a soft colour
  // wash on top of the gender tint. We use the status colour at low alpha so
  // the gender background still shows through enough to be readable, while
  // the status is the dominant signal. When nothing's set, just show the
  // gender tint as before.
  //
  // The status's own brand colour also drives the inset border — so a row's
  // colour change is visible from the very edge of the card, useful when
  // scanning a dense list.
  const statusStyle = c
    ? {
        boxShadow: `inset 4px 0 0 0 ${c.bg}`,
        backgroundImage: `linear-gradient(${c.bg}1A, ${c.bg}1A)`, // 1A = ~10% alpha
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
        <p className="text-xs text-slate-500 truncate">
          {student.email}
          {parentDisplay(student) && <> · {parentDisplay(student)}</>}
        </p>
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
