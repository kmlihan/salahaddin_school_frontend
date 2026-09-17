import { useLang } from '../context/LanguageContext';
import MultiLangInput from './MultiLangInput';

export default function HomeworkForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const set = (k, v) => onChange({ ...value, [k]: v });

  // Always have a prompts array if kind is writing — otherwise the prompt
  // editor would have nothing to render.
  const prompts = value.prompts || [];

  const setPrompt = (idx, patch) => {
    const next = prompts.map((p, i) => i === idx ? { ...p, ...patch } : p);
    set('prompts', next);
  };
  const addPrompt = () =>
    set('prompts', [...prompts, { prompt: { en:'', ar:'', nl:'' }, answer: '' }]);
  const removePrompt = (idx) =>
    set('prompts', prompts.filter((_, i) => i !== idx));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-sm mb-1">{t('kind')}</span>
          <select
            className="input"
            value={value.kind || 'writing'}
            onChange={(e) => set('kind', e.target.value)}
          >
            <option value="writing">{t('writing')}</option>
            <option value="recordedReading">{t('recordedReading')}</option>
            <option value="bookReading">{t('bookReading')}</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('level')}</span>
          <select
            className="input"
            value={value.level || 'A'}
            onChange={(e) => set('level', e.target.value)}
          >
            {['A','B','C','D'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('dueDate')}</span>
          <input
            type="date" className="input"
            value={value.dueDate ? String(value.dueDate).slice(0, 10) : ''}
            onChange={(e) => set('dueDate', e.target.value || null)}
          />
        </label>
      </div>

      <div>
        <span className="block text-sm mb-1">{t('tableTitle')}</span>
        <MultiLangInput value={value.title || {}} onChange={(v) => set('title', v)} />
      </div>

      <div>
        <span className="block text-sm mb-1">{t('instructions')}</span>
        <MultiLangInput
          value={value.instructions || {}}
          onChange={(v) => set('instructions', v)}
          multiline
        />
      </div>

      {value.kind === 'writing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{t('homework')} — {t('writing')}</h3>
            <button type="button" className="btn btn-soft text-xs" onClick={addPrompt}>
              {t('addPrompt')}
            </button>
          </div>
          {prompts.map((p, i) => (
            <div
              key={i}
              className="card border border-slate-300 dark:border-slate-700 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>#{i + 1}</span>
                <button
                  type="button"
                  className="btn btn-ghost text-red-600 text-xs ms-auto"
                  onClick={() => removePrompt(i)}
                >×</button>
              </div>
              <div>
                <span className="block text-xs mb-1">{t('promptText')}</span>
                <MultiLangInput
                  value={p.prompt || {}}
                  onChange={(v) => setPrompt(i, { prompt: v })}
                />
              </div>
              <label className="block">
                <span className="block text-xs mb-1">{t('answerText')}</span>
                <input
                  className="input"
                  value={p.answer || ''}
                  onChange={(e) => setPrompt(i, { answer: e.target.value })}
                  dir="rtl"
                />
              </label>
            </div>
          ))}
          {prompts.length === 0 && (
            <p className="text-xs text-slate-500">No prompts yet — click + Add prompt.</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn btn-primary">{t('save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}
