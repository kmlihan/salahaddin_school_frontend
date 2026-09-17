import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import { useDialog } from './Dialog';
import Avatar from './Avatar';
import MultiLangInput from './MultiLangInput';

/**
 * Reusable per-homework submissions review.
 *
 * One page → all students for one homework. Routes that use this:
 *   /admin/homeworks/:id/submissions    (backTo /admin/homeworks)
 *   /teacher/homeworks/:id/submissions  (backTo /teacher/homeworks)
 *
 * Layout: a small header with the homework's title + kind, then a list of
 * "submission cards", one per student. Students who haven't submitted yet
 * appear with a "Not done" pill — useful so the teacher can see who's missing.
 */
export default function HomeworkSubmissionsView({ backTo, backLabel }) {
  const { id } = useParams();
  const { t, ml } = useLang();
  const dialog = useDialog();

  const [homework, setHomework] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [err, setErr] = useState('');

  // Load everything in parallel:
  //   - the homework itself
  //   - all students at the homework's level (so we can show "not done"
  //     for kids who haven't submitted yet)
  //   - existing submissions
  const load = async () => {
    setErr('');
    try {
      const { data: hw } = await api.get(`/homeworks/${id}`);
      setHomework(hw);
      const [stuRes, subRes] = await Promise.all([
        api.get('/students'),
        api.get(`/homeworks/${id}/submissions`),
      ]);
      // Filter students to the homework's level. If `assignedTo` is set,
      // restrict to that subset.
      const targeted = new Set((hw.assignedTo || []).map(String));
      const inScope = stuRes.data.filter((s) => {
        if (targeted.size > 0) return targeted.has(String(s._id));
        return s.level === hw.level;
      });
      setAllStudents(inScope);
      setSubmissions(subRes.data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // For convenience: a quick lookup from studentId -> submission.
  const subByStudent = {};
  for (const s of submissions) {
    const sid = s.student?._id || s.student;
    if (sid) subByStudent[String(sid)] = s;
  }

  if (err && !homework) return <div className="text-red-600">{err}</div>;
  if (!homework) return <p className="text-slate-500">{t('loading')}</p>;

  const onScored = async () => {
    await dialog.notify({ variant: 'success', title: t('saved') });
    await load();
  };

  const kindLabel =
    homework.kind === 'writing' ? t('writing')
    : homework.kind === 'recordedReading' ? t('recordedReading')
    : homework.kind === 'bookReading' ? t('bookReading')
    : homework.kind;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link to={backTo} className="text-sm text-slate-500 hover:underline">
        ← {backLabel || t('back')}
      </Link>

      <div className="card">
        <h1 className="text-2xl font-semibold">{ml(homework.title)}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {kindLabel} · {t('level')} {homework.level}
          {homework.dueDate && ` · ${t('dueDate')}: ${new Date(homework.dueDate).toLocaleDateString()}`}
        </p>
        {ml(homework.instructions) && (
          <p className="mt-3 whitespace-pre-wrap text-sm">{ml(homework.instructions)}</p>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="space-y-3">
        {allStudents.length === 0 && (
          <div className="card text-slate-500">{t('noStudentsFound')}</div>
        )}
        {allStudents.map((s) => (
          <SubmissionCard
            key={s._id}
            student={s}
            homework={homework}
            submission={subByStudent[String(s._id)] || null}
            onSaved={onScored}
            t={t}
            ml={ml}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ card */

function SubmissionCard({ student, homework, submission, onSaved, t, ml }) {
  const tint =
    student.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30'
      : 'bg-blue-50 dark:bg-blue-950/30';

  // Local state for the teacher's review fields, so each card doesn't
  // re-render every keystroke.
  const [feedback, setFeedback] = useState(submission?.teacherFeedback || { en:'', ar:'', nl:'' });
  const [score, setScore] = useState(submission?.teacherScore ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!submission) return; // can't grade what isn't submitted
    setSaving(true); setErr('');
    try {
      const payload = {
        teacherFeedback: feedback,
        teacherScore: score === '' ? null : Number(score),
      };
      await api.put(`/homework-submissions/${submission._id}`, payload);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setSaving(false); }
  };

  return (
    <div className={'card space-y-3 ' + tint}>
      <div className="flex items-start gap-3">
        <Avatar user={student} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{student.firstName} {student.lastName}</p>
          <p className="text-xs text-slate-500">{t('level')} {student.level}</p>
        </div>
        <SubmissionStatusPill submission={submission} kind={homework.kind} t={t} />
      </div>

      {/* Kind-appropriate body */}
      {!submission && (
        <p className="text-sm text-slate-500">{t('notDone')}</p>
      )}

      {submission && homework.kind === 'writing' && (
        <WritingReview hw={homework} sub={submission} t={t} ml={ml} />
      )}
      {submission && homework.kind === 'recordedReading' && (
        <RecordingReview sub={submission} t={t} />
      )}
      {submission && homework.kind === 'bookReading' && (
        <BookReadingReview sub={submission} t={t} ml={ml} />
      )}

      {/* Teacher review: feedback + manual score. Hidden when there's
          nothing to review yet. */}
      {submission && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
          <div>
            <span className="block text-xs mb-1">{t('teacherFeedback') || 'Feedback'}</span>
            <MultiLangInput value={feedback} onChange={setFeedback} multiline />
          </div>
          <label className="block">
            <span className="block text-xs mb-1">{t('score')} (0–100)</span>
            <input
              type="number" min="0" max="100" className="input"
              style={{ maxWidth: 120 }}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </label>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={saving}
            onClick={save}
          >
            {saving ? t('loading') : t('save')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ----- per-kind body ----- */

function WritingReview({ hw, sub, t, ml }) {
  // Score auto-recomputes server-side on submit, but autoScore may be null
  // if the homework had no prompts. Show it if present.
  return (
    <div className="space-y-2 text-sm">
      {sub.autoScore != null && (
        <p className="text-xs">
          <span className="text-slate-500">{t('autoScore')}:</span>{' '}
          <span className="font-semibold">{sub.autoScore}%</span>
        </p>
      )}
      <ol className="space-y-2">
        {(hw.prompts || []).map((p, i) => {
          const given = sub.answers?.[i] ?? '';
          const correct = (given || '').trim().toLowerCase().replace(/\s+/g, ' ')
            === (p.answer || '').trim().toLowerCase().replace(/\s+/g, ' ');
          return (
            <li key={i} className="border-s-4 ps-3" style={{ borderColor: correct ? '#16a34a' : '#dc2626' }}>
              <p className="text-slate-600 dark:text-slate-300" dir="rtl">{ml(p.prompt)}</p>
              <p className="mt-1">
                <span className="text-xs text-slate-500 me-2">{t('yourAnswer')}:</span>
                <span dir="rtl">{given || '—'}</span>
              </p>
              <p>
                <span className="text-xs text-slate-500 me-2">{t('answerText')}:</span>
                <span dir="rtl">{p.answer}</span>
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RecordingReview({ sub, t }) {
  if (!sub.audioUrl) return <p className="text-sm text-slate-500">—</p>;
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</p>
      <audio src={sub.audioUrl} controls className="w-full" />
    </div>
  );
}

function BookReadingReview({ sub, t, ml }) {
  if (!sub.confirmedByParent) {
    return <p className="text-sm text-amber-700 dark:text-amber-300">{t('awaitingParentNote')}</p>;
  }
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</p>
      {ml(sub.parentNote)
        ? <p className="italic">{ml(sub.parentNote)}</p>
        : <p className="text-sm text-slate-500">—</p>}
    </div>
  );
}

/* ----- pill ----- */

function SubmissionStatusPill({ submission, kind, t }) {
  let label, bg = '#64748B';
  if (!submission) label = t('notDone');
  else if (submission.teacherScore != null) { label = t('graded'); bg = '#16a34a'; }
  else if (kind === 'bookReading' && !submission.confirmedByParent) {
    label = t('awaitingParentNote'); bg = '#f59e0b';
  } else if (kind === 'bookReading') { label = t('parentConfirmed'); bg = '#16a34a'; }
  else { label = t('submittedShort'); bg = '#2563eb'; }

  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ backgroundColor: bg, color: 'white' }}
    >
      {label}
    </span>
  );
}
