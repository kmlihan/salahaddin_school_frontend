import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';
import MultiLangInput from '../../components/MultiLangInput';

const emptyQuestion = () => ({
  question: { en:'', ar:'', nl:'' },
  options: [
    { en:'', ar:'', nl:'' },
    { en:'', ar:'', nl:'' },
  ],
  correctIndex: 0,
  explanation: { en:'', ar:'', nl:'' },
});

/**
 * Per-section question editor. Layout: list of question cards on the left,
 * inline editor that pops up at the top when adding/editing. Keep it
 * compact — admins will be entering many of these.
 */
export default function AdminCultureQuestions() {
  const { id } = useParams();
  const { t, ml } = useLang();
  const dialog = useDialog();

  const [section, setSection] = useState(null);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: secs }, { data: qs }] = await Promise.all([
      api.get('/culture/sections'),
      api.get('/culture/questions', { params: { section: id } }),
    ]);
    setSection(secs.find((s) => s._id === id) || null);
    setItems(qs);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onSave = async () => {
    if (!editing) return;
    // Cap correctIndex within bounds (in case user removed an option after
    // setting it).
    const payload = {
      ...editing,
      section: id,
      correctIndex: Math.min(editing.correctIndex, editing.options.length - 1),
    };
    setBusy(true);
    try {
      if (editing._id) await api.put(`/culture/questions/${editing._id}`, payload);
      else            await api.post('/culture/questions', payload);
      setEditing(null);
      await load();
    } catch (e) {
      await dialog.notify({ variant: 'error', title: e.response?.data?.message || t('error') });
    } finally { setBusy(false); }
  };

  const onDelete = async (q) => {
    const ok = await dialog.confirm({ title: t('confirmDelete'), danger: true });
    if (!ok) return;
    await api.delete(`/culture/questions/${q._id}`);
    load();
  };

  const addOption = () => {
    if (!editing) return;
    if (editing.options.length >= 6) return;
    setEditing({ ...editing, options: [...editing.options, { en:'', ar:'', nl:'' }] });
  };
  const removeOption = (i) => {
    if (!editing) return;
    if (editing.options.length <= 2) return;
    const opts = editing.options.filter((_, idx) => idx !== i);
    let ci = editing.correctIndex;
    if (i === ci) ci = 0;
    else if (i < ci) ci -= 1;
    setEditing({ ...editing, options: opts, correctIndex: ci });
  };
  const setOption = (i, v) => {
    setEditing({
      ...editing,
      options: editing.options.map((o, idx) => idx === i ? v : o),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/culture" className="text-sm text-slate-500 hover:underline">
            ← {t('cultureSections')}
          </Link>
          {section && (
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <span className="text-3xl">{section.icon}</span>
              {ml(section.name)}
            </h1>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(emptyQuestion())}>
          + {t('addQuestion')}
        </button>
      </div>

      {editing && (
        <div className="card border-2 border-blue-300 dark:border-blue-700 space-y-3">
          <h2 className="font-semibold">
            {editing._id ? t('edit') : t('addQuestion')}
          </h2>
          <div>
            <span className="block text-xs mb-1">{t('cultureQuestions').slice(0, -1) || 'Question'}</span>
            <MultiLangInput value={editing.question}
                            onChange={(v) => setEditing({ ...editing, question: v })}
                            multiline />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs">{t('options')}</span>
              <button type="button" className="btn btn-soft text-xs" onClick={addOption}
                      disabled={editing.options.length >= 6}>
                +
              </button>
            </div>
            <div className="space-y-2">
              {editing.options.map((opt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <label className="mt-2 inline-flex items-center gap-1 text-xs">
                    <input type="radio"
                           checked={editing.correctIndex === i}
                           onChange={() => setEditing({ ...editing, correctIndex: i })} />
                    <span className={editing.correctIndex === i ? 'font-semibold text-green-600' : 'text-slate-500'}>
                      {String.fromCharCode(65 + i)}
                    </span>
                  </label>
                  <div className="flex-1">
                    <MultiLangInput value={opt} onChange={(v) => setOption(i, v)} />
                  </div>
                  {editing.options.length > 2 && (
                    <button type="button"
                            className="btn btn-ghost text-red-600 text-xs mt-1"
                            onClick={() => removeOption(i)}>×</button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {t('correctOption')}: <strong>{String.fromCharCode(65 + editing.correctIndex)}</strong>
            </p>
          </div>
          <div>
            <span className="block text-xs mb-1">{t('explanation')} ({t('optional') || 'optional'})</span>
            <MultiLangInput value={editing.explanation || {}}
                            onChange={(v) => setEditing({ ...editing, explanation: v })}
                            multiline />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={onSave} disabled={busy}>{t('save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((q, idx) => (
          <div key={q._id} className="card">
            <div className="flex items-start gap-3">
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 mt-1">
                #{items.length - idx}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{ml(q.question)}</p>
                <ol className="text-sm mt-1 space-y-0.5">
                  {q.options.map((o, i) => (
                    <li key={i} className={i === q.correctIndex ? 'text-green-700 dark:text-green-300 font-semibold' : ''}>
                      {String.fromCharCode(65 + i)}. {ml(o)} {i === q.correctIndex && '✓'}
                    </li>
                  ))}
                </ol>
                {ml(q.explanation) && (
                  <p className="text-xs text-slate-500 italic mt-1">{ml(q.explanation)}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button className="btn btn-ghost text-xs" onClick={() => setEditing(q)}>{t('edit')}</button>
                <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(q)}>{t('delete')}</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && !editing && (
          <div className="card text-slate-500 text-center">No questions yet.</div>
        )}
      </div>
    </div>
  );
}
