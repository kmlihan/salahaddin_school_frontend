import { useEffect, useState } from 'react';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';

/**
 * History of one student's homework submissions, viewed by an admin or
 * teacher. We can't filter homeworks by level on the server with the
 * existing endpoints (the list is scoped to *the requesting user*), so we
 * fetch all visible homeworks and filter client-side to those that match
 * the student's level (or that explicitly target them). For each, we then
 * fetch the per-(homework, student) submission via the single-submission
 * endpoint added earlier.
 *
 * If the student has no homework in scope, the section is hidden so the
 * page doesn't show a useless empty-state.
 */
export default function StudentHomeworkHistory({ student }) {
  const { t, ml } = useLang();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: hws } = await api.get('/homeworks');
        const inScope = (hws || []).filter((h) => {
          const targeted = (h.assignedTo || []).map(String);
          if (targeted.length > 0) return targeted.includes(String(student._id));
          return h.level === student.level;
        });

        // Fetch each submission. Cheap-ish; not a hot path. If it ever
        // matters we can add a server-side endpoint that bulk-returns
        // (homework, student) submissions by student id.
        const subs = await Promise.all(inScope.map(async (h) => {
          try {
            const { data } = await api.get(`/homeworks/${h._id}/submission`, {
              params: { student: student._id },
            });
            return data; // null when no submission
          } catch {
            return null;
          }
        }));

        if (!alive) return;
        const merged = inScope.map((h, i) => ({ homework: h, submission: subs[i] }));
        // Sort: not-done last, most-recent submissions first
        merged.sort((a, b) => {
          const ad = a.submission ? new Date(a.submission.submittedAt).getTime() : -1;
          const bd = b.submission ? new Date(b.submission.submittedAt).getTime() : -1;
          return bd - ad;
        });
        setRows(merged);
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [student._id, student.level]);

  if (busy) return <p className="text-sm text-slate-500">{t('loading')}</p>;
  if (rows.length === 0) return null; // hide the section entirely

  return (
    <section>
      <h2 className="font-semibold mb-2">{t('homeworks')}</h2>
      <div className="space-y-2">
        {rows.map(({ homework, submission }) => (
          <Row key={homework._id} homework={homework} submission={submission} t={t} ml={ml} />
        ))}
      </div>
    </section>
  );
}

function Row({ homework, submission, t, ml }) {
  const kindIcon =
    homework.kind === 'writing' ? '✍️'
    : homework.kind === 'recordedReading' ? '🎙️'
    : '📖';

  // Status pill — same logic as elsewhere, kept inline so this component
  // stays standalone.
  let label, bg = '#64748B';
  if (!submission) label = t('notDone');
  else if (submission.teacherScore != null) { label = t('graded'); bg = '#16a34a'; }
  else if (homework.kind === 'bookReading' && !submission.confirmedByParent) {
    label = t('awaitingParentNote'); bg = '#f59e0b';
  } else if (homework.kind === 'bookReading') { label = t('parentConfirmed'); bg = '#16a34a'; }
  else { label = t('submittedShort'); bg = '#2563eb'; }

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{kindIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{ml(homework.title)}</p>
          <p className="text-xs text-slate-500">
            {homework.dueDate ? `${t('dueDate')}: ${new Date(homework.dueDate).toLocaleDateString()}` : '—'}
            {submission && ` · ${new Date(submission.submittedAt).toLocaleDateString()}`}
            {submission?.autoScore != null && ` · ${t('autoScore')}: ${submission.autoScore}%`}
            {submission?.teacherScore != null && ` · ${t('score')}: ${submission.teacherScore}%`}
          </p>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
          style={{ backgroundColor: bg, color: 'white' }}
        >
          {label}
        </span>
      </div>

      {/* Inline preview of the work, if any */}
      {submission && homework.kind === 'recordedReading' && submission.audioUrl && (
        <audio src={submission.audioUrl} controls className="w-full mt-2" />
      )}
      {submission && homework.kind === 'bookReading' && ml(submission.parentNote) && (
        <p className="text-sm italic mt-2">{ml(submission.parentNote)}</p>
      )}
      {submission && homework.kind === 'writing' && (homework.prompts || []).length > 0 && (
        <ol className="text-sm mt-2 space-y-1">
          {homework.prompts.map((p, i) => {
            const given = submission.answers?.[i] ?? '';
            const correct = (given || '').trim().toLowerCase().replace(/\s+/g, ' ')
              === (p.answer || '').trim().toLowerCase().replace(/\s+/g, ' ');
            return (
              <li key={i} className="flex gap-2" dir="rtl">
                <span style={{ color: correct ? '#16a34a' : '#dc2626' }}>{correct ? '✓' : '✗'}</span>
                <span className="flex-1">{ml(p.prompt)}</span>
                <span>{given || '—'}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
