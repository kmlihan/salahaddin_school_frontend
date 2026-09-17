import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';
import MultiLangInput from '../../components/MultiLangInput';
import CalendarStatusPill from '../../components/CalendarStatusPill';
import DayOffBanner from '../../components/DayOffBanner';

const HOURS = [1, 2, 3];
const LEVELS = ['A', 'B', 'C', 'D'];
const DAYOFF_KINDS = ['free', 'vacation', 'holiday'];
const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyLesson = () => ({
  kind: 'lesson',
  date: todayStr(),
  hour: 1,
  teacher: '',
  title: { en: '', ar: '', nl: '' },
  levels: ['A'],
});
const emptyDayOff = () => ({
  kind: 'dayOff',
  date: todayStr(),
  label: { en: '', ar: '', nl: '' },
  dayOffKind: 'free',
  levels: [], // empty = applies to all levels
});

/**
 * Format a UTC-midnight Date as a long human day label, *in UTC*. The
 * server stores the date the admin picked at UTC midnight; reading it in
 * the browser's local timezone with toLocaleDateString() can shift it
 * back a day on UTC- timezones, which is the bug the user hit. Forcing
 * timeZone: 'UTC' on the formatter pins the display to the stored day.
 */
function formatDayLabelUTC(isoDate, locale) {
  return new Date(isoDate).toLocaleDateString(locale || undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function AdminCalendar() {
  const { t, ml } = useLang();
  const dialog = useDialog();
  const [teachers, setTeachers] = useState([]);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    const [tch, cal] = await Promise.all([
      api.get('/teachers'),
      api.get('/calendar'),
    ]);
    setTeachers(tch.data);
    setItems(cal.data);
  };
  useEffect(() => { load(); }, []);

  const startEdit = (it) => setEditing({
    ...it,
    date: new Date(it.date).toISOString().slice(0, 10),
    teacher: it.teacher?._id || it.teacher || '',
  });

  const onSave = async () => {
    setBusy(true); setErr('');
    try {
      if (editing._id) await api.put(`/calendar/${editing._id}`, editing);
      else            await api.post('/calendar', editing);
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  const onDelete = async (it) => {
    const ok = await dialog.confirm({ title: t('confirmDelete'), danger: true });
    if (!ok) return;
    await api.delete(`/calendar/${it._id}`);
    load();
  };

  const toggleLevel = (lv) => {
    const has = (editing.levels || []).includes(lv);
    setEditing({
      ...editing,
      levels: has
        ? editing.levels.filter((x) => x !== lv)
        : [...(editing.levels || []), lv],
    });
  };

  // Group entries by UTC-date string. Within each day, day-off entries
  // come first as banners, then lessons sorted by hour.
  const grouped = useMemo(() => {
    const out = {};
    for (const it of items) {
      const key = new Date(it.date).toISOString().slice(0, 10);
      (out[key] = out[key] || []).push(it);
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'dayOff' ? -1 : 1;
        return (a.hour || 0) - (b.hour || 0);
      });
    }
    return out;
  }, [items]);

  const sortedDays = Object.keys(grouped).sort();

  const isLesson = editing?.kind === 'lesson';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">{t('calendar')}</h1>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={() => setEditing(emptyLesson())}>
            + {t('addLesson')}
          </button>
          <button
            className="btn"
            style={{ backgroundColor: '#DCFCE7', color: '#166534' }}
            onClick={() => setEditing(emptyDayOff())}
          >
            🏖️ {t('addFreeDay')}
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {editing && (
        <div className="card border-2 border-blue-300 dark:border-blue-700 space-y-3">
          <h2 className="font-semibold">
            {editing._id
              ? t('edit')
              : (isLesson ? t('addLesson') : t('addFreeDay'))}
          </h2>

          {isLesson ? (
            <>
              <div>
                <span className="block text-xs mb-1">{t('tableTitle') || 'Title'}</span>
                <MultiLangInput value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-xs mb-1">{t('pickDate')}</span>
                  <input type="date" className="input"
                         value={editing.date}
                         onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                </label>
                <label className="block">
                  <span className="block text-xs mb-1">{t('hour') || 'Hour'}</span>
                  <select className="input"
                          value={editing.hour}
                          onChange={(e) => setEditing({ ...editing, hour: Number(e.target.value) })}>
                    {HOURS.map((n) => (
                      <option key={n} value={n}>{t('hourN').replace('{n}', n)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs mb-1">{t('teacher')}</span>
                  <select className="input"
                          value={editing.teacher}
                          onChange={(e) => setEditing({ ...editing, teacher: e.target.value })}>
                    <option value="">—</option>
                    {teachers.map((tch) => (
                      <option key={tch._id} value={tch._id}>
                        {tch.firstName} {tch.lastName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="block text-xs mb-1">{t('dayOffLabel')}</span>
                <MultiLangInput value={editing.label || {}} onChange={(v) => setEditing({ ...editing, label: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs mb-1">{t('pickDate')}</span>
                  <input type="date" className="input"
                         value={editing.date}
                         onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                </label>
                <label className="block">
                  <span className="block text-xs mb-1">{t('dayOffKind')}</span>
                  <select className="input"
                          value={editing.dayOffKind}
                          onChange={(e) => setEditing({ ...editing, dayOffKind: e.target.value })}>
                    {DAYOFF_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k === 'free' ? t('freeDay') : k === 'vacation' ? t('vacation') : t('holiday')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          <div>
            <span className="block text-xs mb-1">
              {isLesson ? t('levels') : t('levelsAffected')}
            </span>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((lv) => {
                const on = (editing.levels || []).includes(lv);
                return (
                  <label
                    key={lv}
                    className={
                      'inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition ' +
                      (on
                        ? 'bg-[rgb(var(--accent))] text-white border-transparent'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800')
                    }
                  >
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleLevel(lv)} />
                    {t('level')} {lv}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={onSave} disabled={busy}>
              {busy ? t('loading') : t('save')}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {sortedDays.length === 0 && (
        <div className="card text-slate-500 text-center">{t('noLessonsScheduled')}</div>
      )}

      {sortedDays.map((day) => (
        <section key={day} className="space-y-2">
          <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-400">
            {formatDayLabelUTC(day)}
          </h3>
          <div className="space-y-2">
            {grouped[day].map((it) => it.kind === 'dayOff'
              ? (
                <DayOffBanner
                  key={it._id}
                  entry={it}
                  hideDate
                  showActions
                  onEdit={() => startEdit(it)}
                  onDelete={() => onDelete(it)}
                />
              )
              : (
                <div key={it._id} className="card flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center w-14 py-2 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100">
                    <span className="text-xs uppercase">{t('hour') || 'Hour'}</span>
                    <span className="text-2xl font-bold leading-none">{it.hour}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{ml(it.title)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {it.teacher
                        ? <>{t('teacher')}: {it.teacher.firstName} {it.teacher.lastName} · </>
                        : null}
                      {t('levels')}: {(it.levels || []).join(', ') || '—'}
                    </p>
                    {it.approvalNote && it.status === 'declined' && (
                      <p className="text-xs italic text-red-600 mt-1">"{it.approvalNote}"</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <CalendarStatusPill status={it.status} />
                    <div className="flex gap-1">
                      <button className="btn btn-ghost text-xs" onClick={() => startEdit(it)}>{t('edit')}</button>
                      <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(it)}>{t('delete')}</button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
