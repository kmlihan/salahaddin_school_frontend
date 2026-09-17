import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';
import CalendarStatusPill from '../../components/CalendarStatusPill';
import DayOffBanner from '../../components/DayOffBanner';

const today = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export default function TeacherCalendar() {
  const { t, ml } = useLang();
  const dialog = useDialog();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const { data } = await api.get('/calendar');
      setItems(data);
    } catch (e) { setErr(e.response?.data?.message || t('error')); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const respond = async (it, status) => {
    let note = '';
    if (status === 'declined') {
      const r = await dialog.prompt({
        title: t('declineReason'),
        placeholder: t('declineReason'),
        multiline: true,
      });
      if (r === null) return;
      note = r;
    }
    try {
      await api.post(`/calendar/${it._id}/respond`, { status, note });
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  // Split into upcoming vs past — UTC-based comparison so it matches
  // the way dates are stored.
  const t0 = today().getTime();
  const upcoming = items.filter((it) => new Date(it.date).getTime() >= t0);
  const past = items.filter((it) => new Date(it.date).getTime() < t0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('calendar')}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <Section title={t('upcomingLessons')} items={upcoming} t={t} ml={ml} respond={respond} canRespond />
      {past.length > 0 && (
        <Section title={t('pastLessons')} items={past} t={t} ml={ml} respond={respond} />
      )}
    </div>
  );
}

function Section({ title, items, t, ml, respond, canRespond }) {
  if (items.length === 0) {
    return (
      <section>
        <h2 className="font-semibold mb-2">{title}</h2>
        <div className="card text-slate-500 text-center">{t('noLessonsScheduled')}</div>
      </section>
    );
  }
  return (
    <section>
      <h2 className="font-semibold mb-2">{title}</h2>
      <div className="space-y-2">
        {items.map((it) => it.kind === 'dayOff'
          ? <DayOffBanner key={it._id} entry={it} />
          : <Row key={it._id} it={it} t={t} ml={ml} respond={respond} canRespond={canRespond} />)}
      </div>
    </section>
  );
}

function Row({ it, t, ml, respond, canRespond }) {
  const showButtons = canRespond && it.status === 'pending';
  return (
    <div className="card flex items-start gap-3">
      <div className="flex flex-col items-center justify-center w-14 py-2 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100">
        <span className="text-xs uppercase">{t('hour') || 'Hour'}</span>
        <span className="text-2xl font-bold leading-none">{it.hour}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{ml(it.title)}</p>
        <p className="text-xs text-slate-500 mt-1">
          {/* Format the stored UTC-midnight Date as a UTC day label so the
              displayed weekday/date matches what the admin picked. */}
          {new Date(it.date).toLocaleDateString(undefined, {
            weekday: 'long', day: 'numeric', month: 'long',
            timeZone: 'UTC',
          })}
          {' · '}
          {t('levels')}: {(it.levels || []).join(', ') || '—'}
        </p>
      </div>
      <div className="flex flex-col gap-1 items-end">
        <CalendarStatusPill status={it.status} />
        {showButtons && (
          <div className="flex gap-1 mt-1">
            <button
              className="btn text-xs"
              style={{ backgroundColor: '#16a34a', color: 'white' }}
              onClick={() => respond(it, 'approved')}
            >
              ✓ {t('iWillCome')}
            </button>
            <button
              className="btn text-xs"
              style={{ backgroundColor: '#dc2626', color: 'white' }}
              onClick={() => respond(it, 'declined')}
            >
              ✗ {t('iCannotCome')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
