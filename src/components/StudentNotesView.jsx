import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import { useDialog } from './Dialog';
import Avatar from './Avatar';
import MultiLangInput from './MultiLangInput';
import StudentHomeworkHistory from './StudentHomeworkHistory';

/**
 * Reusable "student notes" workspace. Used at:
 *   - /admin/students/:id/notes    (admin)
 *   - /teacher/students/:id/notes  (teacher)
 *
 * Shows the student's profile, all their exam results (with score and
 * pass/fail), and the full notes timeline contributed by admin/teacher/parent.
 * The current user can add a new note (text + optional image/video upload).
 *
 * The backend already enforces:
 *   - admin: full visibility on any student
 *   - teacher: same
 *   - parent: only their own children (so this component is NOT used there;
 *     parents have ChildDetail instead)
 */
export default function StudentNotesView({ backTo, backLabel }) {
  const { id } = useParams();
  const { t, ml } = useLang();
  const dialog = useDialog();

  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [notes, setNotes] = useState([]);
  const [err, setErr] = useState('');

  // New-note form state
  const [text, setText] = useState({ en: '', ar: '', nl: '' });
  const [scope, setScope] = useState('general');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [posting, setPosting] = useState(false);

  const loadAll = async () => {
    setErr('');
    try {
      const [s, r, n] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/exam-results/student/${id}`),
        api.get(`/notes/student/${id}`),
      ]);
      setStudent(s.data); setResults(r.data); setNotes(n.data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);

  const upload = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    const { data } = await api.post('/upload', fd);
    return data.url;
  };

  const onAddNote = async (e) => {
    e.preventDefault();
    setPosting(true); setErr('');
    try {
      await api.post('/notes', {
        student: id,
        scope,
        text,
        imageUrl,
        videoUrl,
      });
      setText({ en: '', ar: '', nl: '' });
      setImageUrl(''); setVideoUrl('');
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setPosting(false);
    }
  };

  const onDeleteNote = async (noteId) => {
    const ok = await dialog.confirm({
      title: t('deleteNoteQ'),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/notes/${noteId}`);
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  if (err && !student) return <div className="text-red-600">{err}</div>;
  if (!student) return <p className="text-slate-500">{t('loading')}</p>;

  // Tint the header card by gender to match the table rule.
  const headerTint =
    student.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-900'
      : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900';

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link to={backTo} className="text-sm text-slate-500 hover:underline">
        ← {backLabel || t('back')}
      </Link>

      {/* Profile */}
      <div className={'card flex items-center gap-4 ' + headerTint}>
        <Avatar user={student} size={64} />
        <div>
          <h1 className="text-xl font-semibold">{student.firstName} {student.lastName}</h1>
          <p className="text-sm text-slate-500">
            {t('level')} {student.level} · {student.email}
          </p>
        </div>
      </div>

      {/* Exam results */}
      <section>
        <h2 className="font-semibold mb-2">{t('myResults')}</h2>
        {results.length === 0 ? (
          <div className="card text-slate-500">—</div>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <ResultRow key={r._id} result={r} />
            ))}
          </div>
        )}
      </section>

      {/* Homework — admin/teacher only; the component hides itself when
          the student has no homework in scope. */}
      <StudentHomeworkHistory student={student} />

      {/* Notes */}
      <section>
        <h2 className="font-semibold mb-2">{t('notes')}</h2>

        <form onSubmit={onAddNote} className="card space-y-3">
          <p className="text-sm font-medium">{t('addNote')}</p>

          <label className="block">
            <span className="block text-xs mb-1">{t('noteScope')}</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="input">
              <option value="general">{t('general')}</option>
              <option value="lesson">{t('lesson')}</option>
              <option value="exam">{t('exam')}</option>
            </select>
          </label>

          <MultiLangInput value={text} onChange={setText} multiline placeholder={t('note')} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <UploadField label={t('photo')} accept="image/*" value={imageUrl} onChange={setImageUrl} upload={upload} />
            <UploadField label={t('video')} accept="video/*" value={videoUrl} onChange={setVideoUrl} upload={upload} />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={posting} className="btn btn-primary">
            {posting ? t('loading') : t('add')}
          </button>
        </form>

        <div className="space-y-2 mt-3">
          {notes.length === 0 && <div className="card text-slate-500">—</div>}
          {notes.map((n) => (
            <div key={n._id} className="card">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>
                  {n.authorName} · <span className="capitalize">{n.authorRole}</span>
                  {n.scope && n.scope !== 'general' && <span> · {n.scope}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => onDeleteNote(n._id)}
                  >
                    ×
                  </button>
                </span>
              </div>
              {ml(n.text) && <p className="whitespace-pre-wrap">{ml(n.text)}</p>}
              {n.imageUrl && <img src={n.imageUrl} alt="" className="mt-2 max-h-48 rounded" />}
              {n.videoUrl && <video src={n.videoUrl} controls className="mt-2 max-h-48 rounded w-full" />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResultRow({ result }) {
  const { t, ml } = useLang();
  return (
    <div className="card flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center"
        style={{ backgroundColor: result.passed ? '#16a34a' : '#dc2626' }}
      >
        {result.percentage}%
      </div>
      <div className="flex-1">
        <p className="font-medium">{result.exam ? ml(result.exam.title) : '—'}</p>
        <p className="text-xs text-slate-500">
          {new Date(result.submittedAt).toLocaleString()} · {result.totalScore}/{result.maxScore}
        </p>
      </div>
      <span className={'text-xs ' + (result.passed ? 'text-green-600' : 'text-red-600')}>
        {result.passed ? t('examPassed') : t('examFailed')}
      </span>
    </div>
  );
}

// function UploadField({ label, accept, value, onChange, upload }) {
//   const [busy, setBusy] = useState(false);
//   const onPick = async (e) => {
//     const f = e.target.files?.[0]; if (!f) return;
//     setBusy(true);
//     try { onChange(await upload(f)); } finally { setBusy(false); }
//   };
//   return (
//     <label className="block">
//       <span className="block text-xs mb-1">{label}</span>
//       <input type="file" accept={accept} onChange={onPick} className="text-sm" />
//       {busy && <span className="text-xs text-slate-500"> …</span>}
//       {value && <p className="text-xs text-slate-500 truncate">{value}</p>}
//     </label>
//   );
// }


function UploadField({ label, accept, value, onChange, upload }) { const { t } = useLang(); const [busy, setBusy] = useState(false); const onPick = async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { onChange(await upload(f)); } finally { setBusy(false); } }; const inputId = `upload-${accept.replace(/[^a-zA-Z0-9]/g, '')}`; return ( <div className="block"> <span className="block text-xs mb-1"> {label} </span> <input id={inputId} type="file" accept={accept} onChange={onPick} className="hidden" /> <label htmlFor={inputId} className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer" > {t('chooseFile')} </label> <span className="ml-2 text-sm text-slate-500"> {value ? value : t('noFileChosen')} </span> {busy && ( <span className="ml-2 text-xs text-slate-500"> {t('uploading')}… </span> )} </div> ); }