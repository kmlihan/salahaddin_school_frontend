import { useLang } from '../context/LanguageContext';
import MultiLangInput from './MultiLangInput';

const TYPES = ['mcq', 'truefalse', 'matching', 'fillblank', 'ordering', 'shortanswer'];

const NEW_Q = {
  mcq:        () => ({ type: 'mcq', score: 1, question: { en: '', ar: '', nl: '' }, options: [{en:'',ar:'',nl:''},{en:'',ar:'',nl:''}], correctIndices: [0] }),
  truefalse:  () => ({ type: 'truefalse', score: 1, question: { en: '', ar: '', nl: '' }, correctBoolean: true }),
  matching:   () => ({ type: 'matching', score: 1, question: { en: '', ar: '', nl: '' }, matchPairs: [{ left: {en:'',ar:'',nl:''}, right: {en:'',ar:'',nl:''} }] }),
  fillblank:  () => ({ type: 'fillblank', score: 1, question: { en: '', ar: '', nl: '' }, blanks: [{ acceptable: [''] }] }),
  ordering:   () => ({ type: 'ordering', score: 1, question: { en: '', ar: '', nl: '' }, items: [{en:'',ar:'',nl:''},{en:'',ar:'',nl:''}] }),
  shortanswer:() => ({ type: 'shortanswer', score: 1, question: { en: '', ar: '', nl: '' }, acceptableAnswers: [''] }),
};

export default function ExamForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const set = (k, v) => onChange({ ...value, [k]: v });
  const questions = value.questions || [];

  const addQ = (type) => set('questions', [...questions, NEW_Q[type]()]);
  const updateQ = (i, patch) => set('questions', questions.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  const removeQ = (i) => set('questions', questions.filter((_, idx) => idx !== i));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
      <div>
        <span className="block text-sm mb-1">Title</span>
        <MultiLangInput value={value.title || {}} onChange={(v) => set('title', v)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="block">
          <span className="block text-sm mb-1">{t('section')}</span>
          <input className="input" value={value.section || ''} onChange={(e) => set('section', e.target.value)} required />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('level')}</span>
          <select className="input" value={value.level || 'A'} onChange={(e) => set('level', e.target.value)}>
            {['A','B','C','D'].map(l => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Type</span>
          <select className="input" value={value.type || 'lessons'} onChange={(e) => set('type', e.target.value)}>
            <option value="lessons">For some lessons</option>
            <option value="unit">For the whole unit</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Pass %</span>
          <input type="number" className="input" value={value.passingGrade ?? 50} onChange={(e) => set('passingGrade', Number(e.target.value))} />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Questions</h3>
          <div className="flex gap-1 flex-wrap">
            {TYPES.map((tp) => (
              <button key={tp} type="button" className="btn btn-soft text-xs" onClick={() => addQ(tp)}>+ {tp}</button>
            ))}
          </div>
        </div>

        {questions.map((q, i) => (
          <QuestionEditor key={i} q={q} onChange={(patch) => updateQ(i, patch)} onRemove={() => removeQ(i)} />
        ))}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-primary">{t('save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

function QuestionEditor({ q, onChange, onRemove }) {
  const set = (patch) => onChange(patch);
  return (
    <div className="card border border-slate-300 dark:border-slate-700 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{q.type}</span>
        <input type="number" className="input w-24" value={q.score ?? 1} onChange={(e) => set({ score: Number(e.target.value) })} />
        <span className="text-xs text-slate-500">pts</span>
        <button type="button" className="btn btn-ghost text-red-600 text-xs ms-auto" onClick={onRemove}>×</button>
      </div>

      <MultiLangInput value={q.question || {}} onChange={(v) => set({ question: v })} placeholder="Question" />

      {q.type === 'mcq' && <McqEditor q={q} set={set} />}
      {q.type === 'truefalse' && (
        <label className="flex items-center gap-2 text-sm">
          <span>Correct answer:</span>
          <select className="input w-32" value={String(q.correctBoolean)} onChange={(e) => set({ correctBoolean: e.target.value === 'true' })}>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </label>
      )}
      {q.type === 'matching' && <MatchingEditor q={q} set={set} />}
      {q.type === 'fillblank' && <FillBlankEditor q={q} set={set} />}
      {q.type === 'ordering' && <OrderingEditor q={q} set={set} />}
      {q.type === 'shortanswer' && (
        <div>
          <span className="block text-xs mb-1">Acceptable answers (one per line)</span>
          <textarea
            className="input"
            rows={3}
            value={(q.acceptableAnswers || []).join('\n')}
            onChange={(e) => set({ acceptableAnswers: e.target.value.split('\n').filter(Boolean) })}
          />
        </div>
      )}
    </div>
  );
}

function McqEditor({ q, set }) {
  const opts = q.options || [];
  const cor = new Set((q.correctIndices || []).map(Number));
  return (
    <div className="space-y-2">
      {opts.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cor.has(i)}
            onChange={() => {
              const next = new Set(cor);
              next.has(i) ? next.delete(i) : next.add(i);
              set({ correctIndices: [...next] });
            }}
          />
          <div className="flex-1">
            <MultiLangInput value={opt} onChange={(v) => set({ options: opts.map((o, j) => j === i ? v : o) })} />
          </div>
          <button type="button" className="btn btn-ghost text-xs text-red-600"
            onClick={() => set({ options: opts.filter((_, j) => j !== i), correctIndices: [...cor].filter((x) => x !== i).map((x) => x > i ? x - 1 : x) })}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-soft text-xs" onClick={() => set({ options: [...opts, { en:'',ar:'',nl:'' }] })}>+ option</button>
    </div>
  );
}

function MatchingEditor({ q, set }) {
  const pairs = q.matchPairs || [];
  return (
    <div className="space-y-2">
      {pairs.map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <MultiLangInput value={p.left} onChange={(v) => set({ matchPairs: pairs.map((x, j) => j === i ? { ...x, left: v } : x) })} placeholder="Left" />
          <div className="flex items-start gap-2">
            <div className="flex-1"><MultiLangInput value={p.right} onChange={(v) => set({ matchPairs: pairs.map((x, j) => j === i ? { ...x, right: v } : x) })} placeholder="Right" /></div>
            <button type="button" className="btn btn-ghost text-xs text-red-600" onClick={() => set({ matchPairs: pairs.filter((_, j) => j !== i) })}>×</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-soft text-xs" onClick={() => set({ matchPairs: [...pairs, { left: {en:'',ar:'',nl:''}, right: {en:'',ar:'',nl:''} }] })}>+ pair</button>
    </div>
  );
}

function FillBlankEditor({ q, set }) {
  const blanks = q.blanks || [];
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Use ___ in the question text for each blank. List acceptable answers below.</p>
      {blanks.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-16">Blank {i + 1}</span>
          <input
            className="input flex-1"
            value={(b.acceptable || []).join(', ')}
            onChange={(e) => set({ blanks: blanks.map((x, j) => j === i ? { acceptable: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : x) })}
            placeholder="comma-separated"
          />
          <button type="button" className="btn btn-ghost text-xs text-red-600" onClick={() => set({ blanks: blanks.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-soft text-xs" onClick={() => set({ blanks: [...blanks, { acceptable: [''] }] })}>+ blank</button>
    </div>
  );
}

function OrderingEditor({ q, set }) {
  const items = q.items || [];
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">List items in the correct order. The student sees them shuffled.</p>
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-xs text-slate-500 w-6 mt-2">{i + 1}.</span>
          <div className="flex-1"><MultiLangInput value={it} onChange={(v) => set({ items: items.map((x, j) => j === i ? v : x) })} /></div>
          <button type="button" className="btn btn-ghost text-xs text-red-600" onClick={() => set({ items: items.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-soft text-xs" onClick={() => set({ items: [...items, { en:'',ar:'',nl:'' }] })}>+ item</button>
    </div>
  );
}
