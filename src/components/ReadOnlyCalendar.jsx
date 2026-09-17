import { useEffect, useState } from 'react';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import DayOffBanner from './DayOffBanner';

const today = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export default function ReadOnlyCalendar() {
  const { t, ml } = useLang();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/calendar')
      .then((r) => setItems(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [t]);

  const t0 = today().getTime();
  const upcoming = items.filter((it) => new Date(it.date).getTime() >= t0);
  const past = items.filter((it) => new Date(it.date).getTime() < t0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('calendar')}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <Group title={t('upcomingLessons')} items={upcoming} t={t} ml={ml} />
      {past.length > 0 && (
        <Group title={t('pastLessons')} items={past.slice(0, 20)} t={t} ml={ml} dim />
      )}
    </div>
  );
}

function Group({ title, items, t, ml, dim }) {
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
      <div className={'space-y-2 ' + (dim ? 'opacity-70' : '')}>
        {items.map((it) => it.kind === 'dayOff'
          ? <DayOffBanner key={it._id} entry={it} />
          : (
            <div key={it._id} className="card flex items-start gap-3">
              <div className="flex flex-col items-center justify-center w-14 py-2 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100">
                <span className="text-xs uppercase">{t('hour') || 'Hour'}</span>
                <span className="text-2xl font-bold leading-none">{it.hour}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{ml(it.title)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {/* UTC-formatted so the day label matches the stored UTC date */}
                  {new Date(it.date).toLocaleDateString(undefined, {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
