import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';

export default function StudentLessons() {
  const { t, ml } = useLang();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/lessons')
      .then((r) => setLessons(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">{t('loading')}</p>;

  // Group by section, preserving order from the server
  const bySection = {};
  for (const l of lessons) {
    const s = l.section || '_';
    bySection[s] = bySection[s] || [];
    bySection[s].push(l);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('myLessons')}</h1>
      {Object.entries(bySection).map(([section, items]) => (
        <section key={section}>
          <h2 className="text-lg font-semibold mb-2">{section}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((l) => (
              <LessonCard key={l._id} lesson={l} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LessonCard({ lesson }) {
  const { t, ml } = useLang();

  if (lesson.locked) {
    return (
      <div className="card opacity-60 cursor-not-allowed">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{ml(lesson.title)}</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
            🔒 {t('locked')}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{t('unlockHint')}</p>
      </div>
    );
  }

  return (
    <Link to={`/student/lessons/${lesson._id}`} className="card hover:shadow-md transition">
      <h3 className="font-semibold">{ml(lesson.title)}</h3>
      <p className="text-xs text-slate-500 mt-1">
        {ml(lesson.unitName) || t('unit')}
      </p>
    </Link>
  );
}
