import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [counts, setCounts] = useState({ lessons: 0, exams: 0 });

  useEffect(() => {
    Promise.all([api.get('/lessons'), api.get('/exams')])
      .then(([l, e]) => setCounts({ lessons: l.data.length, exams: e.data.length }))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('welcomeBack')}, {user?.firstName}</h1>
        <p className="text-slate-500">{t('teacher')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/teacher/lessons" className="card hover:shadow-md">
          <div className="text-sm text-slate-500">{t('myLessons')}</div>
          <div className="text-3xl font-semibold">{counts.lessons}</div>
        </Link>
        <Link to="/teacher/exams" className="card hover:shadow-md">
          <div className="text-sm text-slate-500">{t('myExams')}</div>
          <div className="text-3xl font-semibold">{counts.exams}</div>
        </Link>
        <Link to="/teacher/calendar" className="card hover:shadow-md">
          <div className="text-sm text-slate-500">{t('calendar')}</div>
          <div className="text-3xl font-semibold">→</div>
        </Link>
      </div>
    </div>
  );
}
