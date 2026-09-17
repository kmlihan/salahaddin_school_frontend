import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import HomeworkStatusBadge from '../../components/HomeworkStatusBadge';

export default function StudentHomeworks() {
  const { t, ml } = useLang();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/homeworks')
      .then((r) => setItems(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')))
      .finally(() => setBusy(false));
  }, [t]);

  const kindIcon = (k) =>
    k === 'writing' ? '✍️'
    : k === 'recordedReading' ? '🎙️'
    : k === 'bookReading' ? '📖' : '📋';

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('myHomework')}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!busy && items.length === 0 && <div className="card text-slate-500">{t('noHomework')}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((h) => (
          <Link
            key={h._id}
            to={`/student/homeworks/${h._id}`}
            className="card flex items-start gap-3 hover:shadow-md transition"
          >
            <span className="text-3xl">{kindIcon(h.kind)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{ml(h.title)}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {h.kind === 'writing' && `${(h.prompts || []).length} ${t('tableQuestions')}`}
                {h.kind === 'recordedReading' && t('recordedReading')}
                {h.kind === 'bookReading' && t('bookReading')}
                {h.dueDate && ` · ${new Date(h.dueDate).toLocaleDateString()}`}
              </p>
            </div>
            <HomeworkStatusBadge homework={h} submission={h.mySubmission} />
          </Link>
        ))}
      </div>
    </div>
  );
}
