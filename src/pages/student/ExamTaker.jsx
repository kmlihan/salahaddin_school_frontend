import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import QuestionRenderer from '../../components/QuestionRenderer';

export default function ExamTaker() {
  const { id } = useParams();
  const { t, ml } = useLang();
  const nav = useNavigate();

  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionId: answer }
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/exams/${id}`)
      .then((r) => setExam(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [id, t]);

  const setAnswer = (qid, value) => setAnswers((a) => ({ ...a, [qid]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setErr('');
    try {
      const payload = {
        answers: (exam.questions || []).map((q) => ({
          questionId: q._id,
          answer: answers[q._id] ?? null,
        })),
      };
      const { data } = await api.post(`/exams/${id}/submit`, payload);
      setResult(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (err && !exam) return <div className="text-red-600">{err}</div>;
  if (!exam) return <p className="text-slate-500">{t('loading')}</p>;

  // Already taken — refuse to render the form, show a redirect instead.
  // The server will also reject any submit with HTTP 409, but we save the
  // round-trip and avoid the user filling out anything they can't submit.
  if (!result && exam.alreadyTaken) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/student/exams" className="text-sm text-slate-500 hover:underline">← {t('back')}</Link>
        <h1 className="text-2xl font-semibold">{ml(exam.title)}</h1>
        <div className="card">
          <p className="font-medium">You have already taken this exam.</p>
          <p className="text-sm text-slate-500 mt-1">
            Each exam can only be taken once. View your previous result below.
          </p>
          <div className="mt-3">
            <Link to="/student/results" className="btn btn-primary">{t('myResults')}</Link>
          </div>
        </div>
      </div>
    );
  }

  // Result view -----------------------------------------------------------
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">{ml(exam.title)}</h1>
        <div className={'card text-center py-8 ' + (result.passed ? 'border-green-500' : 'border-red-500')}>
          <div className="text-5xl font-bold mb-2" style={{ color: result.passed ? '#16a34a' : '#dc2626' }}>
            {result.percentage}%
          </div>
          <p className="text-lg">
            {result.passed ? '✓ ' + t('examPassed') : '✗ ' + t('examFailed')}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {t('score')}: {result.totalScore} / {result.maxScore}
          </p>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-3">
          {exam.questions.map((q, idx) => {
            const ans = result.answers.find((a) => String(a.questionId) === String(q._id));
            const ok = ans?.correct;
            return (
              <div key={q._id} className={'card border-l-4 ' + (ok ? 'border-l-green-500' : 'border-l-red-500')}>
                <p className="text-xs text-slate-500 mb-1">Q{idx + 1} — {ans?.scoreEarned}/{ans?.scoreMax}</p>
                <p className="font-medium">{ml(q.question)}</p>
                <p className="text-sm mt-1">
                  {ok ? '✓ ' + t('correct') : '✗ ' + t('incorrect')}
                </p>
                {ans?.feedback && (
                  <p className="text-sm mt-1 text-slate-600 dark:text-slate-300 italic">{ans.feedback}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Link to="/student/results" className="btn btn-soft">{t('myResults')}</Link>
          <Link to="/student/exams" className="btn btn-ghost">{t('back')}</Link>
        </div>
      </div>
    );
  }

  // Taking view -----------------------------------------------------------
  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto space-y-4">
      <Link to="/student/exams" className="text-sm text-slate-500 hover:underline">
        ← {t('back')}
      </Link>
      <h1 className="text-2xl font-semibold">{ml(exam.title)}</h1>
      <p className="text-sm text-slate-500">
        {exam.section} · {t('level')} {exam.level} · pass ≥ {exam.passingGrade}%
      </p>

      <div className="space-y-4">
        {(exam.questions || []).map((q, idx) => (
          <div key={q._id} className="card space-y-3">
            <div>
              <p className="text-xs text-slate-500">Q{idx + 1} · {q.score} pt</p>
              <p className="font-medium">{ml(q.question)}</p>
            </div>
            <QuestionRenderer
              question={q}
              value={answers[q._id]}
              onChange={(v) => setAnswer(q._id, v)}
            />
          </div>
        ))}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={submitting} className="btn btn-primary">
        {submitting ? t('loading') : t('submitExam')}
      </button>
    </form>
  );
}
