import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';
import MultiLangInput from '../../components/MultiLangInput';
import HomeworkStatusBadge from '../../components/HomeworkStatusBadge';
import Avatar from '../../components/Avatar';

/**
 * Parent's homework view. We load:
 *   - the parent's children
 *   - all homeworks visible to the parent (their level)
 *   - submissions per (child, homework) — fetched lazily inside the row
 *
 * For book-reading homeworks the parent can leave a note that flips the
 * homework into "confirmed by parent" state. Other kinds are read-only
 * here — a parent can see their child's work but doesn't grade it.
 */
export default function ParentHomeworks() {
  const { t, ml } = useLang();
  const dialog = useDialog();
  const [children, setChildren] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [c, h] = await Promise.all([
          api.get('/parents/me/children'),
          api.get('/homeworks'),
        ]);
        setChildren(c.data);
        setHomeworks(h.data);
      } catch (e) {
        setErr(e.response?.data?.message || t('error'));
      } finally {
        setBusy(false);
      }
    })();
  }, [t]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (busy) return <p className="text-slate-500">{t('loading')}</p>;

  // Build a flat list of (child, homework) pairs so each row is clear.
  const pairs = [];
  for (const child of children) {
    for (const hw of homeworks) {
      if (hw.level === child.level) {
        pairs.push({ child, hw });
      }
    }
  }

  if (pairs.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">{t('homeworks')}</h1>
        <div className="card text-slate-500">{t('noHomework')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('homeworks')}</h1>
      <div className="space-y-2">
        {pairs.map(({ child, hw }) => (
          <ParentHomeworkRow
            key={`${child._id}-${hw._id}`}
            child={child}
            hw={hw}
            t={t}
            ml={ml}
            onSavedNote={() => dialog.notify({ variant: 'success', title: t('parentNoteSaved') })}
          />
        ))}
      </div>
    </div>
  );
}

function ParentHomeworkRow({ child, hw, t, ml, onSavedNote }) {
  // Each row independently fetches the submission for this (child, hw).
  // Cheap; saves us a complicated nested aggregate on the server.
  const [submission, setSubmission] = useState(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState({ en: '', ar: '', nl: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/homeworks/${hw._id}/submission`, {
          params: { student: child._id },
        });
        if (!alive) return;
        if (data) {
          setSubmission(data);
          if (data.parentNote) setNote(data.parentNote);
        }
      } catch {
        // Quiet — "no submission yet" is the common case.
      }
    })();
    return () => { alive = false; };
  }, [hw._id, child._id]);

  const onSave = async () => {
    setSaving(true); setErr('');
    try {
      const { data } = await api.post(`/homeworks/${hw._id}/parent-note`, {
        studentId: child._id,
        note,
      });
      setSubmission(data);
      setOpen(false);
      onSavedNote();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setSaving(false); }
  };

  const tint =
    child.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30'
      : 'bg-blue-50 dark:bg-blue-950/30';

  const kindIcon =
    hw.kind === 'writing' ? '✍️'
    : hw.kind === 'recordedReading' ? '🎙️'
    : '📖';

  return (
    <div className={'card space-y-2 ' + tint}>
      <div className="flex items-start gap-3">
        <Avatar user={child} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{child.firstName} {child.lastName}</p>
          <p className="text-sm">
            <span className="me-2">{kindIcon}</span>
            <span className="font-semibold">{ml(hw.title)}</span>
          </p>
          {hw.dueDate && (
            <p className="text-xs text-slate-500">
              {t('dueDate')}: {new Date(hw.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <HomeworkStatusBadge homework={hw} submission={submission} />
      </div>

      {ml(hw.instructions) && (
        <p className="text-sm text-slate-700 dark:text-slate-300">{ml(hw.instructions)}</p>
      )}

      {/* Recorded reading — let the parent listen to the recording */}
      {hw.kind === 'recordedReading' && submission?.audioUrl && (
        <audio src={submission.audioUrl} controls className="w-full" />
      )}

      {/* Book reading — parent leaves a note */}
      {hw.kind === 'bookReading' && (
        <>
          {submission?.confirmedByParent && !open && (
            <div className="text-sm">
              <p className="font-medium text-green-700 dark:text-green-300">{t('parentConfirmed')} ✓</p>
              {ml(submission.parentNote) && (
                <p className="italic mt-1">{ml(submission.parentNote)}</p>
              )}
              <button
                type="button"
                className="btn btn-ghost text-xs mt-1"
                onClick={() => setOpen(true)}
              >
                {t('edit')}
              </button>
            </div>
          )}
          {(!submission?.confirmedByParent || open) && (
            <div className="space-y-2">
              <MultiLangInput value={note} onChange={setNote} multiline />
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={onSave}
                >
                  {saving ? t('loading') : t('leaveParentNote')}
                </button>
                {open && (
                  <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                    {t('cancel')}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
