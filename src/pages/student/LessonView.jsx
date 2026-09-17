import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import LessonPreview from '../../components/LessonPreview';

/**
 * Student-facing lesson page. Fetches the lesson by id and delegates
 * rendering to the shared LessonPreview component (which is also used
 * inside the admin/teacher editor's live-preview pane).
 */
export default function LessonView() {
  const { id } = useParams();
  const { t } = useLang();
  const [lesson, setLesson] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/lessons/${id}`)
      .then((r) => setLesson(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [id, t]);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!lesson) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div>
      <Link to="/student/lessons" className="text-sm text-slate-500 hover:underline">
        ← {t('back')}
      </Link>
      <div className="mt-2">
        <LessonPreview lesson={lesson} />
      </div>
    </div>
  );
}
