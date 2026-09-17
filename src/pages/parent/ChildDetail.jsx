import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import MultiLangInput from '../../components/MultiLangInput';

/**
 * Parent's view of a single child:
 *   - profile basics
 *   - exam results
 *   - notes timeline (all visible to the parent — admin / teacher / parent)
 *   - "add note" form (text + optional image/video upload)
 *
 * Backend visibility rules already enforce parent-only-own-children, so a
 * parent who hand-tampers the URL still cannot read another child.
 */
export default function ParentChildDetail() {
  const { id } = useParams();
  const { t, ml } = useLang();

  const [child, setChild] = useState(null);
  const [results, setResults] = useState([]);
  const [notes, setNotes] = useState([]);
  const [err, setErr] = useState('');

  // Add-note form state
  const [noteText, setNoteText] = useState({ en: '', ar: '', nl: '' });
  const [noteImage, setNoteImage] = useState('');
  const [noteVideo, setNoteVideo] = useState('');
  const [posting, setPosting] = useState(false);

  const loadAll = async () => {
    setErr('');
    try {
      const [c, r, n] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/exam-results/student/${id}`),
        api.get(`/notes/student/${id}`),
      ]);
      setChild(c.data); setResults(r.data); setNotes(n.data);
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
        scope: 'general',
        text: noteText,
        imageUrl: noteImage,
        videoUrl: noteVideo,
      });
      setNoteText({ en: '', ar: '', nl: '' });
      setNoteImage(''); setNoteVideo('');
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setPosting(false);
    }
  };

  if (err && !child) return <div className="text-red-600">{err}</div>;
  if (!child) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link to="/parent/children" className="text-sm text-slate-500 hover:underline">← {t('back')}</Link>

      {/* Profile */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-2xl">
          {child.photo ? <img src={child.photo} alt="" className="w-full h-full object-cover" /> : '👤'}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{child.firstName} {child.lastName}</h1>
          <p className="text-sm text-slate-500">
            {t('level')} {child.level} · {child.email}
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
              <div key={r._id} className="card flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center"
                  style={{ backgroundColor: r.passed ? '#16a34a' : '#dc2626' }}
                >
                  {r.percentage}%
                </div>
                <div className="flex-1">
                  <p className="font-medium">{r.exam ? ml(r.exam.title) : '—'}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(r.submittedAt).toLocaleString()} · {r.totalScore}/{r.maxScore}
                  </p>
                </div>
                <span className={'text-xs ' + (r.passed ? 'text-green-600' : 'text-red-600')}>
                  {r.passed ? t('examPassed') : t('examFailed')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      <section>
        <h2 className="font-semibold mb-2">{t('notes')}</h2>

        <form onSubmit={onAddNote} className="card space-y-3">
          <p className="text-sm font-medium">{t('addNote')}</p>
          <MultiLangInput value={noteText} onChange={setNoteText} multiline placeholder={t('note')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <UploadField label={t('photo')} accept="image/*" value={noteImage} onChange={setNoteImage} upload={upload} />
            <UploadField label="Video" accept="video/*" value={noteVideo} onChange={setNoteVideo} upload={upload} />
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
                <span>{n.authorName} · {n.authorRole}</span>
                <span>{new Date(n.createdAt).toLocaleString()}</span>
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

function UploadField({ label, accept, value, onChange, upload }) {
  const [busy, setBusy] = useState(false);
  const onPick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { onChange(await upload(f)); } finally { setBusy(false); }
  };
  return (
    <label className="block">
      <span className="block text-xs mb-1">{label}</span>
      <input type="file" accept={accept} onChange={onPick} className="text-sm" />
      {busy && <span className="text-xs text-slate-500"> …</span>}
      {value && <p className="text-xs text-slate-500 truncate">{value}</p>}
    </label>
  );
}
