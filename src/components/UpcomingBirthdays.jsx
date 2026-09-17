import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Avatar from './Avatar';
import { useLang } from '../context/LanguageContext';

const DAYS = 10;

/**
 * Card showing students whose birthdays land within the next 10 days.
 * Uses the dedicated /students/upcoming-birthdays?days=N endpoint, which
 * does the day-of-year math server-side (year-agnostic).
 */
export default function UpcomingBirthdays() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/students/upcoming-birthdays', { params: { days: DAYS } })
      .then((r) => setList(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')))
      .finally(() => setBusy(false));
  }, [t]);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🎂</span>
        <h2 className="text-lg font-semibold">{t('upcomingBirthdays')}</h2>
        <span className="text-xs text-slate-500 ms-auto">
          {t('nextNDays').replace('{n}', DAYS)}
        </span>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {!err && !busy && list.length === 0 && (
        <p className="text-sm text-slate-500">
          {t('noBirthdaysSoon').replace('{n}', DAYS)}
        </p>
      )}

      <ul className="space-y-2">
        {list.map((s) => (
          <BirthdayRow key={s._id} s={s} t={t} />
        ))}
      </ul>
    </div>
  );
}

function BirthdayRow({ s, t }) {
  // Phrasing: "today" / "tomorrow" / "in N days". Visual is a coloured pill,
  // gold for today, amber for tomorrow, slate for further out.
  const days = s.daysAway;
  let pillBg, pillText;
  if (days === 0) { pillBg = '#F59E0B'; pillText = t('today'); }
  else if (days === 1) { pillBg = '#FBBF24'; pillText = t('tomorrow'); }
  else { pillBg = '#64748B'; pillText = t('daysAway').replace('{n}', days); }

  const tint =
    s.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30'
      : 'bg-blue-50 dark:bg-blue-950/30';

  // Linkable to the student's notes page so the admin can wish them in
  // a note. Cheap and useful.
  const dob = s.birthDate ? new Date(s.birthDate) : null;
  const dobText = dob
    ? dob.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '';

  return (
    <li>
      <Link
        to={`/admin/students/${s._id}/notes`}
        className={'flex items-center gap-3 p-2 rounded-md hover:shadow-sm transition ' + tint}
      >
        <Avatar user={s} size={32} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{s.firstName} {s.lastName}</p>
          <p className="text-xs text-slate-500 truncate">
            {t('level')} {s.level}{dobText && ` · ${dobText}`}
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap"
          style={{ backgroundColor: pillBg, color: 'white' }}
        >
          {pillText}
        </span>
      </Link>
    </li>
  );
}
