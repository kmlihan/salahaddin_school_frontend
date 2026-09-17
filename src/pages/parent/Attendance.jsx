import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';

/* ============================================================ status palette */

// One palette consumed by every cell, bar, and legend in this file. Keys
// match the Attendance.status enum on the server; null / undefined keys
// are treated as "no record".
const STATUS = {
  present: { color: '#16a34a', bg: '#DCFCE7', label: 'present', icon: '✓' },
  absent:  { color: '#dc2626', bg: '#FEE2E2', label: 'absent',  icon: '✗' },
  late:    { color: '#d97706', bg: '#FEF3C7', label: 'late',    icon: '⏰' },
  excused: { color: '#2563eb', bg: '#DBEAFE', label: 'excused', icon: 'ℹ' },
};
const NO_RECORD = { color: '#9ca3af', bg: 'transparent', label: 'noRecord', icon: '·' };

/**
 * Given a list of attendance records that all share the same calendar
 * date, return a 3-tuple [hour1Status, hour2Status, hour3Status]. Records
 * with `hour` set fill that specific slot; records without `hour` (legacy
 * day-level rows) backfill the still-empty slots with the same status.
 * That way a single legacy row shows up as a uniform 3-cell bar in the
 * UI, while per-hour records can vary across the row.
 */
function statusesForDay(records) {
  const out = [null, null, null];
  // Pass 1: explicit per-hour records.
  for (const r of records) {
    if (r.hour && r.hour >= 1 && r.hour <= 3) {
      out[r.hour - 1] = r.status;
    }
  }
  // Pass 2: legacy (no hour) records fill any still-blank cells.
  for (const r of records) {
    if (!r.hour) {
      for (let i = 0; i < 3; i++) {
        if (out[i] == null) out[i] = r.status;
      }
    }
  }
  return out;
}

/**
 * Pick the "dominant" status for a day, used for monthly calendar cells
 * and yearly month bars where one cell needs to summarise the whole day.
 *
 * Priority: present > late > excused > absent > none. The reasoning is
 * that "the student showed up at any point" is the most positive
 * indicator a parent wants to see at a glance.
 */
function dayStatus(records) {
  if (!records.length) return null;
  const set = new Set(records.map((r) => r.status));
  if (set.has('present')) return 'present';
  if (set.has('late'))    return 'late';
  if (set.has('excused')) return 'excused';
  if (set.has('absent'))  return 'absent';
  return null;
}

/** YYYY-MM-DD key used for grouping records by date. */
function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

/* ============================================================ page */

export default function ParentAttendance() {
  const { t } = useLang();
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [tab, setTab] = useState('daily');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Daily + monthly views share a "selected month" state ('YYYY-MM').
  // Yearly view has its own year state.
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Load children once on mount; preselect the first one.
  useEffect(() => {
    api.get('/parents/me/children')
      .then((r) => {
        setChildren(r.data);
        if (r.data.length > 0) setChildId((c) => c || r.data[0]._id);
      })
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload records whenever the child or the relevant date range changes.
  useEffect(() => {
    if (!childId) { setRecords([]); return; }
    let from, to;
    if (tab === 'yearly') {
      from = `${year}-01-01`;
      to   = `${year}-12-31`;
    } else {
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      from = `${month}-01`;
      to   = `${month}-${String(lastDay).padStart(2, '0')}`;
    }
    setLoading(true); setErr('');
    api.get(`/attendance/student/${childId}`, { params: { from, to } })
      .then((r) => setRecords(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')))
      .finally(() => setLoading(false));
  }, [childId, tab, month, year, t]);

  // Group records by 'YYYY-MM-DD' once — every view consumes this.
  const byDay = useMemo(() => {
    const out = {};
    for (const r of records) {
      const k = dayKey(r.date);
      (out[k] = out[k] || []).push(r);
    }
    return out;
  }, [records]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('attendance')}</h1>

      {/* Child picker — only when multiple children */}
      {children.length > 1 && (
        <div className="card flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">{t('pickChild')}:</span>
          {children.map((c) => (
            <button
              key={c._id}
              className={
                'btn text-sm ' +
                (c._id === childId ? 'btn-primary' : 'btn-ghost')
              }
              onClick={() => setChildId(c._id)}
            >
              {c.firstName} {c.lastName}
            </button>
          ))}
        </div>
      )}

      {children.length === 0 && !err && (
        <div className="card text-center text-slate-500">{t('noChildren') || 'No children on file yet.'}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {['daily', 'monthly', 'yearly'].map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              'px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ' +
              (tab === k
                ? 'border-[rgb(var(--accent))] text-[rgb(var(--accent))]'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')
            }
          >
            {t(k) || k}
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {loading && <p className="text-sm text-slate-500">{t('loading')}…</p>}

      <Legend t={t} />

      {childId && tab === 'daily'   && <DailyView   t={t} byDay={byDay} month={month} setMonth={setMonth} />}
      {childId && tab === 'monthly' && <MonthlyView t={t} byDay={byDay} month={month} setMonth={setMonth} records={records} />}
      {childId && tab === 'yearly'  && <YearlyView  t={t} records={records} year={year} setYear={setYear} />}
    </div>
  );
}

/* ============================================================ legend */

function Legend({ t }) {
  return (
    <div className="card flex flex-wrap gap-3 text-xs">
      {Object.entries(STATUS).map(([k, s]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-4 rounded"
            style={{ backgroundColor: s.bg, borderInlineStart: `3px solid ${s.color}` }}
          />
          {t(s.label) || s.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-4 h-4 rounded border border-slate-300 dark:border-slate-700" />
        {t(NO_RECORD.label) || 'No record'}
      </span>
    </div>
  );
}

/* ============================================================ daily view */

function DailyView({ t, byDay, month, setMonth }) {
  // Pull just the days of the selected month that have any records,
  // sorted descending (most recent first).
  const days = useMemo(() => {
    return Object.keys(byDay)
      .filter((k) => k.startsWith(month))
      .sort((a, b) => b.localeCompare(a));
  }, [byDay, month]);

  return (
    <div className="space-y-3">
      <MonthPicker t={t} value={month} onChange={setMonth} />

      {days.length === 0 ? (
        <div className="card text-center text-slate-500">{t('noRecords') || 'No attendance records for this month.'}</div>
      ) : (
        days.map((k) => (
          <DayRow key={k} t={t} dateKey={k} records={byDay[k]} />
        ))
      )}
    </div>
  );
}

function DayRow({ t, dateKey, records }) {
  const [s1, s2, s3] = statusesForDay(records);
  const dt = new Date(`${dateKey}T12:00:00`); // anchor at noon to avoid TZ wobble
  return (
    <div className="card flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[12rem]">
        <p className="font-semibold">
          {dt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        {records[0]?.note && (
          <p className="text-xs italic text-slate-500 mt-0.5">"{records[0].note}"</p>
        )}
      </div>
      <div className="flex gap-2">
        <HourCell t={t} hour={1} status={s1} />
        <HourCell t={t} hour={2} status={s2} />
        <HourCell t={t} hour={3} status={s3} />
      </div>
    </div>
  );
}

function HourCell({ t, hour, status }) {
  const s = status ? STATUS[status] : NO_RECORD;
  return (
    <div
      className="rounded-md text-center min-w-[5.5rem] py-1.5 px-2"
      style={{
        backgroundColor: s.bg,
        color: s.color,
        borderInlineStart: status ? `3px solid ${s.color}` : '3px solid #e5e7eb',
      }}
      title={t(s.label) || s.label}
    >
      <div className="text-[10px] uppercase opacity-70">{t('hour') || 'Hour'} {hour}</div>
      <div className="text-base font-bold leading-tight">{s.icon}</div>
      <div className="text-[10px]">{t(s.label) || s.label}</div>
    </div>
  );
}

/* ============================================================ monthly view */

function MonthlyView({ t, byDay, month, setMonth, records }) {
  const [y, m] = month.split('-').map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const lastOfMonth  = new Date(y, m, 0);

  // Build a calendar grid starting on Monday. Pad leading + trailing
  // empty cells so the grid is aligned visually.
  const cells = useMemo(() => {
    const arr = [];
    // JS getDay(): 0=Sun..6=Sat. We want Mon=0..Sun=6.
    const lead = (firstOfMonth.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) arr.push({ blank: true, key: `lead-${i}` });
    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      const dayK = `${month}-${String(d).padStart(2, '0')}`;
      const recs = byDay[dayK] || [];
      arr.push({ blank: false, key: dayK, day: d, recs, status: dayStatus(recs) });
    }
    // Pad to a multiple of 7 for a clean trailing edge.
    while (arr.length % 7 !== 0) arr.push({ blank: true, key: `tail-${arr.length}` });
    return arr;
  }, [month, byDay, firstOfMonth, lastOfMonth]);

  // Stats: count records by status (more granular than counting days).
  const stats = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) c[r.status] = (c[r.status] || 0) + 1;
    const total = c.present + c.absent + c.late + c.excused;
    return { ...c, total };
  }, [records]);

  const weekdayShort = (n) => {
    // n = 0..6 starting Mon
    const ref = new Date(2024, 0, 1 + n); // Jan 1 2024 was a Monday
    return ref.toLocaleDateString(undefined, { weekday: 'short' });
  };

  return (
    <div className="space-y-3">
      <MonthPicker t={t} value={month} onChange={setMonth} />

      {/* Stats panel */}
      <div className="card grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label={t('totalSessions') || 'Sessions'} value={stats.total} />
        <Stat label={t('present')} value={stats.present} accent={STATUS.present.color} />
        <Stat label={t('absent')}  value={stats.absent}  accent={STATUS.absent.color} />
        <Stat label={t('late')}    value={stats.late}    accent={STATUS.late.color} />
        <Stat label={t('excused')} value={stats.excused} accent={STATUS.excused.color} />
      </div>

      {/* Calendar grid */}
      <div className="card">
        <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 font-medium mb-1">
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="text-center">{weekdayShort(n)}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => {
            if (c.blank) return <div key={c.key} className="h-16" />;
            const s = c.status ? STATUS[c.status] : NO_RECORD;
            const empty = !c.status;
            return (
              <div
                key={c.key}
                className="h-16 rounded-md p-1.5 text-xs flex flex-col"
                style={{
                  backgroundColor: empty ? 'transparent' : s.bg,
                  color: empty ? '#9ca3af' : s.color,
                  border: empty ? '1px solid #e5e7eb' : `1px solid ${s.color}`,
                }}
                title={c.status ? (t(s.label) || s.label) : ''}
              >
                <div className="font-semibold">{c.day}</div>
                {!empty && <div className="text-base mt-auto">{s.icon}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

/* ============================================================ yearly view */

function YearlyView({ t, records, year, setYear }) {
  // Group records by month (1..12). We compute counts per status, then
  // render a stacked bar per month showing the proportions.
  const byMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({
      present: 0, absent: 0, late: 0, excused: 0,
    }));
    for (const r of records) {
      const d = new Date(r.date);
      if (d.getFullYear() !== Number(year)) continue;
      const mi = d.getMonth();
      months[mi][r.status] = (months[mi][r.status] || 0) + 1;
    }
    return months;
  }, [records, year]);

  const yearTotal = byMonth.reduce(
    (acc, m) => ({
      present: acc.present + m.present,
      absent:  acc.absent  + m.absent,
      late:    acc.late    + m.late,
      excused: acc.excused + m.excused,
    }),
    { present: 0, absent: 0, late: 0, excused: 0 }
  );
  const yearTotalSessions = yearTotal.present + yearTotal.absent + yearTotal.late + yearTotal.excused;
  const yearPresentPct = yearTotalSessions
    ? Math.round((yearTotal.present / yearTotalSessions) * 100)
    : 0;

  return (
    <div className="space-y-3">
      <YearPicker t={t} value={year} onChange={setYear} />

      <div className="card grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label={t('totalSessions') || 'Sessions'} value={yearTotalSessions} />
        <Stat label={t('present')} value={yearTotal.present} accent={STATUS.present.color} />
        <Stat label={t('absent')}  value={yearTotal.absent}  accent={STATUS.absent.color} />
        <Stat label={t('late')}    value={yearTotal.late}    accent={STATUS.late.color} />
        <Stat label={t('attendanceRate') || 'Attendance'} value={`${yearPresentPct}%`} />
      </div>

      <div className="card space-y-2">
        {byMonth.map((m, i) => {
          const total = m.present + m.absent + m.late + m.excused;
          const monthName = new Date(year, i, 1).toLocaleDateString(undefined, { month: 'long' });
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-sm text-slate-600 dark:text-slate-400">{monthName}</div>
              <div className="flex-1">
                {total === 0 ? (
                  <div className="h-5 rounded bg-slate-100 dark:bg-slate-800" />
                ) : (
                  <StackedBar
                    parts={[
                      { value: m.present, color: STATUS.present.color },
                      { value: m.late,    color: STATUS.late.color    },
                      { value: m.excused, color: STATUS.excused.color },
                      { value: m.absent,  color: STATUS.absent.color  },
                    ]}
                    total={total}
                  />
                )}
              </div>
              <div className="w-32 text-xs text-slate-500 text-end">
                {total > 0
                  ? `${m.present}/${total} ${t('present').toLowerCase ? t('present').toLowerCase() : 'present'}`
                  : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StackedBar({ parts, total }) {
  return (
    <div className="h-5 rounded overflow-hidden flex">
      {parts.map((p, i) => p.value > 0 && (
        <div
          key={i}
          style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }}
          className="h-full"
        />
      ))}
    </div>
  );
}

/* ============================================================ pickers */

function MonthPicker({ t, value, onChange }) {
  const shift = (delta) => {
    const [y, m] = value.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const [y, m] = value.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-ghost" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input text-sm w-auto"
      />
      <span className="text-sm text-slate-500 hidden md:inline">{label}</span>
      <button className="btn btn-ghost" onClick={() => shift(1)} aria-label="Next month">›</button>
    </div>
  );
}

function YearPicker({ t, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-ghost" onClick={() => onChange(Number(value) - 1)} aria-label="Previous year">‹</button>
      <input
        type="number"
        min="2000"
        max="2100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || value)}
        className="input text-sm w-24"
      />
      <button className="btn btn-ghost" onClick={() => onChange(Number(value) + 1)} aria-label="Next year">›</button>
    </div>
  );
}
