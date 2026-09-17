import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';
import MultiLangInput from '../../components/MultiLangInput';

const EMOJI_CHOICES = ['📚', '🕌', '📖', '⭐', '✨', '🌙', '🕋', '📜', '✏️', '🧠', '🌟', '🌿'];
const COLOR_CHOICES = ['#FEF3C7', '#DCFCE7', '#DBEAFE', '#FCE7F3', '#E0E7FF', '#FFE4E6', '#FFEDD5'];

const empty = { name: { en:'', ar:'', nl:'' }, icon: '📚', color: '#FEF3C7', order: 0 };

/**
 * Admin manages culture quiz sections (Arabic / Sira / Quran / Fiqh / ...).
 * The list shows a tile per section with its icon + question count, plus
 * a "Manage questions" link. New sections start empty and need questions
 * added before parents/students see them in the picker.
 */
export default function AdminCultureSections() {
  const { t, ml } = useLang();
  const dialog = useDialog();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get('/culture/sections');
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async () => {
    setBusy(true);
    try {
      if (editing._id) await api.put(`/culture/sections/${editing._id}`, editing);
      else            await api.post('/culture/sections', editing);
      setEditing(null);
      await load();
    } finally { setBusy(false); }
  };

  const onDelete = async (it) => {
    const ok = await dialog.confirm({
      title: t('confirmDelete'),
      message: 'Deleting a section also removes all its questions.',
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/culture/sections/${it._id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">{t('cultureSections')}</h1>
        <button className="btn btn-primary" onClick={() => setEditing({ ...empty })}>
          + {t('addSection')}
        </button>
      </div>

      {/* Section tiles — same look the parent/student picker will use */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((s) => (
          <div
            key={s._id}
            className="card flex items-start gap-3"
            style={{ backgroundColor: s.color || '#FEF3C7' }}
          >
            <span className="text-3xl leading-none">{s.icon || '📚'}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate" style={{ color: '#0F172A' }}>{ml(s.name)}</h3>
              <p className="text-xs" style={{ color: '#475569' }}>
                {s.questionCount || 0} {t('questionsInSection')}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Link
                  to={`/admin/culture/sections/${s._id}/questions`}
                  className="btn btn-soft text-xs"
                >
                  {t('manage') || 'Manage'} {t('cultureQuestions').toLowerCase()}
                </Link>
                <button className="btn btn-ghost text-xs" onClick={() => setEditing(s)}>
                  {t('edit')}
                </button>
                <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(s)}>
                  {t('delete')}
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card text-slate-500 sm:col-span-2 md:col-span-3 text-center">
            {t('noResults') || 'No sections yet.'}
          </div>
        )}
      </div>

      {/* Inline editor — simpler than a separate page */}
      {editing && (
        <div className="card border-2 border-blue-300 dark:border-blue-700 space-y-3">
          <h2 className="font-semibold">{editing._id ? t('edit') : t('addSection')}</h2>
          <div>
            <span className="block text-xs mb-1">{t('tableTitle') || 'Name'}</span>
            <MultiLangInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs mb-1">{t('icon')}</span>
              <div className="flex flex-wrap gap-1">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEditing({ ...editing, icon: e })}
                    className={
                      'text-2xl w-9 h-9 rounded border-2 transition ' +
                      (editing.icon === e ? 'border-blue-500' : 'border-slate-300 dark:border-slate-700')
                    }
                  >{e}</button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="block text-xs mb-1">{t('color')}</span>
              <div className="flex flex-wrap gap-1">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditing({ ...editing, color: c })}
                    className={
                      'w-9 h-9 rounded-full border-2 transition ' +
                      (editing.color === c ? 'border-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-700')
                    }
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </label>
            <label className="block">
              <span className="block text-xs mb-1">{t('order')}</span>
              <input type="number" className="input"
                     value={editing.order ?? 0}
                     onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
            </label>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={onSubmit}>{t('save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
