import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';

/**
 * Detailed view of a single exam attempt. Shows every question, the student's
 * answer, the correct answer, their score, and any teacher feedback. Used by
 * admin, teacher and parent — visibility is enforced server-side.
 */
export default function ExamResultDetail({ backTo }) {
  const { id } = useParams();
  const { t, ml } = useLang();
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/exam-results/${id}`)
      .then((r) => setResult(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [id, t]);

  if (err && !result) return <div className="text-red-600">{err}</div>;
  if (!result) return <p className="text-slate-500">{t('loading')}</p>;

  const exam = result.exam || {};
  const questions = exam.questions || [];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link to={backTo} className="text-sm text-slate-500 hover:underline">← {t('back')}</Link>

      <div className="card">
        <h1 className="text-2xl font-semibold">{ml(exam.title)}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {result.student ? `${result.student.firstName} ${result.student.lastName}` : '—'}
          {result.student?.level && ` · ${t('level')} ${result.student.level}`}
          {' · '}{new Date(result.submittedAt).toLocaleString()}
        </p>
      </div>

      <div className={'card text-center py-6 ' + (result.passed ? 'border-green-500' : 'border-red-500')}>
        <div className="text-5xl font-bold" style={{ color: result.passed ? '#16a34a' : '#dc2626' }}>
          {result.percentage}%
        </div>
        <p className="text-lg mt-1">
          {result.passed ? '✓ ' + t('examPassed') : '✗ ' + t('examFailed')}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {t('score')}: {result.totalScore} / {result.maxScore}
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => {
          const ans = result.answers.find((a) => String(a.questionId) === String(q._id));
          const ok = ans?.correct;
          return (
            <div key={q._id} className={'card border-l-4 ' + (ok ? 'border-l-green-500' : 'border-l-red-500')}>
              <p className="text-xs text-slate-500 mb-1">Q{idx + 1} — {ans?.scoreEarned}/{ans?.scoreMax} pts · {q.type}</p>
              <p className="font-medium">{ml(q.question)}</p>

              {/* Student answer */}
              <div className="mt-2 text-sm">
                <span className="text-slate-500 me-2">{t('yourAnswer')}:</span>
                <AnswerSummary q={q} answer={ans?.answer} />
              </div>

              {/* Correct answer */}
              <div className="mt-1 text-sm">
                <span className="text-slate-500 me-2">{t('correctAnswer')}:</span>
                <CorrectSummary q={q} />
              </div>

              {ans?.feedback && (
                <p className="text-sm mt-2 text-slate-600 dark:text-slate-300 italic">
                  {ans.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Render the student's submitted answer in human-readable form. */
function AnswerSummary({ q, answer }) {
  const { ml, t } = useLang();
  if (answer == null || answer === '') return <span className="text-slate-400">—</span>;

  switch (q.type) {
    case 'mcq': {
      const arr = Array.isArray(answer) ? answer : [answer];
      return <span>{arr.map((i) => ml(q.options?.[Number(i)])).filter(Boolean).join(', ') || '—'}</span>;
    }
    case 'truefalse':
      return <span>{answer ? t('true') : t('false')}</span>;
    case 'matching':
      return (
        <ul className="list-disc list-inside">
          {(answer || []).map((p, i) => (
            <li key={i}>
              {ml(q.matchPairs?.[p.leftIndex]?.left)} → {ml(q.matchPairs?.[p.rightIndex]?.right)}
            </li>
          ))}
        </ul>
      );
    case 'fillblank':
      return <span>{(Array.isArray(answer) ? answer : []).join(' | ') || '—'}</span>;
    case 'ordering':
      return (
        <ol className="list-decimal list-inside">
          {(Array.isArray(answer) ? answer : []).map((origIdx, i) => (
            <li key={i}>{ml(q.items?.[Number(origIdx)])}</li>
          ))}
        </ol>
      );
    case 'shortanswer':
      return <span>{String(answer)}</span>;
    default:
      return <span>{JSON.stringify(answer)}</span>;
  }
}

/** Render the question's correct answer for review. */
function CorrectSummary({ q }) {
  const { ml, t } = useLang();
  switch (q.type) {
    case 'mcq':
      return <span>{(q.correctIndices || []).map((i) => ml(q.options?.[i])).filter(Boolean).join(', ')}</span>;
    case 'truefalse':
      return <span>{q.correctBoolean ? t('true') : t('false')}</span>;
    case 'matching':
      return (
        <ul className="list-disc list-inside">
          {(q.matchPairs || []).map((p, i) => (
            <li key={i}>{ml(p.left)} → {ml(p.right)}</li>
          ))}
        </ul>
      );
    case 'fillblank':
      return <span>{(q.blanks || []).map((b) => (b.acceptable || []).join(' / ')).join(' | ')}</span>;
    case 'ordering':
      return (
        <ol className="list-decimal list-inside">
          {(q.items || []).map((it, i) => <li key={i}>{ml(it)}</li>)}
        </ol>
      );
    case 'shortanswer':
      return <span>{(q.acceptableAnswers || []).join(' / ')}</span>;
    default:
      return <span>—</span>;
  }
}
