import { useEffect, useState } from 'react';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';

/**
 * Test-your-culture quiz UI, shared by parent and student. Three phases:
 *
 *   1. picker   — list section tiles + a question count selector, click "Start"
 *   2. running  — one question at a time with options as buttons; pick one,
 *                 then click "Next" / "Finish"
 *   3. results  — score + detail showing correct + chosen + explanation
 *
 * The component owns all three; it routes between them with the `phase`
 * state. A separate `attempts` panel below shows the user's last few runs.
 */
export default function CultureQuiz() {
  const { t, ml } = useLang();

  const [phase, setPhase] = useState('picker');
  const [sections, setSections] = useState([]);
  const [attempts, setAttempts] = useState([]);

  const [pickedSection, setPickedSection] = useState(null);
  const [count, setCount] = useState(10);

  const [questions, setQuestions] = useState([]); // [{_id, question, options}]
  const [answers, setAnswers] = useState([]);     // numeric index per question
  const [pos, setPos] = useState(0);

  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Initial load — sections and history.
  useEffect(() => {
    (async () => {
      try {
        const [{ data: secs }, { data: hist }] = await Promise.all([
          api.get('/culture/sections'),
          api.get('/culture/attempts/me'),
        ]);
        setSections(secs);
        setAttempts(hist);
      } catch (e) {
        setErr(e.response?.data?.message || t('error'));
      }
    })();
  }, [t]);

  const start = async () => {
    if (!pickedSection) return;
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/culture/start', {
        section: pickedSection._id,
        count,
      });
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(-1));
      setPos(0);
      setPhase('running');
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  const pickAt = (i, choice) => {
    setAnswers((cur) => cur.map((x, idx) => idx === i ? choice : x));
  };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/culture/submit', {
        section: pickedSection._id,
        questions: questions.map((q) => q._id),
        answers,
      });
      setResult(data);
      setPhase('results');
      // Refresh history so the new attempt shows up.
      try {
        const { data: hist } = await api.get('/culture/attempts/me');
        setAttempts(hist);
      } catch {}
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  const reset = () => {
    setPickedSection(null);
    setQuestions([]);
    setAnswers([]);
    setPos(0);
    setResult(null);
    setPhase('picker');
  };

  /* --------------------------------------------------------- render */

  if (phase === 'running') {
    return (
      <RunningView
        questions={questions}
        answers={answers}
        pos={pos}
        section={pickedSection}
        onPick={pickAt}
        onPrev={() => setPos((p) => Math.max(0, p - 1))}
        onNext={() => setPos((p) => Math.min(questions.length - 1, p + 1))}
        onSubmit={submit}
        onCancel={reset}
        busy={busy}
        err={err}
        t={t} ml={ml}
      />
    );
  }

  if (phase === 'results') {
    return (
      <ResultsView
        result={result}
        section={pickedSection}
        onAgain={reset}
        t={t} ml={ml}
      />
    );
  }

  // picker
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('cultureQuiz')}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {sections.map((s) => {
          const picked = pickedSection?._id === s._id;
          return (
            <button
              key={s._id}
              type="button"
              onClick={() => setPickedSection(s)}
              className={
                'card text-start transition ' +
                (picked
                  ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900'
                  : 'hover:scale-[1.02]')
              }
              style={{ backgroundColor: s.color || '#FEF3C7' }}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{s.icon || '📚'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold" style={{ color: '#0F172A' }}>{ml(s.name)}</h3>
                  <p className="text-xs" style={{ color: '#475569' }}>
                    {s.questionCount} {t('questionsInSection')}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
        {sections.length === 0 && (
          <div className="card text-slate-500 sm:col-span-2 md:col-span-3 text-center">
            {t('noResults') || 'No quiz sections yet.'}
          </div>
        )}
      </div>

      {pickedSection && (
        <div className="card space-y-3">
          <p className="text-sm">
            <strong>{ml(pickedSection.name)}</strong>
            {' · '}
            {pickedSection.questionCount} {t('questionsInSection')}
          </p>
          <label className="block">
            <span className="block text-sm mb-1">{t('numQuestions')}</span>
            <input
              type="number" className="input"
              style={{ maxWidth: 120 }}
              min={1}
              max={Math.min(50, pickedSection.questionCount)}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </label>
          <button className="btn btn-primary" onClick={start} disabled={busy}>
            {busy ? t('loading') : t('startQuiz')} ▶
          </button>
        </div>
      )}

      {/* History */}
      {attempts.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">{t('quizHistory')}</h2>
          <div className="space-y-2">
            {attempts.slice(0, 10).map((a) => (
              <div key={a._id} className="card flex items-center gap-3">
                <span className="text-2xl">{a.section?.icon || '📚'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{ml(a.section?.name)}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {a.correctCount} / {a.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================== running */

function RunningView({ questions, answers, pos, section, onPick, onPrev, onNext, onSubmit, onCancel, busy, err, t, ml }) {
  const q = questions[pos];
  const choice = answers[pos];
  const isLast = pos === questions.length - 1;
  const allAnswered = answers.every((a) => a >= 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span className="text-2xl">{section?.icon}</span>
          {ml(section?.name)}
        </h1>
        <button className="btn btn-ghost text-sm" onClick={onCancel}>{t('cancel')}</button>
      </div>

      {/* Progress */}
      <div>
        <p className="text-xs text-slate-500 mb-1">
          {t('questionN').replace('{n}', pos + 1).replace('{total}', questions.length)}
        </p>
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((pos + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="card">
        <p className="text-lg font-medium mb-4">{ml(q.question)}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const picked = choice === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onPick(pos, i)}
                className={
                  'w-full text-start px-4 py-3 rounded-xl border-2 transition ' +
                  (picked
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-blue-400')
                }
              >
                <span className="me-2 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  {String.fromCharCode(65 + i)}
                </span>
                {ml(opt)}
              </button>
            );
          })}
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex items-center justify-between gap-2">
        <button className="btn btn-ghost" onClick={onPrev} disabled={pos === 0}>
          ← {t('back')}
        </button>
        {!isLast ? (
          <button className="btn btn-primary" onClick={onNext} disabled={choice < 0}>
            {t('nextQuestion')} →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onSubmit} disabled={!allAnswered || busy}>
            {busy ? t('loading') : t('finishQuiz')} ✓
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================== results */

function ResultsView({ result, section, onAgain, t, ml }) {
  const pct = result.total > 0 ? Math.round((result.correctCount / result.total) * 100) : 0;
  // Encouragement message tied to score band — keeps the page warm
  // for students rather than a sterile percentage.
  const tone =
    pct >= 80 ? { color: '#16a34a', label: '🌟' }
    : pct >= 50 ? { color: '#2563eb', label: '👍' }
    : { color: '#f59e0b', label: '💪' };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="card text-center" style={{ backgroundColor: section?.color || '#FEF3C7' }}>
        <p className="text-5xl">{tone.label}</p>
        <p className="text-sm mt-2" style={{ color: '#475569' }}>{ml(section?.name)}</p>
        <p className="text-3xl font-bold mt-1" style={{ color: tone.color }}>
          {result.correctCount} / {result.total}
        </p>
        <p className="text-sm" style={{ color: '#475569' }}>{pct}% — {t('yourScore')}</p>
      </div>

      <div className="space-y-3">
        {result.detail.map((d, i) => {
          if (!d.valid) return null;
          const got = d.chosen >= 0 ? d.options[d.chosen] : null;
          const right = d.options[d.correctIndex];
          return (
            <div
              key={d._id}
              className="card border-l-4"
              style={{ borderColor: d.isCorrect ? '#16a34a' : '#dc2626' }}
            >
              <p className="text-xs text-slate-500 mb-1">
                {t('questionN').replace('{n}', i + 1).replace('{total}', result.total)}
              </p>
              <p className="font-medium mb-2">{ml(d.question)}</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-slate-500 me-2">{t('yourAnswerWas')}:</span>
                  {got
                    ? <span style={{ color: d.isCorrect ? '#16a34a' : '#dc2626' }}>{ml(got)}</span>
                    : <span className="text-slate-400">—</span>}
                </p>
                {!d.isCorrect && (
                  <p>
                    <span className="text-slate-500 me-2">{t('correctAnswer')}:</span>
                    <span style={{ color: '#16a34a' }}>{ml(right)}</span>
                  </p>
                )}
                {ml(d.explanation) && (
                  <p className="text-xs italic mt-1 text-slate-600 dark:text-slate-400">
                    {ml(d.explanation)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary w-full" onClick={onAgain}>
        {t('tryAgain')}
      </button>
    </div>
  );
}
