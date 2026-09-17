import { useLang } from '../context/LanguageContext';

/**
 * Status of a homework for a particular student.
 *   - no submission       -> "Not done" (slate)
 *   - submission with score or teacherFeedback -> "Graded" (green)
 *   - submission, kind=bookReading + confirmedByParent -> "Confirmed by parent" (green)
 *   - submission, kind=bookReading without confirmation -> "Awaiting parent note" (amber)
 *   - any other submission -> "Submitted" (blue)
 *
 * Accepts the homework + optional submission. Some pages have only the
 * submission (history rows) — call with { submission } and we'll do our
 * best.
 */
export default function HomeworkStatusBadge({ homework, submission }) {
  const { t } = useLang();
  const kind = homework?.kind || submission?.kind;

  let label, bg = '#64748B'; // slate default

  if (!submission) {
    label = t('notDone');
  } else if (
    submission.teacherScore != null ||
    (submission.teacherFeedback &&
      Object.values(submission.teacherFeedback).some(Boolean))
  ) {
    label = t('graded');
    bg = '#16a34a';
  } else if (kind === 'bookReading') {
    if (submission.confirmedByParent) {
      label = t('parentConfirmed');
      bg = '#16a34a';
    } else {
      label = t('awaitingParentNote');
      bg = '#f59e0b';
    }
  } else {
    label = t('submittedShort');
    bg = '#2563eb';
  }

  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ backgroundColor: bg, color: 'white' }}
    >
      {label}
    </span>
  );
}
