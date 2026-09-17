import { useMemo } from 'react';
import { useLang } from '../context/LanguageContext';

/**
 * Renders a question for the student to answer. The shape of `value` and
 * `onChange(value)` depends on the question type — matches what the server
 * grader expects:
 *
 *  mcq          number | number[]
 *  truefalse    boolean
 *  matching     [{ leftIndex, rightIndex }]
 *  fillblank    string[]
 *  ordering     number[]   (indices into the displayed-but-shuffled list)
 *  shortanswer  string
 */
export default function QuestionRenderer({ question, value, onChange }) {
  const { t, ml } = useLang();
  const q = question;

  if (q.type === 'mcq') {
    const arr = Array.isArray(value) ? value : value != null ? [value] : [];
    const multi = (q.correctIndices || []).length > 1; // hint mode based on stored correctness count
    return (
      <div className="space-y-2">
        {q.options?.map((opt, i) => {
          const checked = arr.includes(i);
          return (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={`q-${q._id}`}
                checked={checked}
                onChange={() => {
                  if (multi) {
                    const next = checked ? arr.filter((x) => x !== i) : [...arr, i];
                    onChange(next);
                  } else {
                    onChange([i]);
                  }
                }}
              />
              <span>{ml(opt)}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (q.type === 'truefalse') {
    return (
      <div className="flex gap-3">
        {[true, false].map((b) => (
          <label key={String(b)} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`q-${q._id}`}
              checked={value === b}
              onChange={() => onChange(b)}
            />
            <span>{b ? t('true') : t('false')}</span>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === 'fillblank') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {(q.blanks || []).map((_, i) => (
          <input
            key={i}
            value={arr[i] || ''}
            onChange={(e) => {
              const next = [...arr];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={`${t('typeAnswer')} #${i + 1}`}
            className="input"
          />
        ))}
      </div>
    );
  }

  if (q.type === 'shortanswer') {
    return (
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('typeAnswer')}
        className="input"
      />
    );
  }

  if (q.type === 'matching') {
    // Shuffle the right column but keep stable per-question render
    const rights = useMemo(() => shuffle(q.matchPairs?.map((_, i) => i) || []), [q._id]);
    const arr = Array.isArray(value) ? value : [];
    const setRightFor = (leftIndex, rightIndex) => {
      const next = arr.filter((p) => p.leftIndex !== leftIndex);
      next.push({ leftIndex, rightIndex });
      onChange(next);
    };
    return (
      <div className="space-y-2">
        {q.matchPairs?.map((pair, i) => {
          const cur = arr.find((p) => p.leftIndex === i)?.rightIndex ?? '';
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 font-medium">{ml(pair.left)}</div>
              <select
                value={cur}
                onChange={(e) => setRightFor(i, Number(e.target.value))}
                className="input flex-1"
              >
                <option value="" disabled>—</option>
                {rights.map((rIdx) => (
                  <option key={rIdx} value={rIdx}>{ml(q.matchPairs[rIdx].right)}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === 'ordering') {
    // Show shuffled items; user sets order via up/down buttons.
    const display = useMemo(() => {
      const arr = (q.items || []).map((it, i) => ({ original: i, item: it }));
      return shuffle(arr);
    }, [q._id]);

    const order = Array.isArray(value) && value.length === display.length
      ? value
      : display.map((d) => d.original);

    const move = (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= order.length) return;
      const next = [...order];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    };

    // Render in current order
    return (
      <ol className="space-y-2">
        {order.map((origIdx, i) => (
          <li key={i} className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-800">
            <span className="w-6 text-slate-500">{i + 1}.</span>
            <span className="flex-1">{ml(q.items[origIdx])}</span>
            <button type="button" onClick={() => move(i, -1)} className="btn btn-ghost px-2">↑</button>
            <button type="button" onClick={() => move(i, +1)} className="btn btn-ghost px-2">↓</button>
          </li>
        ))}
      </ol>
    );
  }

  return null;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
