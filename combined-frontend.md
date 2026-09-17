# Frontend Codebase

## src/api/client.js

```javascript
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Auto-logout on 401 (except for the login call itself)
    if (err.response?.status === 401 && !err.config?.url?.endsWith('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      // Soft reload the route so AuthContext clears
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(err);
  }
);

export default api;

```

---

## src/components/Avatar.jsx

```jsx
/**
 * Round photo. Falls back to the user's initials on a coloured circle.
 * Used in Teachers and Students admin tables.
 */
export default function Avatar({ user, size = 36 }) {
  const initial =
    (user?.firstName || '?').charAt(0).toUpperCase() +
    (user?.lastName ? user.lastName.charAt(0).toUpperCase() : '');

  const dim = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (user?.photo) {
    return (
      <img
        src={user.photo}
        alt={`${user.firstName || ''} ${user.lastName || ''}`}
        className="rounded-full object-cover bg-slate-200 dark:bg-slate-800"
        style={dim}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{ ...dim, backgroundColor: 'rgb(var(--accent))' }}
      aria-label={`${user?.firstName || ''} ${user?.lastName || ''}`}
    >
      {initial}
    </div>
  );
}

```

---

## src/components/blockLayout.js

```javascript
/**
 * Group a flat list of blocks into rows for the lesson/news viewer.
 *
 * Rules:
 *   - Each block carries `perRow` (1, 2, 3, 4, or 6). When it's not set,
 *     we derive it from the legacy `size` field so old data still renders.
 *   - Consecutive blocks with the same `perRow` share a row.
 *   - As soon as we accumulate `perRow` blocks in a row, we start a new row
 *     even if the next block has the same value (so rows of 4 actually fit
 *     four items, not five or six).
 *   - A different `perRow` always starts a new row.
 *
 * Each block in the output gets a `widthPct` string like "50%" so the
 * renderer can pass it straight into inline style. We render each row as
 * its own flex container, which is robust against any oddities in the
 * source ordering.
 */
const SIZE_TO_PER_ROW = { '100': 1, '75': 1, '50': 2, '25': 4 };

function effectivePerRow(block) {
  if (block.perRow && [1, 2, 3, 4, 6].includes(Number(block.perRow))) {
    return Number(block.perRow);
  }
  return SIZE_TO_PER_ROW[String(block.size)] || 1;
}

export function groupBlocksIntoRows(blocks) {
  const rows = [];
  let current = null;

  for (const block of blocks) {
    const per = effectivePerRow(block);
    const widthPct = `${(100 / per).toFixed(4)}%`;

    if (
      !current ||
      current.perRow !== per ||
      current.items.length >= per
    ) {
      current = { perRow: per, items: [] };
      rows.push(current);
    }
    current.items.push({ block, widthPct });
  }

  return rows;
}

```

---

## src/components/ContentBlock.jsx

```jsx
import { useState, useRef } from 'react';
import { useLang } from '../context/LanguageContext';

/**
 * Each block sits in a flex-wrap row. Its outer width is set via flex-basis
 * (basis-1/4, basis-1/2, …) so when several siblings have the same basis
 * they pack onto one line. Inner padding gives a consistent gutter between
 * blocks; the parent uses `-mx-1` to cancel that on the row's edges.
 *
 * On phones (<sm) blocks always stretch to full width — packing 4 in a row
 * would be unreadable on narrow screens.
 */
const SIZE_BASIS = {
  '25': 'basis-full sm:basis-1/4',
  '50': 'basis-full sm:basis-1/2',
  '75': 'basis-full sm:basis-3/4',
  '100': 'basis-full',
};

function blockClasses(size) {
  return `${SIZE_BASIS[size] || 'basis-full'} px-1 my-2 grow-0 shrink-0`;
}

export default function ContentBlock({ block }) {
  const { ml } = useLang();
  const wrap = blockClasses(block.size);

  if (block.type === 'text') {
    return (
      <div className={wrap}>
        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
          {ml(block.content)}
        </div>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <figure className={wrap}>
        <img src={block.url} alt={ml(block.caption) || ''} className="rounded-md w-full" />
        {ml(block.caption) && (
          <figcaption className="text-sm text-slate-500 mt-1">{ml(block.caption)}</figcaption>
        )}
      </figure>
    );
  }

  if (block.type === 'video') {
    return (
      <figure className={wrap}>
        <video src={block.url} controls className="rounded-md w-full" />
        {ml(block.caption) && (
          <figcaption className="text-sm text-slate-500 mt-1">{ml(block.caption)}</figcaption>
        )}
      </figure>
    );
  }

  if (block.type === 'imageAudio') {
    return <ImageAudio block={block} wrap={wrap} caption={ml(block.caption)} />;
  }

  if (block.type === 'imageWithIcons') {
    return <ImageWithIcons block={block} wrap={wrap} />;
  }

  return null;
}

// Click the image to play its audio.
function ImageAudio({ block, wrap, caption }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  return (
    <figure className={wrap}>
      <button type="button" onClick={toggle} className="block w-full relative group focus:outline-none" aria-label="Play audio">
        <img src={block.url} alt={caption || ''} className="rounded-md w-full" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="bg-black/50 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl group-hover:bg-black/70 transition">
            {playing ? '⏸' : '▶'}
          </span>
        </span>
      </button>
      <audio ref={audioRef} src={block.audioUrl} onEnded={() => setPlaying(false)} preload="none" />
      {caption && <figcaption className="text-sm text-slate-500 mt-1">{caption}</figcaption>}
    </figure>
  );
}

/**
 * Image with three (boy/girl/man) icons below it. Tapping an icon plays the
 * audio attached to that icon. Only one audio plays at a time — clicking a
 * second icon stops the first.
 *
 * The block stores up to three icons; we render whichever ones the editor
 * filled in. If the icon has no `iconUrl`, we fall back to an emoji so the
 * block is still usable while the editor is mid-authoring.
 */
function ImageWithIcons({ block, wrap }) {
  const { ml } = useLang();
  const audioRef = useRef(null);
  const [playingKind, setPlayingKind] = useState(null);

  const playFor = (icon) => {
    const a = audioRef.current; if (!a) return;
    if (playingKind === icon.kind) {
      a.pause(); setPlayingKind(null); return;
    }
    a.src = icon.audioUrl;
    a.play().then(() => setPlayingKind(icon.kind)).catch(() => setPlayingKind(null));
  };

  const FALLBACK = { boy: '🧒', girl: '👧', man: '🧔' };
  // Render the icons in a stable order regardless of how they were saved.
  const orderKey = (k) => ({ boy: 0, girl: 1, man: 2 }[k] ?? 99);
  const icons = (block.icons || []).slice().sort((a, b) => orderKey(a.kind) - orderKey(b.kind));

  return (
    <figure className={wrap}>
      {block.url && <img src={block.url} alt={ml(block.caption) || ''} className="rounded-md w-full" />}

      <div className="mt-2 flex justify-center gap-3 flex-wrap">
        {icons.map((icon) => {
          const active = playingKind === icon.kind;
          return (
            <button
              key={icon.kind}
              type="button"
              onClick={() => playFor(icon)}
              disabled={!icon.audioUrl}
              title={ml(icon.label) || icon.kind}
              className={
                'flex flex-col items-center gap-1 p-2 rounded-lg border transition ' +
                (active
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))]'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800') +
                (icon.audioUrl ? ' cursor-pointer' : ' opacity-50 cursor-not-allowed')
              }
              aria-label={`Play ${icon.kind} audio`}
            >
              {icon.iconUrl ? (
                <img src={icon.iconUrl} alt={icon.kind} className="w-12 h-12 object-contain" />
              ) : (
                <span className="text-3xl">{FALLBACK[icon.kind]}</span>
              )}
              <span className="text-xs capitalize">
                {ml(icon.label) || icon.kind}
              </span>
              <span className="text-xs">{active ? '⏸' : '▶'}</span>
            </button>
          );
        })}
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingKind(null)} preload="none" />

      {ml(block.caption) && (
        <figcaption className="text-sm text-slate-500 mt-1">{ml(block.caption)}</figcaption>
      )}
    </figure>
  );
}

```

---

## src/components/CrudTable.jsx

```jsx
import { useEffect, useState } from 'react';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import { useDialog } from './Dialog';

/**
 * Generic CRUD table.
 *
 * New optional features used by the admin pages:
 *   - filters:    { q: '', gender: '' }   passed as query params to GET endpoint
 *   - FilterBar:  optional component receiving { value, onChange } to render
 *                 a custom filter UI above the table
 *   - rowClass:   (item) => string         per-row className (used to tint
 *                 student rows blue/pink)
 *   - extraRowActions: (item) => ReactNode  extra buttons in the actions cell
 *                 (used for "Notes" links from admin/teacher tables)
 */
export default function CrudTable({
  title,
  endpoint,
  emptyForm,
  columns,
  Form,
  rowKey = '_id',
  onAfterCreate,
  filters: initialFilters,
  FilterBar,
  rowClass,
  extraRowActions,
  // Optional gate for the per-row edit/delete buttons. When provided,
  // returning false from canModify(item) hides those buttons for that row.
  // Useful when only the row's "owner" should be able to mutate it (e.g.
  // teachers editing only their own homework while seeing everyone's).
  canModify,
}) {
  const { t } = useLang();
  const dialog = useDialog();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [filters, setFilters] = useState(initialFilters || null);

  const load = async () => {
    setErr('');
    try {
      // Strip empty filter values so the server gets a clean query string.
      const params = {};
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== '' && v != null) params[k] = v;
        }
      }
      const { data } = await api.get(endpoint, { params });
      setItems(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  // Reload when endpoint changes OR when filters change.
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint, JSON.stringify(filters)]);

  const startNew = () => setEditing({ ...emptyForm, __new: true });
  const startEdit = (it) => setEditing({ ...it });

  const onSubmit = async (value) => {
    setErr(''); setInfo('');
    try {
      if (value.__new) {
        const { __new, ...payload } = value;
        const { data } = await api.post(endpoint, payload);
        if (data.generatedPassword) setInfo(`Password: ${data.generatedPassword}`);
        if (onAfterCreate) onAfterCreate(data);
      } else {
        const { _id, ...payload } = value;
        await api.put(`${endpoint}/${_id}`, payload);
      }
      setEditing(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  const onDelete = async (it) => {
    const ok = await dialog.confirm({
      title: t('confirmDelete'),
      danger: true,
    });
    if (!ok) return;
    try { await api.delete(`${endpoint}/${it._id}`); load(); }
    catch (e) { setErr(e.response?.data?.message || t('error')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <button className="btn btn-primary" onClick={startNew}>+ {t('add')}</button>
      </div>

      {FilterBar && filters && (
        <FilterBar value={filters} onChange={setFilters} />
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}
      {info && <p className="text-sm text-green-600">{info}</p>}

      {editing && (
        <div className="card">
          <Form
            value={editing}
            onChange={setEditing}
            onSubmit={(override) => onSubmit(override || editing)}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              {columns.map((c) => (
                <th key={c.label} className="text-start px-3 py-2 font-medium">{c.label}</th>
              ))}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-slate-500">—</td></tr>
            )}
            {items.map((it) => (
              <tr key={it[rowKey]} className={'border-t border-slate-200 dark:border-slate-800 ' + (rowClass ? rowClass(it) : '')}>
                {columns.map((c) => (
                  <td key={c.label} className="px-3 py-2">{c.render(it)}</td>
                ))}
                <td className="px-3 py-2 text-end whitespace-nowrap">
                  {extraRowActions && extraRowActions(it)}
                  {(!canModify || canModify(it)) && (
                    <>
                      <button className="btn btn-ghost text-xs" onClick={() => startEdit(it)}>{t('edit')}</button>
                      <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(it)}>{t('delete')}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

```

---

## src/components/Dialog.jsx

```jsx
import { createContext, useCallback, useContext, useState } from 'react';
import Modal from './Modal';
import { useLang } from '../context/LanguageContext';

/**
 * App-wide dialog provider.
 *
 *   const dialog = useDialog();
 *
 *   await dialog.confirm({ title, message, confirmLabel?, danger?: true })
 *     -> true if confirmed, false if cancelled or dismissed
 *
 *   await dialog.prompt({ title, message?, placeholder?, defaultValue?, multiline?: true })
 *     -> string with the entered value, or null if cancelled
 *
 *   await dialog.notify({ title, message, variant?: 'info' | 'success' | 'error' })
 *     -> resolves when the user closes the modal
 *
 * Three internal pieces of state cover the three call types — at most one
 * dialog is open at a time. Each call captures a `resolve` function that we
 * call when the user picks an option, then clears the state.
 */
const DialogContext = createContext(null);
export const useDialog = () => useContext(DialogContext);

export function DialogProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const [notifyState, setNotifyState] = useState(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const prompt = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setPromptState({
        ...opts,
        value: opts.defaultValue || '',
        resolve,
      });
    });
  }, []);

  const notify = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setNotifyState({ ...opts, resolve });
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, prompt, notify }}>
      {children}
      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
      <PromptModal state={promptState} onChange={setPromptState} onClose={() => setPromptState(null)} />
      <NotifyModal state={notifyState} onClose={() => setNotifyState(null)} />
    </DialogContext.Provider>
  );
}

function ConfirmModal({ state, onClose }) {
  const { t } = useLang();
  if (!state) return null;

  const settle = (result) => {
    state.resolve(result);
    onClose();
  };

  return (
    <Modal
      open={true}
      onClose={() => settle(false)}
      title={state.title || t('areYouSure') || 'Are you sure?'}
      footer={
        <>
          <button
            type="button"
            data-dialog-close
            className="btn btn-ghost"
            onClick={() => settle(false)}
          >
            {state.cancelLabel || t('cancel')}
          </button>
          <button
            type="button"
            className={'btn ' + (state.danger ? '' : 'btn-primary')}
            style={state.danger ? { backgroundColor: '#dc2626', color: 'white' } : undefined}
            onClick={() => settle(true)}
            autoFocus
          >
            {state.confirmLabel || (state.danger ? t('delete') : t('save'))}
          </button>
        </>
      }
    >
      {state.message && (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {state.message}
        </p>
      )}
    </Modal>
  );
}

function PromptModal({ state, onChange, onClose }) {
  const { t } = useLang();
  if (!state) return null;

  const settle = (result) => {
    state.resolve(result);
    onClose();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    settle(state.value);
  };

  const Field = state.multiline ? 'textarea' : 'input';

  return (
    <Modal
      open={true}
      onClose={() => settle(null)}
      title={state.title}
      footer={
        <>
          <button
            type="button"
            data-dialog-close
            className="btn btn-ghost"
            onClick={() => settle(null)}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => settle(state.value)}
          >
            {state.confirmLabel || t('save')}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-2">
        {state.message && (
          <p className="text-sm text-slate-700 dark:text-slate-300">{state.message}</p>
        )}
        <Field
          className="input"
          rows={state.multiline ? 4 : undefined}
          placeholder={state.placeholder || ''}
          value={state.value}
          onChange={(e) => onChange({ ...state, value: e.target.value })}
        />
        {/* Hidden submit button so Enter submits */}
        <button type="submit" style={{ display: 'none' }} />
      </form>
    </Modal>
  );
}

function NotifyModal({ state, onClose }) {
  const { t } = useLang();
  if (!state) return null;

  const settle = () => {
    state.resolve();
    onClose();
  };

  const colour =
    state.variant === 'success' ? '#16a34a'
    : state.variant === 'error' ? '#dc2626'
    : 'rgb(var(--accent))';

  return (
    <Modal
      open={true}
      onClose={settle}
      title={state.title}
      footer={
        <button
          type="button"
          className="btn btn-primary"
          style={{ backgroundColor: colour }}
          onClick={settle}
          autoFocus
        >
          {t('ok') || 'OK'}
        </button>
      }
    >
      {state.message && (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {state.message}
        </p>
      )}
    </Modal>
  );
}

```

---

## src/components/ExamForm.jsx

```jsx
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

```

---

## src/components/ExamResultDetail.jsx

```jsx
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

```

---

## src/components/ExamResultsBrowser.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Avatar from './Avatar';
import { useLang } from '../context/LanguageContext';

/**
 * All exam results visible to the current user. Admin & teacher see every
 * submission; parent sees their children; student sees their own (the
 * existing /student/results page is more specific for them but this is
 * harmless if reused).
 */
export default function ExamResultsBrowser({ title, detailPathPrefix }) {
  const { t, ml } = useLang();
  const [results, setResults] = useState([]);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState({ q: '', passed: '' });

  useEffect(() => {
    api.get('/exam-results')
      .then((r) => setResults(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [t]);

  const visible = results.filter((r) => {
    if (filter.passed === 'pass' && !r.passed) return false;
    if (filter.passed === 'fail' && r.passed) return false;
    if (filter.q) {
      const hay = [
        r.student?.firstName, r.student?.lastName,
        ml(r.exam?.title), r.exam?.section,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(filter.q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{title || 'Exam results'}</h1>

      <div className="card flex flex-wrap gap-3 items-end">
        <label className="block flex-1 min-w-[200px]">
          <span className="block text-xs mb-1">Search (student, exam, section)</span>
          <input className="input" placeholder="Type to filter…"
            value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        </label>
        <label className="block">
          <span className="block text-xs mb-1">Status</span>
          <select className="input" value={filter.passed} onChange={(e) => setFilter({ ...filter, passed: e.target.value })}>
            <option value="">All</option>
            <option value="pass">Passed</option>
            <option value="fail">Failed</option>
          </select>
        </label>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2"></th>
              <th className="text-start px-3 py-2">{t('student')}</th>
              <th className="text-start px-3 py-2">Exam</th>
              <th className="text-start px-3 py-2">{t('section')}</th>
              <th className="text-start px-3 py-2">{t('level')}</th>
              <th className="text-start px-3 py-2">{t('score')}</th>
              <th className="text-start px-3 py-2">Status</th>
              <th className="text-start px-3 py-2">When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">—</td></tr>
            )}
            {visible.map((r) => (
              <tr key={r._id}
                className={
                  'border-t border-slate-200 dark:border-slate-800 ' +
                  (r.student?.gender === 'female'
                    ? 'bg-pink-50 dark:bg-pink-950/30'
                    : 'bg-blue-50 dark:bg-blue-950/30')
                }
              >
                <td className="px-3 py-2"><Avatar user={r.student} size={28} /></td>
                <td className="px-3 py-2">{r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}</td>
                <td className="px-3 py-2">{r.exam ? ml(r.exam.title) : '—'}</td>
                <td className="px-3 py-2">{r.exam?.section || '—'}</td>
                <td className="px-3 py-2">{r.exam?.level || r.student?.level || '—'}</td>
                <td className="px-3 py-2 font-medium">{r.percentage}% <span className="text-xs text-slate-500">({r.totalScore}/{r.maxScore})</span></td>
                <td className="px-3 py-2">
                  <span className={
                    'text-xs px-2 py-0.5 rounded ' +
                    (r.passed
                      ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300')
                  }>
                    {r.passed ? t('examPassed') : t('examFailed')}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {new Date(r.submittedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-end">
                  <Link to={`${detailPathPrefix}/${r._id}`} className="btn btn-soft text-xs">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

```

---

## src/components/HomeworkForm.jsx

```jsx
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

```

---

## src/components/HomeworkStatusBadge.jsx

```jsx
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

```

---

## src/components/HomeworkSubmissionsView.jsx

```jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import { useDialog } from './Dialog';
import Avatar from './Avatar';
import MultiLangInput from './MultiLangInput';

/**
 * Reusable per-homework submissions review.
 *
 * One page → all students for one homework. Routes that use this:
 *   /admin/homeworks/:id/submissions    (backTo /admin/homeworks)
 *   /teacher/homeworks/:id/submissions  (backTo /teacher/homeworks)
 *
 * Layout: a small header with the homework's title + kind, then a list of
 * "submission cards", one per student. Students who haven't submitted yet
 * appear with a "Not done" pill — useful so the teacher can see who's missing.
 */
export default function HomeworkSubmissionsView({ backTo, backLabel }) {
  const { id } = useParams();
  const { t, ml } = useLang();
  const dialog = useDialog();

  const [homework, setHomework] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [err, setErr] = useState('');

  // Load everything in parallel:
  //   - the homework itself
  //   - all students at the homework's level (so we can show "not done"
  //     for kids who haven't submitted yet)
  //   - existing submissions
  const load = async () => {
    setErr('');
    try {
      const { data: hw } = await api.get(`/homeworks/${id}`);
      setHomework(hw);
      const [stuRes, subRes] = await Promise.all([
        api.get('/students'),
        api.get(`/homeworks/${id}/submissions`),
      ]);
      // Filter students to the homework's level. If `assignedTo` is set,
      // restrict to that subset.
      const targeted = new Set((hw.assignedTo || []).map(String));
      const inScope = stuRes.data.filter((s) => {
        if (targeted.size > 0) return targeted.has(String(s._id));
        return s.level === hw.level;
      });
      setAllStudents(inScope);
      setSubmissions(subRes.data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // For convenience: a quick lookup from studentId -> submission.
  const subByStudent = {};
  for (const s of submissions) {
    const sid = s.student?._id || s.student;
    if (sid) subByStudent[String(sid)] = s;
  }

  if (err && !homework) return <div className="text-red-600">{err}</div>;
  if (!homework) return <p className="text-slate-500">{t('loading')}</p>;

  const onScored = async () => {
    await dialog.notify({ variant: 'success', title: t('saved') });
    await load();
  };

  const kindLabel =
    homework.kind === 'writing' ? t('writing')
    : homework.kind === 'recordedReading' ? t('recordedReading')
    : homework.kind === 'bookReading' ? t('bookReading')
    : homework.kind;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link to={backTo} className="text-sm text-slate-500 hover:underline">
        ← {backLabel || t('back')}
      </Link>

      <div className="card">
        <h1 className="text-2xl font-semibold">{ml(homework.title)}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {kindLabel} · {t('level')} {homework.level}
          {homework.dueDate && ` · ${t('dueDate')}: ${new Date(homework.dueDate).toLocaleDateString()}`}
        </p>
        {ml(homework.instructions) && (
          <p className="mt-3 whitespace-pre-wrap text-sm">{ml(homework.instructions)}</p>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="space-y-3">
        {allStudents.length === 0 && (
          <div className="card text-slate-500">{t('noStudentsFound')}</div>
        )}
        {allStudents.map((s) => (
          <SubmissionCard
            key={s._id}
            student={s}
            homework={homework}
            submission={subByStudent[String(s._id)] || null}
            onSaved={onScored}
            t={t}
            ml={ml}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ card */

function SubmissionCard({ student, homework, submission, onSaved, t, ml }) {
  const tint =
    student.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30'
      : 'bg-blue-50 dark:bg-blue-950/30';

  // Local state for the teacher's review fields, so each card doesn't
  // re-render every keystroke.
  const [feedback, setFeedback] = useState(submission?.teacherFeedback || { en:'', ar:'', nl:'' });
  const [score, setScore] = useState(submission?.teacherScore ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!submission) return; // can't grade what isn't submitted
    setSaving(true); setErr('');
    try {
      const payload = {
        teacherFeedback: feedback,
        teacherScore: score === '' ? null : Number(score),
      };
      await api.put(`/homework-submissions/${submission._id}`, payload);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setSaving(false); }
  };

  return (
    <div className={'card space-y-3 ' + tint}>
      <div className="flex items-start gap-3">
        <Avatar user={student} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{student.firstName} {student.lastName}</p>
          <p className="text-xs text-slate-500">{t('level')} {student.level}</p>
        </div>
        <SubmissionStatusPill submission={submission} kind={homework.kind} t={t} />
      </div>

      {/* Kind-appropriate body */}
      {!submission && (
        <p className="text-sm text-slate-500">{t('notDone')}</p>
      )}

      {submission && homework.kind === 'writing' && (
        <WritingReview hw={homework} sub={submission} t={t} ml={ml} />
      )}
      {submission && homework.kind === 'recordedReading' && (
        <RecordingReview sub={submission} t={t} />
      )}
      {submission && homework.kind === 'bookReading' && (
        <BookReadingReview sub={submission} t={t} ml={ml} />
      )}

      {/* Teacher review: feedback + manual score. Hidden when there's
          nothing to review yet. */}
      {submission && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
          <div>
            <span className="block text-xs mb-1">{t('teacherFeedback') || 'Feedback'}</span>
            <MultiLangInput value={feedback} onChange={setFeedback} multiline />
          </div>
          <label className="block">
            <span className="block text-xs mb-1">{t('score')} (0–100)</span>
            <input
              type="number" min="0" max="100" className="input"
              style={{ maxWidth: 120 }}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </label>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={saving}
            onClick={save}
          >
            {saving ? t('loading') : t('save')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ----- per-kind body ----- */

function WritingReview({ hw, sub, t, ml }) {
  // Score auto-recomputes server-side on submit, but autoScore may be null
  // if the homework had no prompts. Show it if present.
  return (
    <div className="space-y-2 text-sm">
      {sub.autoScore != null && (
        <p className="text-xs">
          <span className="text-slate-500">{t('autoScore')}:</span>{' '}
          <span className="font-semibold">{sub.autoScore}%</span>
        </p>
      )}
      <ol className="space-y-2">
        {(hw.prompts || []).map((p, i) => {
          const given = sub.answers?.[i] ?? '';
          const correct = (given || '').trim().toLowerCase().replace(/\s+/g, ' ')
            === (p.answer || '').trim().toLowerCase().replace(/\s+/g, ' ');
          return (
            <li key={i} className="border-s-4 ps-3" style={{ borderColor: correct ? '#16a34a' : '#dc2626' }}>
              <p className="text-slate-600 dark:text-slate-300" dir="rtl">{ml(p.prompt)}</p>
              <p className="mt-1">
                <span className="text-xs text-slate-500 me-2">{t('yourAnswer')}:</span>
                <span dir="rtl">{given || '—'}</span>
              </p>
              <p>
                <span className="text-xs text-slate-500 me-2">{t('answerText')}:</span>
                <span dir="rtl">{p.answer}</span>
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RecordingReview({ sub, t }) {
  if (!sub.audioUrl) return <p className="text-sm text-slate-500">—</p>;
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</p>
      <audio src={sub.audioUrl} controls className="w-full" />
    </div>
  );
}

function BookReadingReview({ sub, t, ml }) {
  if (!sub.confirmedByParent) {
    return <p className="text-sm text-amber-700 dark:text-amber-300">{t('awaitingParentNote')}</p>;
  }
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</p>
      {ml(sub.parentNote)
        ? <p className="italic">{ml(sub.parentNote)}</p>
        : <p className="text-sm text-slate-500">—</p>}
    </div>
  );
}

/* ----- pill ----- */

function SubmissionStatusPill({ submission, kind, t }) {
  let label, bg = '#64748B';
  if (!submission) label = t('notDone');
  else if (submission.teacherScore != null) { label = t('graded'); bg = '#16a34a'; }
  else if (kind === 'bookReading' && !submission.confirmedByParent) {
    label = t('awaitingParentNote'); bg = '#f59e0b';
  } else if (kind === 'bookReading') { label = t('parentConfirmed'); bg = '#16a34a'; }
  else { label = t('submittedShort'); bg = '#2563eb'; }

  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ backgroundColor: bg, color: 'white' }}
    >
      {label}
    </span>
  );
}

```

---

## src/components/LessonForm.jsx

```jsx
import { useState } from 'react';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import MultiLangInput from './MultiLangInput';

const ICON_KINDS = ['boy', 'girl', 'man'];

/**
 * Edits a Lesson document. Supports title (multi-lang), section, level, unit
 * label, and a list of content blocks. Blocks supported here:
 *   text / image / video / imageAudio / imageWithIcons
 *
 * `imageWithIcons` is a single image plus three icon buttons (boy/girl/man),
 * each with its own image and its own audio that plays when tapped.
 */
export default function LessonForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const set = (k, v) => onChange({ ...value, [k]: v });
  const blocks = value.blocks || [];

  const newBlockOf = (type) => {
    const base = {
      type,
      order: blocks.length,
      size: '100',
      url: '',
      audioUrl: '',
      caption: { en: '', ar: '', nl: '' },
    };
    if (type === 'text') base.content = { en: '', ar: '', nl: '' };
    if (type === 'imageWithIcons') {
      base.icons = ICON_KINDS.map((kind) => ({
        kind, iconUrl: '', audioUrl: '', label: { en: '', ar: '', nl: '' },
      }));
    }
    return base;
  };

  const addBlock = (type) => set('blocks', [...blocks, newBlockOf(type)]);
  const updateBlock = (i, patch) =>
    set('blocks', blocks.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const removeBlock = (i) =>
    set('blocks', blocks.filter((_, idx) => idx !== i).map((b, idx) => ({ ...b, order: idx })));
  const moveBlock = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set('blocks', next.map((b, idx) => ({ ...b, order: idx })));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
      <div>
        <span className="block text-sm mb-1">Title</span>
        <MultiLangInput value={value.title || {}} onChange={(v) => set('title', v)} placeholder="Lesson title" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <span className="block text-sm mb-1">Order</span>
          <input type="number" className="input" value={value.order ?? 0} onChange={(e) => set('order', Number(e.target.value))} />
        </label>
      </div>

      <div>
        <span className="block text-sm mb-1">{t('unit')} label</span>
        <MultiLangInput value={value.unitName || {}} onChange={(v) => set('unitName', v)} placeholder="Unit name" />
      </div>

      {/* Blocks editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">Content blocks</h3>
          <div className="flex gap-1 flex-wrap">
            {['text', 'image', 'video', 'imageAudio', 'imageWithIcons'].map((type) => (
              <button type="button" key={type} className="btn btn-soft text-xs" onClick={() => addBlock(type)}>
                + {type}
              </button>
            ))}
          </div>
        </div>

        {blocks.map((b, i) => (
          <div key={i} className="card border border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{b.type}</span>
              <select className="input flex-1" value={b.size || '100'} onChange={(e) => updateBlock(i, { size: e.target.value })}>
                {['25','50','75','100'].map((s) => <option key={s} value={s}>{s}%</option>)}
              </select>
              <button type="button" className="btn btn-ghost px-2" onClick={() => moveBlock(i, -1)}>↑</button>
              <button type="button" className="btn btn-ghost px-2" onClick={() => moveBlock(i, +1)}>↓</button>
              <button type="button" className="btn btn-ghost text-red-600 text-xs" onClick={() => removeBlock(i)}>×</button>
            </div>

            {b.type === 'text' && (
              <MultiLangInput value={b.content || {}} onChange={(v) => updateBlock(i, { content: v })} multiline />
            )}

            {(b.type === 'image' || b.type === 'video') && (
              <FileField value={b.url} accept={b.type + '/*'} onChange={(url) => updateBlock(i, { url })} />
            )}

            {b.type === 'imageAudio' && (
              <>
                <FileField label="Image" value={b.url} accept="image/*" onChange={(url) => updateBlock(i, { url })} />
                <FileField label="Audio" value={b.audioUrl} accept="audio/*" onChange={(url) => updateBlock(i, { audioUrl: url })} />
              </>
            )}

            {b.type === 'imageWithIcons' && (
              <ImageWithIconsEditor
                block={b}
                onPatch={(patch) => updateBlock(i, patch)}
              />
            )}

            {b.type !== 'text' && (
              <div>
                <span className="block text-xs mb-1">Caption</span>
                <MultiLangInput value={b.caption || {}} onChange={(v) => updateBlock(i, { caption: v })} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-primary">{t('save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

/**
 * Editor for the image-with-icons block. Configures the main image plus an
 * editor row for each icon (boy/girl/man) — each row has an icon image
 * picker, an audio picker, and an optional multi-language label.
 */
function ImageWithIconsEditor({ block, onPatch }) {
  const icons = block.icons && block.icons.length === 3
    ? block.icons
    : ICON_KINDS.map((kind) => ({ kind, iconUrl: '', audioUrl: '', label: { en: '', ar: '', nl: '' } }));

  const updateIcon = (kind, patch) => {
    onPatch({ icons: icons.map((it) => it.kind === kind ? { ...it, ...patch } : it) });
  };

  return (
    <div className="space-y-3">
      <FileField label="Main image" value={block.url} accept="image/*" onChange={(url) => onPatch({ url })} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {icons.map((it) => (
          <div key={it.kind} className="border border-slate-200 dark:border-slate-700 rounded p-2 space-y-2">
            <p className="text-xs font-medium capitalize">{it.kind} icon</p>
            <FileField label="Icon image" value={it.iconUrl} accept="image/*" onChange={(url) => updateIcon(it.kind, { iconUrl: url })} />
            <FileField label="Audio" value={it.audioUrl} accept="audio/*" onChange={(url) => updateIcon(it.kind, { audioUrl: url })} />
            <div>
              <span className="block text-xs mb-1">Label</span>
              <MultiLangInput value={it.label || {}} onChange={(v) => updateIcon(it.kind, { label: v })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileField({ label, value, onChange, accept }) {
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await api.post('/upload', fd);
      onChange(data.url);
    } finally { setBusy(false); }
  };
  return (
    <div>
      {label && <span className="block text-xs mb-1">{label}</span>}
      <div className="flex items-center gap-2">
        <input type="file" accept={accept} onChange={upload} className="text-sm flex-1" />
        {value && <span className="text-xs text-slate-500 truncate max-w-xs">{value}</span>}
      </div>
      {busy && <p className="text-xs text-slate-500">…</p>}
    </div>
  );
}

```

---

## src/components/Logo.jsx

```jsx
import { useId } from 'react';
import { useLang } from '../context/LanguageContext';

/**
 * Reusable school logo.
 *
 *   <Logo />                       full (badge + wordmark)
 *   <Logo variant="badge" />       just the round emblem
 *   <Logo size={48} />             pixel size of the badge
 *   <Logo color="white" />         force light wordmark over dark backgrounds
 *
 * Drawn entirely as inline SVG so it scales crisply and ships without
 * external assets. The wordmark uses appName from the i18n dictionary so
 * it's automatically translated (Arabic / English / Dutch).
 */
export default function Logo({
  variant = 'full',
  size = 56,
  color = 'auto', // 'auto' | 'white' | 'dark'
  className = '',
  showTagline = true,
}) {
  const { t, lang } = useLang();
  const wordmarkColor =
    color === 'white' ? 'text-white'
    : color === 'dark'  ? 'text-slate-900 dark:text-slate-100'
    : 'text-slate-900 dark:text-slate-100';
  const taglineColor =
    color === 'white' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Badge size={size} />
      {variant === 'full' && (
        <div className="leading-tight">
          <div
            className={`${wordmarkColor} font-extrabold tracking-tight`}
            style={{
              fontSize: Math.max(14, Math.round(size * 0.32)),
              letterSpacing: lang === 'ar' ? 0 : '-0.01em',
            }}
          >
            {t('appName')}
          </div>
          {showTagline && (
            <div
              className={`${taglineColor} font-medium`}
              style={{ fontSize: Math.max(9, Math.round(size * 0.18)) }}
            >
              {t('tagline')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Circular medallion. Uses React.useId for SVG gradient ids so multiple
 * logos on the same page never share a gradient.
 *
 * Composition:
 *   - gradient ring (purple → blue → cyan)
 *   - cream inner disc
 *   - small star above the dome
 *   - golden mosque dome with finial
 *   - white minarets with golden caps and small windows
 *   - white mosque body with dark arched door
 *   - open book at the base — symbol of learning
 */
// function Badge({ size = 56 }) {
//   const rid = useId();
//   // useId returns ":r0:" — strip colons so SVG ids are valid.
//   const uid = rid.replace(/[^a-zA-Z0-9_-]/g, '');

//   return (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 100 100"
//       role="img"
//       aria-label="Salah al-Din"
//       className="flex-shrink-0"
//     >
//       <defs>
//         <linearGradient id={`ringGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
//           <stop offset="0%"   stopColor="#7C3AED" />
//           <stop offset="50%"  stopColor="#2563EB" />
//           <stop offset="100%" stopColor="#0EA5E9" />
//         </linearGradient>
//         <linearGradient id={`domeGrad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
//           <stop offset="0%"  stopColor="#F59E0B" />
//           <stop offset="100%" stopColor="#D97706" />
//         </linearGradient>
//         <linearGradient id={`bookGrad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
//           <stop offset="0%"  stopColor="#FFFFFF" />
//           <stop offset="100%" stopColor="#E0F2FE" />
//         </linearGradient>
//       </defs>

//       {/* Outer gradient ring */}
//       <circle cx="50" cy="50" r="48" fill={`url(#ringGrad-${uid})`} />
//       {/* Inner cream disc */}
//       <circle cx="50" cy="50" r="42" fill="#FEF9C3" />

//       {/* Star above the dome */}
//       <g transform="translate(50 18)">
//         <polygon
//           points="0,-8 2.4,-2.5 8,-2.5 3.5,1 5.5,7 0,3.5 -5.5,7 -3.5,1 -8,-2.5 -2.4,-2.5"
//           fill="#F59E0B"
//           stroke="#B45309"
//           strokeWidth="0.8"
//           strokeLinejoin="round"
//         />
//       </g>

//       {/* Left minaret */}
//       <rect x="20" y="40" width="6" height="32" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="1.2" />
//       <polygon points="20,40 23,33 26,40" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
//       <rect x="21.5" y="46" width="3" height="3" fill="#1E3A8A" />

//       {/* Right minaret */}
//       <rect x="74" y="40" width="6" height="32" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="1.2" />
//       <polygon points="74,40 77,33 80,40" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
//       <rect x="75.5" y="46" width="3" height="3" fill="#1E3A8A" />

//       {/* Main mosque body */}
//       <rect x="32" y="48" width="36" height="24" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="1.2" />

//       {/* Big dome */}
//       <path
//         d="M 32 48 Q 32 30 50 30 Q 68 30 68 48 Z"
//         fill={`url(#domeGrad-${uid})`}
//         stroke="#B45309"
//         strokeWidth="1.2"
//       />
//       {/* Dome finial */}
//       <line x1="50" y1="30" x2="50" y2="24" stroke="#B45309" strokeWidth="1.2" />
//       <circle cx="50" cy="23" r="1.6" fill="#B45309" />

//       {/* Arched door */}
//       <path
//         d="M 44 72 L 44 60 Q 44 54 50 54 Q 56 54 56 60 L 56 72 Z"
//         fill="#1E3A8A"
//       />

//       {/* Open book at the base */}
//       <path
//         d="M 22 75 L 50 72 L 78 75 L 78 84 L 50 81 L 22 84 Z"
//         fill={`url(#bookGrad-${uid})`}
//         stroke="#1E3A8A"
//         strokeWidth="1.2"
//         strokeLinejoin="round"
//       />
//       <line x1="50" y1="72" x2="50" y2="81" stroke="#1E3A8A" strokeWidth="1.2" />
//       <line x1="30" y1="77" x2="44" y2="76" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
//       <line x1="30" y1="80" x2="44" y2="79" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
//       <line x1="56" y1="76" x2="70" y2="77" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
//       <line x1="56" y1="79" x2="70" y2="80" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
//     </svg>
//   );
// }

function Badge({ size = 56 }) {
  return (
    <img
      src="data:image/png;base64,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"
      width={size}
      height={size}
      alt="Logo"
      className="flex-shrink-0 rounded-full overflow-hidden"
    />
  );
}

```

---

## src/components/Modal.jsx

```jsx
import { useEffect, useRef } from 'react';

/**
 * Base modal. Shows an overlay + centered card. Closes on ESC or click on
 * the overlay (when `dismissible` is true). The first focusable child gets
 * focus on open; focus returns to the element that had it before opening
 * (the browser handles this automatically because we don't move focus into
 * a portal — the modal lives in the same React tree).
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
  width = 'max-w-md',
}) {
  const panelRef = useRef(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  // Auto-focus the first input/button inside the panel
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelector(
      'input, textarea, select, button:not([data-dialog-close])'
    );
    focusable?.focus();
  }, [open]);

  if (!open) return null;

  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget && dismissible) onClose?.();
  };

  return (
    <div
      onClick={onOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        ref={panelRef}
        className={`card w-full ${width}`}
        style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="text-lg font-semibold mb-3">{title}</h2>
        )}
        <div>{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}

```

---

## src/components/MultiLangInput.jsx

```jsx
import { useState } from 'react';

/**
 * Edits a multi-language string {en,ar,nl}. Renders a small tab bar so the
 * editor can fill in each translation. `value` is the current object,
 * `onChange(next)` receives the updated object.
 */
export default function MultiLangInput({ value = {}, onChange, multiline = false, placeholder = '' }) {
  const [active, setActive] = useState('en');
  const set = (lang, v) => onChange({ ...value, [lang]: v });

  const Tab = ({ code, label }) => (
    <button
      type="button"
      onClick={() => setActive(code)}
      className={
        'px-2 py-1 text-xs rounded ' +
        (active === code
          ? 'bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]'
          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')
      }
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex gap-1 mb-1">
        <Tab code="en" label="EN" />
        <Tab code="ar" label="ع" />
        <Tab code="nl" label="NL" />
      </div>
      {multiline ? (
        <textarea
          dir={active === 'ar' ? 'rtl' : 'ltr'}
          value={value[active] || ''}
          onChange={(e) => set(active, e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="input"
        />
      ) : (
        <input
          dir={active === 'ar' ? 'rtl' : 'ltr'}
          value={value[active] || ''}
          onChange={(e) => set(active, e.target.value)}
          placeholder={placeholder}
          className="input"
        />
      )}
    </div>
  );
}

```

---

## src/components/Navbar.jsx

```jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { LanguageSwitcher, ThemeToggle } from './Switchers';
import Logo from './Logo';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();

  const onLogout = () => {
    logout();
    nav('/');
  };

  // Role-specific links shown after the public ones
  const roleLinks = (() => {
    if (!role) return [];
    if (role === 'admin') return [
      { to: '/admin', label: t('dashboard') },
      { to: '/admin/registrations', label: t('registrations') },
      { to: '/admin/teachers', label: t('teachers') },
      { to: '/admin/parents', label: t('parents') },
      { to: '/admin/students', label: t('students') },
      { to: '/admin/lessons', label: t('lessons') },
      { to: '/admin/exams', label: t('exams') },
      { to: '/admin/exam-results', label: t('myResults') },
      { to: '/admin/homeworks', label: t('homeworks') },
      { to: '/admin/news', label: t('news') },
      { to: '/admin/payments', label: t('payments') },
      { to: '/admin/teacher-attendance', label: t('teacherAttendance') },
      { to: '/admin/calendar', label: t('calendar') },
      { to: '/admin/attendance', label: t('attendance') },
    ];
    if (role === 'teacher') return [
      { to: '/teacher', label: t('dashboard') },
      { to: '/teacher/lessons', label: t('myLessons') },
      { to: '/teacher/exams', label: t('myExams') },
      { to: '/teacher/exam-results', label: t('myResults') },
      { to: '/teacher/homeworks', label: t('homeworks') },
      { to: '/teacher/students', label: t('students') },
      { to: '/teacher/calendar', label: t('calendar') },
    ];
    if (role === 'parent') return [
      { to: '/parent', label: t('dashboard') },
      { to: '/parent/children', label: t('myChildren') },
      { to: '/parent/exams', label: t('exams') },
      { to: '/parent/exam-results', label: t('myResults') },
      { to: '/parent/homeworks', label: t('homeworks') },
    ];
    if (role === 'student') return [
      { to: '/student', label: t('dashboard') },
      { to: '/student/lessons', label: t('myLessons') },
      { to: '/student/exams', label: t('myExams') },
      { to: '/student/results', label: t('myResults') },
      { to: '/student/homeworks', label: t('myHomework') },
    ];
    return [];
  })();

  // Use Tailwind dark: variants directly here (rather than the --accent CSS
  // variables) so the navbar's appearance is independent of any theme-state
  // hiccups. In light mode the active link is blue-100 bg + blue-800 text;
  // in dark mode it's slate-800 bg + sky-300 text — high contrast both ways.
  const linkClass = ({ isActive }) =>
    'px-3 py-1.5 rounded-md text-sm transition ' +
    (isActive
      ? 'bg-blue-100 text-blue-800 dark:bg-slate-800 dark:text-sky-300 font-semibold'
      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800');

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/" className="flex items-center mr-2">
          <Logo size={36} showTagline={false} />
        </Link>

        <nav className="flex items-center gap-1 flex-wrap">
          <NavLink end to="/" className={linkClass}>{t('home')}</NavLink>
          {!user && <NavLink to="/news" className={linkClass}>{t('news')}</NavLink>}
          {roleLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/profile" className="btn btn-ghost text-sm">
                {user.firstName} {user.lastName}
              </Link>
              <button onClick={onLogout} className="btn btn-soft text-sm">
                {t('logout')}
              </button>
            </>
          ) : (
            <><Link to="/register" className="btn btn-soft text-sm">{t('register')}</Link><Link to="/login" className="btn btn-primary text-sm">{t('login')}</Link></>
          )}
        </div>
      </div>
    </header>
  );
}

```

---

## src/components/PhoneInput.jsx

```jsx
import { useEffect, useRef, useState } from 'react';
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
} from 'libphonenumber-js';
import { useLang } from '../context/LanguageContext';

/**
 * Country options. Order: realistic audience first (Belgium / Netherlands
 * are the school's most common), then nearby Europe, then the Maghreb and
 * the Gulf, then a couple of internationals. Adding more is one line.
 */
const COUNTRY_CHOICES = [
  { code: 'BE', name: 'Belgium',     flag: '🇧🇪' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'FR', name: 'France',      flag: '🇫🇷' },
  { code: 'DE', name: 'Germany',     flag: '🇩🇪' },
  { code: 'GB', name: 'UK',          flag: '🇬🇧' },
  { code: 'MA', name: 'Morocco',     flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria',     flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisia',     flag: '🇹🇳' },
  { code: 'EG', name: 'Egypt',       flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia',flag: '🇸🇦' },
  { code: 'AE', name: 'UAE',         flag: '🇦🇪' },
  { code: 'TR', name: 'Turkey',      flag: '🇹🇷' },
  { code: 'US', name: 'USA',         flag: '🇺🇸' },
];
const VALID_CODES = new Set(COUNTRY_CHOICES.map((c) => c.code));

/**
 * Phone input.
 *
 * Storage / wire format: the parent's `value` is E.164 (e.g. "+32498123456"),
 * which is also what the validator and server expect.
 *
 * Internal state: we keep two local pieces of state — `country` (the picker)
 * and `national` (the raw text the user has typed). `national` is whatever
 * the user types; we DON'T re-format it on each keystroke. That way the
 * input stays a plain controlled input that always reflects the user's
 * keystrokes, no cursor jumps.
 *
 * The E.164 value is *derived*: dial-code + cleaned digits from `national`.
 * We push that to the parent via onChange whenever either changes.
 *
 * On mount we parse the incoming value and populate the local state from
 * it. After that the parent's value follows our local state, so we don't
 * need to keep syncing back from the prop on every render.
 */
export default function PhoneInput({
  value = '',
  onChange,
  error = '',
  required = false,
  label,
  disabled = false,
}) {
  const { t } = useLang();

  // Initialise local state from the incoming value exactly ONCE. After that
  // the parent receives whatever we emit; we don't re-derive from `value`,
  // because doing so would fight React's input semantics (cursor jumps,
  // refused keystrokes, etc).
  const [{ country, national }, setLocal] = useState(() => initialiseFrom(value));

  // If the parent value changes from the outside (e.g. form reset, or
  // editing a different record), reseed our local state. We use a ref to
  // hold the last value we EMITTED so we don't reseed in response to our
  // own emissions.
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value === lastEmitted.current) return;
    setLocal(initialiseFrom(value));
    lastEmitted.current = value;
  }, [value]);

  const emit = (nextCountry, nextNational) => {
    const e164 = recompose(nextCountry, nextNational);
    lastEmitted.current = e164;
    onChange(e164);
  };

  const setCountry = (code) => {
    setLocal({ country: code, national });
    emit(code, national);
  };
  const setNational = (text) => {
    setLocal({ country, national: text });
    emit(country, text);
  };

  const hasError = !!error;
  const dial = country ? `+${getCountryCallingCode(country)}` : '';

  return (
    <label className="block">
      {label && (
        <span className="block text-sm mb-1">
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </span>
      )}

      <div
        className={
          'flex items-stretch rounded-md border overflow-hidden ' +
          (hasError
            ? 'border-red-500'
            : 'border-slate-300 dark:border-slate-700')
        }
      >
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={disabled}
          aria-label="Country"
          className="bg-slate-50 dark:bg-slate-800 px-2 py-2 text-sm border-e border-slate-300 dark:border-slate-700 focus:outline-none"
          style={{ minWidth: 110 }}
        >
          {COUNTRY_CHOICES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} +{getCountryCallingCode(c.code)} {c.name}
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => setNational(e.target.value)}
          disabled={disabled}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          placeholder={dial ? `${dial} 498 12 34 56` : 'Phone number'}
          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
          style={{ direction: 'ltr' }}
        />
      </div>

      {hasError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t(error)}</p>
      )}
    </label>
  );
}

/**
 * Parse an incoming E.164 string into { country, national }. Falls back to
 * Belgium and an empty national field if parsing fails — picker stays
 * usable, user can keep typing.
 */
function initialiseFrom(value) {
  const v = String(value || '').trim();
  if (!v) return { country: 'BE', national: '' };
  const parsed = parsePhoneNumberFromString(v);
  if (parsed && parsed.country && VALID_CODES.has(parsed.country)) {
    // Pre-format the existing number nicely for display when editing.
    return { country: parsed.country, national: parsed.formatNational() };
  }
  // Couldn't parse, or the country is one we don't list. Show the digits
  // we have and default the picker.
  return { country: 'BE', national: v.replace(/^\+\d+/, '') };
}

/**
 * Combine a country and the user's typed national string into E.164.
 * Strip non-digits from the national input (so spaces, dashes, parens
 * the user might type don't end up in the wire value).
 */
function recompose(country, nationalText) {
  const digits = String(nationalText || '').replace(/\D/g, '');
  if (!country) return digits ? `+${digits}` : '';
  const dial = getCountryCallingCode(country);
  if (!digits) return `+${dial}`;
  return `+${dial}${digits}`;
}

```

---

## src/components/ProtectedRoute.jsx

```jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Loading() {
  return (
    <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
      <div className="animate-pulse">Loading…</div>
    </div>
  );
}

export default function ProtectedRoute({ roles, children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}

```

---

## src/components/QuestionRenderer.jsx

```jsx
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

```

---

## src/components/StudentHomeworkHistory.jsx

```jsx
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

```

---

## src/components/StudentNotesView.jsx

```jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import { useDialog } from './Dialog';
import Avatar from './Avatar';
import MultiLangInput from './MultiLangInput';
import StudentHomeworkHistory from './StudentHomeworkHistory';

/**
 * Reusable "student notes" workspace. Used at:
 *   - /admin/students/:id/notes    (admin)
 *   - /teacher/students/:id/notes  (teacher)
 *
 * Shows the student's profile, all their exam results (with score and
 * pass/fail), and the full notes timeline contributed by admin/teacher/parent.
 * The current user can add a new note (text + optional image/video upload).
 *
 * The backend already enforces:
 *   - admin: full visibility on any student
 *   - teacher: same
 *   - parent: only their own children (so this component is NOT used there;
 *     parents have ChildDetail instead)
 */
export default function StudentNotesView({ backTo, backLabel }) {
  const { id } = useParams();
  const { t, ml } = useLang();
  const dialog = useDialog();

  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [notes, setNotes] = useState([]);
  const [err, setErr] = useState('');

  // New-note form state
  const [text, setText] = useState({ en: '', ar: '', nl: '' });
  const [scope, setScope] = useState('general');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [posting, setPosting] = useState(false);

  const loadAll = async () => {
    setErr('');
    try {
      const [s, r, n] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/exam-results/student/${id}`),
        api.get(`/notes/student/${id}`),
      ]);
      setStudent(s.data); setResults(r.data); setNotes(n.data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);

  const upload = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    const { data } = await api.post('/upload', fd);
    return data.url;
  };

  const onAddNote = async (e) => {
    e.preventDefault();
    setPosting(true); setErr('');
    try {
      await api.post('/notes', {
        student: id,
        scope,
        text,
        imageUrl,
        videoUrl,
      });
      setText({ en: '', ar: '', nl: '' });
      setImageUrl(''); setVideoUrl('');
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setPosting(false);
    }
  };

  const onDeleteNote = async (noteId) => {
    const ok = await dialog.confirm({
      title: t('deleteNoteQ'),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/notes/${noteId}`);
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  if (err && !student) return <div className="text-red-600">{err}</div>;
  if (!student) return <p className="text-slate-500">{t('loading')}</p>;

  // Tint the header card by gender to match the table rule.
  const headerTint =
    student.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-900'
      : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900';

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link to={backTo} className="text-sm text-slate-500 hover:underline">
        ← {backLabel || t('back')}
      </Link>

      {/* Profile */}
      <div className={'card flex items-center gap-4 ' + headerTint}>
        <Avatar user={student} size={64} />
        <div>
          <h1 className="text-xl font-semibold">{student.firstName} {student.lastName}</h1>
          <p className="text-sm text-slate-500">
            {t('level')} {student.level} · {student.email}
          </p>
        </div>
      </div>

      {/* Exam results */}
      <section>
        <h2 className="font-semibold mb-2">{t('myResults')}</h2>
        {results.length === 0 ? (
          <div className="card text-slate-500">—</div>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <ResultRow key={r._id} result={r} />
            ))}
          </div>
        )}
      </section>

      {/* Homework — admin/teacher only; the component hides itself when
          the student has no homework in scope. */}
      <StudentHomeworkHistory student={student} />

      {/* Notes */}
      <section>
        <h2 className="font-semibold mb-2">{t('notes')}</h2>

        <form onSubmit={onAddNote} className="card space-y-3">
          <p className="text-sm font-medium">{t('addNote')}</p>

          <label className="block">
            <span className="block text-xs mb-1">{t('noteScope')}</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="input">
              <option value="general">{t('general')}</option>
              <option value="lesson">Lesson</option>
              <option value="exam">Exam</option>
            </select>
          </label>

          <MultiLangInput value={text} onChange={setText} multiline placeholder={t('note')} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <UploadField label={t('photo')} accept="image/*" value={imageUrl} onChange={setImageUrl} upload={upload} />
            <UploadField label="Video" accept="video/*" value={videoUrl} onChange={setVideoUrl} upload={upload} />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={posting} className="btn btn-primary">
            {posting ? t('loading') : t('add')}
          </button>
        </form>

        <div className="space-y-2 mt-3">
          {notes.length === 0 && <div className="card text-slate-500">—</div>}
          {notes.map((n) => (
            <div key={n._id} className="card">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>
                  {n.authorName} · <span className="capitalize">{n.authorRole}</span>
                  {n.scope && n.scope !== 'general' && <span> · {n.scope}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => onDeleteNote(n._id)}
                  >
                    ×
                  </button>
                </span>
              </div>
              {ml(n.text) && <p className="whitespace-pre-wrap">{ml(n.text)}</p>}
              {n.imageUrl && <img src={n.imageUrl} alt="" className="mt-2 max-h-48 rounded" />}
              {n.videoUrl && <video src={n.videoUrl} controls className="mt-2 max-h-48 rounded w-full" />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResultRow({ result }) {
  const { t, ml } = useLang();
  return (
    <div className="card flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center"
        style={{ backgroundColor: result.passed ? '#16a34a' : '#dc2626' }}
      >
        {result.percentage}%
      </div>
      <div className="flex-1">
        <p className="font-medium">{result.exam ? ml(result.exam.title) : '—'}</p>
        <p className="text-xs text-slate-500">
          {new Date(result.submittedAt).toLocaleString()} · {result.totalScore}/{result.maxScore}
        </p>
      </div>
      <span className={'text-xs ' + (result.passed ? 'text-green-600' : 'text-red-600')}>
        {result.passed ? t('examPassed') : t('examFailed')}
      </span>
    </div>
  );
}

function UploadField({ label, accept, value, onChange, upload }) {
  const [busy, setBusy] = useState(false);
  const onPick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { onChange(await upload(f)); } finally { setBusy(false); }
  };
  return (
    <label className="block">
      <span className="block text-xs mb-1">{label}</span>
      <input type="file" accept={accept} onChange={onPick} className="text-sm" />
      {busy && <span className="text-xs text-slate-500"> …</span>}
      {value && <p className="text-xs text-slate-500 truncate">{value}</p>}
    </label>
  );
}

```

---

## src/components/Switchers.jsx

```jsx
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const LABELS = { en: 'EN', ar: 'ع', nl: 'NL' };

export function LanguageSwitcher() {
  const { lang, setLang, supported } = useLang();
  return (
    <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
      {supported.map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={
            'px-2 py-1 ' +
            (lang === code
              ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-fg))]'
              : 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800')
          }
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="btn btn-ghost px-2 py-1 text-sm"
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
    >
      {theme === 'dark' ? '☀︎' : '☾'}
    </button>
  );
}

```

---

## src/components/UpcomingBirthdays.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Avatar from './Avatar';
import { useLang } from '../context/LanguageContext';

const DAYS = 10;

/**
 * Card showing students whose birthdays land within the next 10 days.
 * Uses the dedicated /students/upcoming-birthdays?days=N endpoint, which
 * does the day-of-year math server-side (year-agnostic).
 */
export default function UpcomingBirthdays() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/students/upcoming-birthdays', { params: { days: DAYS } })
      .then((r) => setList(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')))
      .finally(() => setBusy(false));
  }, [t]);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🎂</span>
        <h2 className="text-lg font-semibold">{t('upcomingBirthdays')}</h2>
        <span className="text-xs text-slate-500 ms-auto">
          {t('nextNDays').replace('{n}', DAYS)}
        </span>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {!err && !busy && list.length === 0 && (
        <p className="text-sm text-slate-500">
          {t('noBirthdaysSoon').replace('{n}', DAYS)}
        </p>
      )}

      <ul className="space-y-2">
        {list.map((s) => (
          <BirthdayRow key={s._id} s={s} t={t} />
        ))}
      </ul>
    </div>
  );
}

function BirthdayRow({ s, t }) {
  // Phrasing: "today" / "tomorrow" / "in N days". Visual is a coloured pill,
  // gold for today, amber for tomorrow, slate for further out.
  const days = s.daysAway;
  let pillBg, pillText;
  if (days === 0) { pillBg = '#F59E0B'; pillText = t('today'); }
  else if (days === 1) { pillBg = '#FBBF24'; pillText = t('tomorrow'); }
  else { pillBg = '#64748B'; pillText = t('daysAway').replace('{n}', days); }

  const tint =
    s.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30'
      : 'bg-blue-50 dark:bg-blue-950/30';

  // Linkable to the student's notes page so the admin can wish them in
  // a note. Cheap and useful.
  const dob = s.birthDate ? new Date(s.birthDate) : null;
  const dobText = dob
    ? dob.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '';

  return (
    <li>
      <Link
        to={`/admin/students/${s._id}/notes`}
        className={'flex items-center gap-3 p-2 rounded-md hover:shadow-sm transition ' + tint}
      >
        <Avatar user={s} size={32} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{s.firstName} {s.lastName}</p>
          <p className="text-xs text-slate-500 truncate">
            {t('level')} {s.level}{dobText && ` · ${dobText}`}
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap"
          style={{ backgroundColor: pillBg, color: 'white' }}
        >
          {pillText}
        </span>
      </Link>
    </li>
  );
}

```

---

## src/components/UserFilterBar.jsx

```jsx
/**
 * Filter bar for user lists. The `q` field searches across name/email/phone
 * on the server (case-insensitive). The `gender` select is optional — pass
 * `withGender` for the Students/Teachers tables.
 */
export default function UserFilterBar({ value, onChange, withGender = false }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="card flex flex-wrap items-end gap-3">
      <label className="block flex-1 min-w-[200px]">
        <span className="block text-xs mb-1">Search (name, email, phone)</span>
        <input
          className="input"
          placeholder="Type to filter…"
          value={value.q || ''}
          onChange={(e) => set('q', e.target.value)}
        />
      </label>
      {withGender && (
        <label className="block">
          <span className="block text-xs mb-1">Gender</span>
          <select
            className="input"
            value={value.gender || ''}
            onChange={(e) => set('gender', e.target.value)}
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
      )}
      {(value.q || value.gender) && (
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={() => onChange({ q: '', gender: '' })}
        >
          Clear
        </button>
      )}
    </div>
  );
}

```

---

## src/components/ValidatedField.jsx

```jsx
import { useLang } from '../context/LanguageContext';

/**
 * Reusable input + label + inline error message.
 *
 * Props:
 *   - label, value, onChange  (the basics)
 *   - type                    'text' | 'email' | 'tel' | 'number' | 'password' | etc
 *   - error                   translation key for the error message, or '' for none
 *   - required, placeholder, autoComplete, dir, disabled
 *
 * The error is displayed only if `error` is a non-empty string. We also
 * apply a red ring on the input itself when there's an error so it's
 * visually obvious which field is the problem.
 */
export default function ValidatedField({
  label,
  value,
  onChange,
  type = 'text',
  error = '',
  required = false,
  placeholder,
  autoComplete,
  dir,
  disabled = false,
}) {
  const { t } = useLang();
  const hasError = !!error;

  return (
    <label className="block">
      <span className="block text-sm mb-1">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir={dir}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        className={
          'input ' +
          (hasError
            ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
            : '')
        }
        style={hasError ? { boxShadow: '0 0 0 1px rgb(239 68 68 / 0.5)' } : undefined}
      />
      {hasError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t(error)}</p>
      )}
    </label>
  );
}

```

---

## src/context/AuthContext.jsx

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const [loading, setLoading] = useState(true);

  // Apply / clear the gender-accent class on <html> based on the active user.
  // Only students have a gender-driven theme; everyone else uses the default.
  useEffect(() => {
    const html = document.documentElement;
    if (role === 'student' && user?.gender === 'female') {
      html.classList.add('theme-female');
    } else {
      html.classList.remove('theme-female');
    }
  }, [role, user]);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null); setRole(null); setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setRole(data.role);
      localStorage.setItem('role', data.role);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setUser(null); setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    setUser(data.user);
    setRole(data.role);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUser(null); setRole(null);
  }, []);

  const updateUser = useCallback((u) => setUser(u), []);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, refresh, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

```

---

## src/context/LanguageContext.jsx

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations, ml as mlRaw } from '../i18n/translations';

const LanguageContext = createContext(null);
export const useLang = () => useContext(LanguageContext);

const SUPPORTED = ['en', 'ar', 'nl'];

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('lang');
    return SUPPORTED.includes(saved) ? saved : 'en';
  });

  // Apply <html lang> and <html dir> on every change. Arabic is RTL.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', lang);
  }, [lang]);

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next);
  }, []);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang]
  );

  const ml = useCallback((field) => mlRaw(field, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, ml, supported: SUPPORTED }}>
      {children}
    </LanguageContext.Provider>
  );
}

```

---

## src/context/ThemeContext.jsx

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

```

---

## src/i18n/translations.js

```javascript
/**
 * UI string dictionary. Lookup with t('key') in components via the
 * LanguageContext. DB content (lesson titles, exam questions, ...) is stored
 * as { en, ar, nl } per field — use ml(field, lang) to read those.
 */
export const translations = {
  en: {
    // generic
    appName: 'Salah al-Din',
    tagline: 'Education that nurtures mind and heart',
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    add: 'Add',
    submit: 'Submit',
    back: 'Back',
    next: 'Next',
    loading: 'Loading…',
    optional: 'Optional',
    profile: 'Profile',
    resetPassword: 'Reset password',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    // landing / news
    home: 'Home',
    news: 'News',
    aboutSchool: 'About the school',
    aboutBlurb: 'A welcoming community where students learn Arabic, Quran, Sira and life skills in a supportive environment.',
    readMore: 'Read more',
    noNews: 'No news yet.',
    // table headers
    tableTitle: 'Title',
    tableDate: 'Date',
    tableTime: 'Time',
    tableWhen: 'When',
    tableKind: 'Kind',
    tableType: 'Type',
    tableStatus: 'Status',
    tableGender: 'Gender',
    tableHours: 'Hours',
    tableRate: 'Rate',
    tableTotal: 'Total',
    tablePeriod: 'Period',
    tableBlocks: 'Blocks',
    tablePublished: 'Published',
    tablePaid: 'Paid',
    tablePassPct: 'Pass %',
    tableQuestions: 'Questions',
    tableQ: 'Q',
    // attendance
    attendance: 'Attendance',
    attendanceTitle: 'Daily attendance',
    pickDate: 'Pick a date',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    excused: 'Excused',
    saveAttendance: 'Save attendance',
    attendanceSaved: 'Attendance saved.',
    record: 'Record',
    history: 'History',
    from: 'From',
    to: 'To',
    students: 'Students',
    selectStudents: 'Select students',
    searchStudents: 'Search by name, email, or parent…',
    noMatchingStudents: 'No students match your search.',
    teacherAttendance: 'Teacher attendance',
    teacherAttendanceTitle: 'Daily teacher attendance',
    hourN: 'Hour {n}',
    workedHours: 'Worked hours',
    nthHour: 'nth hour',
    generateFromAttendance: 'Generate from attendance',
    manualEntry: 'Manual entry',
    pickTeacher: 'Pick a teacher',
    pickRange: 'Pick a date range',
    breakdown: 'Breakdown',
    pricePerHour: 'Price per hour',
    calculatedAmount: 'Calculated amount',
    generatePayslip: 'Generate payslip',
    noAttendanceInRange: 'No teacher attendance recorded in this range.',
    overlapWarningTitle: 'A payslip already exists for this period',
    overlapWarningBody: 'An existing payslip covers {from} → {to} ({amount}). Pick a non-overlapping date range.',
    male: 'Male',
    female: 'Female',
    allStudents: 'All students',
    studentsSelected: 'students selected',
    noResults: 'No records in this range.',
    pastDateBlocked: 'You can only record attendance for today or a future date.',
    noStudentsFound: 'No students found.',
    notRecorded: 'Not recorded',
    // validation error messages
    errRequired: 'Required',
    errEmailFormat: 'Enter a valid email address',
    errPhoneFormat: 'Enter a valid phone number for the selected country',
    errPhoneNeedsCountry: 'Pick a country code',
    errParentRequired: 'A parent is required — pick one or add a new parent',
    upcomingBirthdays: 'Upcoming birthdays',
    nextNDays: 'Next {n} days',
    daysAway: 'in {n} days',
    today: 'today',
    tomorrow: 'tomorrow',
    addNewParent: '+ Add new parent',
    selectAParent: 'Select a parent',
    cancelAddParent: 'Cancel — pick existing parent',
    birthDate: 'Birth date',
    noBirthdaysSoon: 'No birthdays in the next {n} days.',
    // Homework
    homework: 'Homework',
    homeworks: 'Homework',
    myHomework: 'My homework',
    addHomework: 'Add homework',
    kind: 'Kind',
    writing: 'Writing',
    recordedReading: 'Recorded reading',
    bookReading: 'Book reading',
    instructions: 'Instructions',
    dueDate: 'Due date',
    addPrompt: '+ Add prompt',
    promptText: 'Shown to the student',
    answerText: 'Correct answer',
    yourAnswer: 'Your answer',
    submitHomework: 'Submit',
    notDone: 'Not done',
    submittedShort: 'Submitted',
    graded: 'Graded',
    parentConfirmed: 'Confirmed by parent',
    awaitingParentNote: 'Awaiting parent note',
    recordAudio: 'Record',
    stopRecording: 'Stop',
    rerecord: 'Re-record',
    leaveParentNote: 'Leave a parent note',
    parentNoteSaved: 'Note saved.',
    homeworkSubmitted: 'Homework submitted.',
    score: 'Score',
    pickChild: 'Pick a child',
    noHomework: 'No homework yet.',
    autoScore: 'Auto-score',
    submissions: 'Submissions',
    teacherFeedback: 'Teacher feedback',
    errNameFormat: 'Letters only (and spaces, hyphens, apostrophes)',
    errMinLength: 'Too short',
    errMaxLength: 'Too long',
    errFixForm: 'Please fix the errors above',
    // dialog labels
    ok: 'OK',
    areYouSure: 'Are you sure?',
    confirmDelete: 'Delete this item?',
    confirmApprove: 'Approve this request?',
    confirmRejectHistory: 'Permanently delete this request from the history?',
    deleteNoteQ: 'Delete this note?',
    notice: 'Notice',
    welcomeBack: 'Welcome back',
    welcome: 'Welcome',
    // landing page
    heroTitle: 'Welcome to Salah al-Din School — your gateway to Arabic',
    heroTagline: 'Salah al-Din Arabic School: your gateway to Arabic language mastery.',
    btnRegister: 'Register now',
    btnExplore: 'Explore our services',
    aboutTitle: 'Salah al-Din School — an overview',
    aboutText: 'Salah al-Din School is a leading educational institution dedicated to delivering effective and outstanding Arabic language education for native and non-native speakers. We focus on language and communication skills in a supportive, modern environment that nurtures both academic and personal growth.',
    btnAboutMore: 'Read more',
    newsTitle: 'Latest news',
    feature1Title: 'Quran teaching',
    feature1Text: 'Comprehensive, intensive programmes for memorising and understanding the Quran for adults and children.',
    feature2Title: 'Modern curriculum',
    feature2Text: 'We follow up-to-date teaching methods that meet the needs of today’s students.',
    feature3Title: 'Outstanding teaching staff',
    feature3Text: 'Highly qualified teachers with deep experience in Arabic-language instruction.',
    // auth — forgot/reset/register
    forgotPassword: 'Forgot password?',
    forgotPasswordTitle: 'Reset your password',
    forgotPasswordHelp: 'Enter your email and we\'ll send you a link to set a new password.',
    sendResetLink: 'Send reset link',
    resetSent: 'If an account exists for that address, a reset link has been sent.',
    setNewPassword: 'Set a new password',
    register: 'Register',
    registerTitle: 'Register a student',
    registerHelp: 'Fill in the parent and student details. An administrator will review your request and email you the outcome.',
    parentInfo: 'Parent details',
    studentInfo: 'Student details',
    messageOptional: 'Message (optional)',
    submitRequest: 'Submit request',
    registerThanksTitle: 'Request submitted',
    registerThanksText: 'Thanks — we\'ve sent a confirmation email and will review your request shortly.',
    backToLogin: 'Back to login',
    needAccount: 'Don\'t have an account?',
    haveAccount: 'Already have an account?',
    registrations: 'Registrations',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    approve: 'Approve',
    reject: 'Reject',
    rejectionReason: 'Rejection reason (optional)',
    // landing-page-specific
    siteTitleFull: 'Salah al-Din Arabic School — Your Gateway to Arabic Language Mastery',
    navHome: 'Home',
    navAbout: 'About',
    navAdmissions: 'Admissions',
    navServices: 'Services',
    navContact: 'Contact',
    heroTitle: 'Welcome to Salah al-Din School',
    heroSubtitle: 'Your gateway to mastering the Arabic language',
    heroTagline: 'SALAH AL-DIN ARABIC SCHOOL: Your Gateway to Arabic Language Mastery.',
    btnRegister: 'Register now',
    btnExplore: 'Explore our services',
    btnAboutMore: 'Learn more',
    aboutTitle: 'Salah al-Din School — at a glance',
    aboutText: 'Salah al-Din School is a leading educational institution dedicated to delivering effective and excellent Arabic-language teaching for native and non-native speakers, with a focus on language and communication skills. We provide a stimulating, modern environment that supports each student\'s academic and personal growth.',
    latestNews: 'Latest news',
    feature1Title: 'Quran teaching',
    feature1Text: 'Comprehensive, intensive programmes for memorising and understanding the Holy Quran, for adults and children alike.',
    feature2Title: 'Modern curriculum',
    feature2Text: 'We rely on advanced teaching methods that meet the needs of today\'s students.',
    feature3Title: 'Outstanding teaching staff',
    feature3Text: 'Highly qualified teachers with deep experience in teaching the Arabic language.',
    footerCopyright: 'All rights reserved.',
    // dashboards
    dashboard: 'Dashboard',
    myLessons: 'My lessons',
    myExams: 'My exams',
    myResults: 'My results',
    myChildren: 'My children',
    // lesson / exam
    lessons: 'Lessons',
    exams: 'Exams',
    section: 'Section',
    unit: 'Unit',
    level: 'Level',
    locked: 'Locked',
    unlockHint: 'Pass the previous unit\'s final exam to unlock.',
    startExam: 'Start exam',
    submitExam: 'Submit exam',
    examPassed: 'Passed',
    examFailed: 'Did not pass',
    score: 'Score',
    correctAnswer: 'Correct answer',
    yourAnswer: 'Your answer',
    correct: 'Correct',
    incorrect: 'Incorrect',
    true: 'True',
    false: 'False',
    typeAnswer: 'Type your answer',
    // role labels
    admin: 'Admin',
    teacher: 'Teacher',
    parent: 'Parent',
    student: 'Student',
    // admin
    teachers: 'Teachers',
    parents: 'Parents',
    students: 'Students',
    payments: 'Payments',
    expenses: 'Expenses',
    calendar: 'Calendar',
    notes: 'Notes',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    photo: 'Photo',
    hourlyRate: 'Hourly rate',
    // notes
    addNote: 'Add note',
    note: 'Note',
    noteScope: 'Scope',
    general: 'General',
    // misc
    yes: 'Yes',
    no: 'No',
    error: 'Something went wrong',
    saved: 'Saved',
  },
  ar: {
    appName: 'مدرسة صلاح الدين',
    tagline: 'تعليم يغذي العقل والقلب',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    create: 'إنشاء',
    add: 'إضافة',
    submit: 'إرسال',
    back: 'رجوع',
    next: 'التالي',
    loading: 'جار التحميل…',
    optional: 'اختياري',
    profile: 'الملف الشخصي',
    resetPassword: 'إعادة تعيين كلمة المرور',
    language: 'اللغة',
    theme: 'المظهر',
    light: 'فاتح',
    daRk: 'داكن',
    dark: 'داكن',
    home: 'الرئيسية',
    news: 'الأخبار',
    aboutSchool: 'عن المدرسة',
    aboutBlurb: 'مجتمع ترحيبي يتعلم فيه الطلاب العربية والقرآن والسيرة ومهارات الحياة في بيئة داعمة.',
    readMore: 'اقرأ المزيد',
    noNews: 'لا توجد أخبار بعد.',
    // table headers
    tableTitle: 'العنوان',
    tableDate: 'التاريخ',
    tableTime: 'الوقت',
    tableWhen: 'متى',
    tableKind: 'النوع',
    tableType: 'النوع',
    tableStatus: 'الحالة',
    tableGender: 'الجنس',
    tableHours: 'الساعات',
    tableRate: 'الأجر',
    tableTotal: 'الإجمالي',
    tablePeriod: 'الفترة',
    tableBlocks: 'الأقسام',
    tablePublished: 'منشور',
    tablePaid: 'المدفوع',
    tablePassPct: 'نسبة النجاح',
    tableQuestions: 'الأسئلة',
    tableQ: 'س',
    // attendance
    attendance: 'الحضور',
    attendanceTitle: 'الحضور اليومي',
    pickDate: 'اختر تاريخًا',
    present: 'حاضر',
    absent: 'غائب',
    late: 'متأخر',
    excused: 'بعذر',
    saveAttendance: 'حفظ الحضور',
    attendanceSaved: 'تم حفظ الحضور.',
    record: 'تسجيل',
    history: 'السجل',
    from: 'من',
    to: 'إلى',
    students: 'الطلاب',
    selectStudents: 'اختر الطلاب',
    searchStudents: 'ابحث بالاسم أو البريد أو ولي الأمر…',
    noMatchingStudents: 'لا يوجد طلاب يطابقون البحث.',
    teacherAttendance: 'حضور المعلمين',
    teacherAttendanceTitle: 'حضور المعلمين اليومي',
    hourN: 'الساعة {n}',
    workedHours: 'الساعات المسجَّلة',
    nthHour: 'رقم الساعة',
    generateFromAttendance: 'إنشاء من الحضور',
    manualEntry: 'إدخال يدوي',
    pickTeacher: 'اختر معلمًا',
    pickRange: 'اختر نطاقًا زمنيًا',
    breakdown: 'التفاصيل',
    pricePerHour: 'سعر الساعة',
    calculatedAmount: 'المبلغ المحسوب',
    generatePayslip: 'إنشاء الفاتورة',
    noAttendanceInRange: 'لا توجد سجلات حضور للمعلم في هذه الفترة.',
    overlapWarningTitle: 'توجد فاتورة راتب مسبقًا لهذه الفترة',
    overlapWarningBody: 'فاتورة راتب موجودة تغطي من {from} إلى {to} ({amount}). اختر نطاقًا زمنيًا لا يتداخل معها.',
    male: 'ذكور',
    female: 'إناث',
    allStudents: 'كل الطلاب',
    studentsSelected: 'طلاب مختارون',
    noResults: 'لا توجد سجلات في هذه الفترة.',
    pastDateBlocked: 'يمكنك تسجيل الحضور لليوم أو لتاريخ مستقبلي فقط.',
    noStudentsFound: 'لا يوجد طلاب.',
    notRecorded: 'لم يُسجَّل',
    // validation
    errRequired: 'مطلوب',
    errEmailFormat: 'أدخل بريدًا إلكترونيًا صالحًا',
    errPhoneFormat: 'أدخل رقم هاتف صالحًا للدولة المختارة',
    errPhoneNeedsCountry: 'اختر رمز الدولة',
    errParentRequired: 'ولي الأمر مطلوب — اختر واحدًا أو أضف وليّ أمر جديد',
    upcomingBirthdays: 'أعياد الميلاد القادمة',
    nextNDays: 'الأيام الـ {n} القادمة',
    daysAway: 'خلال {n} يوم',
    today: 'اليوم',
    tomorrow: 'غدًا',
    addNewParent: '+ أضف وليّ أمر جديد',
    selectAParent: 'اختر وليّ الأمر',
    cancelAddParent: 'إلغاء — اختيار ولي أمر موجود',
    birthDate: 'تاريخ الميلاد',
    noBirthdaysSoon: 'لا توجد أعياد ميلاد في الأيام الـ {n} القادمة.',
    // Homework
    homework: 'الواجب',
    homeworks: 'الواجبات',
    myHomework: 'واجباتي',
    addHomework: 'إضافة واجب',
    kind: 'النوع',
    writing: 'كتابة',
    recordedReading: 'قراءة مسجلة',
    bookReading: 'قراءة من كتاب',
    instructions: 'التعليمات',
    dueDate: 'تاريخ التسليم',
    addPrompt: '+ إضافة سؤال',
    promptText: 'النص الظاهر للطالب',
    answerText: 'الإجابة الصحيحة',
    yourAnswer: 'إجابتك',
    submitHomework: 'إرسال',
    notDone: 'لم يُنجز',
    submittedShort: 'تم الإرسال',
    graded: 'تم التصحيح',
    parentConfirmed: 'مؤكَّد من ولي الأمر',
    awaitingParentNote: 'بانتظار ملاحظة ولي الأمر',
    recordAudio: 'تسجيل',
    stopRecording: 'إيقاف',
    rerecord: 'إعادة التسجيل',
    leaveParentNote: 'اكتب ملاحظة ولي الأمر',
    parentNoteSaved: 'تم حفظ الملاحظة.',
    homeworkSubmitted: 'تم إرسال الواجب.',
    score: 'النتيجة',
    pickChild: 'اختر طفلًا',
    noHomework: 'لا توجد واجبات بعد.',
    autoScore: 'التصحيح التلقائي',
    submissions: 'الإجابات',
    teacherFeedback: 'ملاحظة المعلم',
    errNameFormat: 'حروف فقط (مع المسافات والشرطات والفواصل العلوية)',
    errMinLength: 'قصير جدًا',
    errMaxLength: 'طويل جدًا',
    errFixForm: 'يرجى تصحيح الأخطاء أعلاه',
    // dialog labels
    ok: 'حسنًا',
    areYouSure: 'هل أنت متأكد؟',
    confirmDelete: 'هل تريد حذف هذا العنصر؟',
    confirmApprove: 'هل تريد قبول هذا الطلب؟',
    confirmRejectHistory: 'هل تريد حذف هذا الطلب من السجل بشكل نهائي؟',
    deleteNoteQ: 'هل تريد حذف هذه الملاحظة؟',
    notice: 'تنبيه',
    welcomeBack: 'أهلًا بعودتك',
    welcome: 'أهلًا',
    // landing page
    heroTitle: 'أهلًا بكم في مدرسة صلاح الدين — بوّابتكم إلى اللغة العربية',
    heroTagline: 'مدرسة صلاح الدين العربية: بوّابتكم إلى إتقان اللغة العربية.',
    btnRegister: 'سجّل الآن',
    btnExplore: 'استكشف خدماتنا',
    aboutTitle: 'مدرسة صلاح الدين — لمحة عامّة',
    aboutText: 'مدرسة صلاح الدين مؤسسة تعليمية رائدة تهدف إلى تقديم تعليم لغة عربية متميّز وفعّال للناطقين بها وغيرهم، مع التركيز على المهارات اللغوية والتواصلية في بيئة محفّزة ومتطوّرة تدعم نمو الطلاب أكاديميًا وشخصيًا.',
    btnAboutMore: 'اعرف المزيد',
    newsTitle: 'أحدث الأخبار',
    feature1Title: 'تعليم القرآن الكريم',
    feature1Text: 'برامج شاملة ومكثّفة لتحفيظ وفهم القرآن الكريم للكبار والصغار.',
    feature2Title: 'المناهج الحديثة',
    feature2Text: 'نعتمد على مناهج تعليمية متطوّرة تلبّي احتياجات الطلاب العصرية.',
    feature3Title: 'الكادر التعليمي المتميّز',
    feature3Text: 'مدرّسون ذوو كفاءة عالية وخبرة في تعليم اللغة العربية.',
    // auth — forgot/reset/register
    forgotPassword: 'هل نسيت كلمة المرور؟',
    forgotPasswordTitle: 'إعادة تعيين كلمة المرور',
    forgotPasswordHelp: 'أدخل بريدك الإلكتروني وسنرسل إليك رابطًا لتعيين كلمة مرور جديدة.',
    sendResetLink: 'إرسال رابط إعادة التعيين',
    resetSent: 'إذا كان هناك حساب لهذا البريد، فقد تم إرسال رابط إعادة التعيين.',
    setNewPassword: 'تعيين كلمة مرور جديدة',
    register: 'تسجيل',
    registerTitle: 'تسجيل طالب',
    registerHelp: 'املأ بيانات ولي الأمر والطالب. ستتم مراجعة طلبك من قِبل المسؤول وسيتم إعلامك بالنتيجة عبر البريد.',
    parentInfo: 'بيانات ولي الأمر',
    studentInfo: 'بيانات الطالب',
    messageOptional: 'رسالة (اختيارية)',
    submitRequest: 'إرسال الطلب',
    registerThanksTitle: 'تم إرسال الطلب',
    registerThanksText: 'شكرًا لك — تم إرسال رسالة تأكيد إلى بريدك، وسنراجع الطلب قريبًا.',
    backToLogin: 'العودة إلى تسجيل الدخول',
    needAccount: 'ليس لديك حساب؟',
    haveAccount: 'هل لديك حساب بالفعل؟',
    registrations: 'طلبات التسجيل',
    pending: 'قيد المراجعة',
    approved: 'مقبول',
    rejected: 'مرفوض',
    approve: 'قبول',
    reject: 'رفض',
    rejectionReason: 'سبب الرفض (اختياري)',
    // landing-page-specific
    siteTitleFull: 'مدرسة صلاح الدين - بوابة لغتكم العربية',
    navHome: 'الرئيسية',
    navAbout: 'من نحن',
    navAdmissions: 'القبول',
    navServices: 'الخدمات',
    navContact: 'تواصل معنا',
    heroTitle: 'أهلاً بكم في مدرسة صلاح الدين',
    heroSubtitle: 'بوابة لغتكم العربية',
    heroTagline: 'SALAHEDDIN ARABIC SCHOOL: Your Gateway to Arabic Language Mastery.',
    btnRegister: 'سجل الآن',
    btnExplore: 'استكشف خدماتنا',
    btnAboutMore: 'اعرف المزيد',
    aboutTitle: 'مدرسة صلاح الدين - لمحة عامة',
    aboutText: 'مدرسة صلاح الدين هي مؤسسة تعليمية رائدة تهدف إلى تقديم تعليم لغة عربية متميز وفعّال للناطقين بها وغيرهم، مع التركيز على المهارات اللغوية والتواصلية. نحن نوفر بيئة محفزة ومتطورة تدعم نمو الطلاب الأكاديمي والشخصي.',
    latestNews: 'أحدث الأخبار',
    feature1Title: 'تعليم القرآن الكريم',
    feature1Text: 'برامج شاملة ومكثفة لتحفيظ وفهم القرآن الكريم للكبار والصغار.',
    feature2Title: 'المناهج الحديثة',
    feature2Text: 'نعتمد على مناهج تعليمية متطورة تلبي احتياجات الطلاب العصرية.',
    feature3Title: 'الكادر التعليمي المتميز',
    feature3Text: 'مدرسون ذوو كفاءة عالية وخبرة في تعليم اللغة العربية.',
    footerCopyright: 'جميع الحقوق محفوظة.',
    dashboard: 'لوحة التحكم',
    myLessons: 'دروسي',
    myExams: 'اختباراتي',
    myResults: 'نتائجي',
    myChildren: 'أبنائي',
    lessons: 'الدروس',
    exams: 'الاختبارات',
    section: 'القسم',
    unit: 'الوحدة',
    level: 'المستوى',
    locked: 'مغلق',
    unlockHint: 'اجتز اختبار الوحدة السابقة لفتح هذه الوحدة.',
    startExam: 'بدء الاختبار',
    submitExam: 'تسليم الاختبار',
    examPassed: 'ناجح',
    examFailed: 'لم تنجح',
    score: 'النتيجة',
    correctAnswer: 'الإجابة الصحيحة',
    yourAnswer: 'إجابتك',
    correct: 'صحيح',
    incorrect: 'غير صحيح',
    true: 'صحيح',
    false: 'خطأ',
    typeAnswer: 'اكتب إجابتك',
    admin: 'مدير',
    teacher: 'معلم',
    parent: 'ولي أمر',
    student: 'طالب',
    teachers: 'المعلمون',
    parents: 'أولياء الأمور',
    students: 'الطلاب',
    payments: 'المدفوعات',
    expenses: 'المصروفات',
    calendar: 'التقويم',
    notes: 'الملاحظات',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    phone: 'الهاتف',
    photo: 'الصورة',
    hourlyRate: 'الأجر بالساعة',
    addNote: 'إضافة ملاحظة',
    note: 'ملاحظة',
    noteScope: 'النطاق',
    general: 'عام',
    yes: 'نعم',
    no: 'لا',
    error: 'حدث خطأ ما',
    saved: 'تم الحفظ',
  },
  nl: {
    appName: 'Salah al-Din',
    tagline: 'Onderwijs dat hoofd en hart voedt',
    login: 'Inloggen',
    logout: 'Uitloggen',
    email: 'E-mail',
    password: 'Wachtwoord',
    currentPassword: 'Huidig wachtwoord',
    newPassword: 'Nieuw wachtwoord',
    save: 'Opslaan',
    cancel: 'Annuleren',
    edit: 'Bewerken',
    delete: 'Verwijderen',
    create: 'Aanmaken',
    add: 'Toevoegen',
    submit: 'Indienen',
    back: 'Terug',
    next: 'Volgende',
    loading: 'Laden…',
    optional: 'Optioneel',
    profile: 'Profiel',
    resetPassword: 'Wachtwoord opnieuw instellen',
    language: 'Taal',
    theme: 'Thema',
    light: 'Licht',
    dark: 'Donker',
    home: 'Home',
    news: 'Nieuws',
    aboutSchool: 'Over de school',
    aboutBlurb: 'Een gastvrije gemeenschap waar leerlingen Arabisch, Koran, Sira en levensvaardigheden leren in een ondersteunende omgeving.',
    readMore: 'Lees meer',
    noNews: 'Nog geen nieuws.',
    // table headers
    tableTitle: 'Titel',
    tableDate: 'Datum',
    tableTime: 'Tijd',
    tableWhen: 'Wanneer',
    tableKind: 'Soort',
    tableType: 'Type',
    tableStatus: 'Status',
    tableGender: 'Geslacht',
    tableHours: 'Uren',
    tableRate: 'Tarief',
    tableTotal: 'Totaal',
    tablePeriod: 'Periode',
    tableBlocks: 'Blokken',
    tablePublished: 'Gepubliceerd',
    tablePaid: 'Betaald',
    tablePassPct: 'Slaagperc.',
    tableQuestions: 'Vragen',
    tableQ: 'V',
    // attendance
    attendance: 'Aanwezigheid',
    attendanceTitle: 'Dagelijkse aanwezigheid',
    pickDate: 'Kies een datum',
    present: 'Aanwezig',
    absent: 'Afwezig',
    late: 'Te laat',
    excused: 'Geoorloofd',
    saveAttendance: 'Aanwezigheid opslaan',
    attendanceSaved: 'Aanwezigheid opgeslagen.',
    record: 'Registreren',
    history: 'Geschiedenis',
    from: 'Van',
    to: 'Tot',
    students: 'Leerlingen',
    selectStudents: 'Leerlingen kiezen',
    searchStudents: 'Zoek op naam, e-mail of ouder…',
    noMatchingStudents: 'Geen leerlingen gevonden.',
    teacherAttendance: 'Aanwezigheid leerkrachten',
    teacherAttendanceTitle: 'Dagelijkse aanwezigheid leerkrachten',
    hourN: 'Uur {n}',
    workedHours: 'Gewerkte uren',
    nthHour: 'uur-nr.',
    generateFromAttendance: 'Genereren uit aanwezigheid',
    manualEntry: 'Handmatig invoeren',
    pickTeacher: 'Kies een leerkracht',
    pickRange: 'Kies een datumbereik',
    breakdown: 'Specificatie',
    pricePerHour: 'Prijs per uur',
    calculatedAmount: 'Berekend bedrag',
    generatePayslip: 'Loonfiche genereren',
    noAttendanceInRange: 'Geen aanwezigheid van leerkracht in dit bereik.',
    overlapWarningTitle: 'Er bestaat al een loonfiche voor deze periode',
    overlapWarningBody: 'Een bestaande loonfiche dekt {from} → {to} ({amount}). Kies een datumbereik dat niet overlapt.',
    male: 'Jongens',
    female: 'Meisjes',
    allStudents: 'Alle leerlingen',
    studentsSelected: 'leerlingen geselecteerd',
    noResults: 'Geen records in deze periode.',
    pastDateBlocked: 'U kunt alleen aanwezigheid registreren voor vandaag of een toekomstige datum.',
    noStudentsFound: 'Geen leerlingen gevonden.',
    notRecorded: 'Niet geregistreerd',
    // validation
    errRequired: 'Verplicht',
    errEmailFormat: 'Voer een geldig e-mailadres in',
    errPhoneFormat: 'Voer een geldig telefoonnummer in voor het gekozen land',
    errPhoneNeedsCountry: 'Kies een landcode',
    errParentRequired: 'Een ouder is verplicht — kies een ouder of voeg een nieuwe toe',
    upcomingBirthdays: 'Aankomende verjaardagen',
    nextNDays: 'Komende {n} dagen',
    daysAway: 'over {n} dagen',
    today: 'vandaag',
    tomorrow: 'morgen',
    addNewParent: '+ Nieuwe ouder toevoegen',
    selectAParent: 'Kies een ouder',
    cancelAddParent: 'Annuleren — bestaande ouder kiezen',
    birthDate: 'Geboortedatum',
    noBirthdaysSoon: 'Geen verjaardagen in de komende {n} dagen.',
    // Homework
    homework: 'Huiswerk',
    homeworks: 'Huiswerk',
    myHomework: 'Mijn huiswerk',
    addHomework: 'Huiswerk toevoegen',
    kind: 'Type',
    writing: 'Schrijven',
    recordedReading: 'Opgenomen lezen',
    bookReading: 'Lezen uit boek',
    instructions: 'Instructies',
    dueDate: 'Inleverdatum',
    addPrompt: '+ Vraag toevoegen',
    promptText: 'Wat de leerling ziet',
    answerText: 'Juiste antwoord',
    yourAnswer: 'Jouw antwoord',
    submitHomework: 'Indienen',
    notDone: 'Niet gedaan',
    submittedShort: 'Ingediend',
    graded: 'Beoordeeld',
    parentConfirmed: 'Bevestigd door ouder',
    awaitingParentNote: 'Wacht op ouderbericht',
    recordAudio: 'Opnemen',
    stopRecording: 'Stoppen',
    rerecord: 'Opnieuw opnemen',
    leaveParentNote: 'Schrijf een ouderbericht',
    parentNoteSaved: 'Notitie opgeslagen.',
    homeworkSubmitted: 'Huiswerk ingediend.',
    score: 'Score',
    pickChild: 'Kies een kind',
    noHomework: 'Nog geen huiswerk.',
    autoScore: 'Auto-score',
    submissions: 'Inzendingen',
    teacherFeedback: 'Feedback van leerkracht',
    errNameFormat: 'Alleen letters (met spaties, streepjes en apostrofs)',
    errMinLength: 'Te kort',
    errMaxLength: 'Te lang',
    errFixForm: 'Corrigeer de fouten hierboven',
    // dialog labels
    ok: 'OK',
    areYouSure: 'Weet u het zeker?',
    confirmDelete: 'Dit item verwijderen?',
    confirmApprove: 'Deze aanvraag goedkeuren?',
    confirmRejectHistory: 'Deze aanvraag definitief uit de geschiedenis verwijderen?',
    deleteNoteQ: 'Deze notitie verwijderen?',
    notice: 'Melding',
    welcomeBack: 'Welkom terug',
    welcome: 'Welkom',
    // landing page
    heroTitle: 'Welkom bij Salah al-Din school — uw poort naar de Arabische taal',
    heroTagline: 'Salah al-Din Arabische school: uw toegangspoort tot beheersing van het Arabisch.',
    btnRegister: 'Meld u nu aan',
    btnExplore: 'Ontdek onze diensten',
    aboutTitle: 'Salah al-Din school — een overzicht',
    aboutText: 'Salah al-Din school is een toonaangevende onderwijsinstelling die zich richt op effectief en uitstekend Arabisch taalonderwijs voor moedertaalsprekers en anderstaligen. Wij leggen de nadruk op taal- en communicatievaardigheden in een ondersteunende, moderne omgeving die zowel academische als persoonlijke groei stimuleert.',
    btnAboutMore: 'Lees meer',
    newsTitle: 'Laatste nieuws',
    feature1Title: 'Koranonderwijs',
    feature1Text: 'Uitgebreide en intensieve programma\'s voor het memoriseren en begrijpen van de Koran, voor volwassenen en kinderen.',
    feature2Title: 'Modern curriculum',
    feature2Text: 'Wij gebruiken hedendaagse onderwijsmethoden die aansluiten bij de behoeften van studenten van vandaag.',
    feature3Title: 'Uitzonderlijk docententeam',
    feature3Text: 'Hooggekwalificeerde docenten met ruime ervaring in het lesgeven van de Arabische taal.',
    // auth — forgot/reset/register
    forgotPassword: 'Wachtwoord vergeten?',
    forgotPasswordTitle: 'Wachtwoord opnieuw instellen',
    forgotPasswordHelp: 'Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen.',
    sendResetLink: 'Verstuur reset-link',
    resetSent: 'Als er een account bestaat voor dat adres, is er een reset-link verstuurd.',
    setNewPassword: 'Stel een nieuw wachtwoord in',
    register: 'Registreren',
    registerTitle: 'Een leerling registreren',
    registerHelp: 'Vul de gegevens van ouder en leerling in. Een beheerder beoordeelt uw aanvraag en informeert u per e-mail over de uitkomst.',
    parentInfo: 'Gegevens ouder',
    studentInfo: 'Gegevens leerling',
    messageOptional: 'Bericht (optioneel)',
    submitRequest: 'Aanvraag versturen',
    registerThanksTitle: 'Aanvraag ingediend',
    registerThanksText: 'Bedankt — we hebben een bevestigingsmail gestuurd en bekijken je aanvraag binnenkort.',
    backToLogin: 'Terug naar inloggen',
    needAccount: 'Nog geen account?',
    haveAccount: 'Heeft u al een account?',
    registrations: 'Aanvragen',
    pending: 'In afwachting',
    approved: 'Goedgekeurd',
    rejected: 'Afgewezen',
    approve: 'Goedkeuren',
    reject: 'Afwijzen',
    rejectionReason: 'Reden van afwijzing (optioneel)',
    // landing-page-specific
    siteTitleFull: 'SalahEddin Arabic School - Poort naar Arabische Taalbeheersing',
    navHome: 'Home',
    navAbout: 'Over ons',
    navAdmissions: 'Toelatingen',
    navServices: 'Diensten',
    navContact: 'Contact',
    heroTitle: 'Welkom bij SalahEddin School',
    heroSubtitle: 'Uw poort naar de Arabische taal',
    heroTagline: 'SALAHEDDIN ARABIC SCHOOL: Uw Toegangspoort tot Arabische Meesterschap.',
    btnRegister: 'Meld u nu aan',
    btnExplore: 'Ontdek onze diensten',
    btnAboutMore: 'Lees meer',
    aboutTitle: 'SalahEddin School - Een overzicht',
    aboutText: 'SalahEddin School is een toonaangevende onderwijsinstelling die zich richt op het leveren van effectief en uitstekend Arabisch taalonderwijs aan moedertaalsprekers en niet-moedertaalsprekers, met de nadruk op taal- en communicatieve vaardigheden. Wij bieden een stimulerende, moderne omgeving die de academische en persoonlijke groei van elke leerling ondersteunt.',
    latestNews: 'Laatste nieuws',
    feature1Title: 'Koranonderwijs',
    feature1Text: 'Uitgebreide en intensieve programma\'s voor het memoriseren en begrijpen van de Koran, voor zowel volwassenen als kinderen.',
    feature2Title: 'Modern curriculum',
    feature2Text: 'Wij hanteren geavanceerde onderwijsmethoden die voldoen aan de behoeften van de moderne leerling.',
    feature3Title: 'Uitzonderlijk docententeam',
    feature3Text: 'Hooggekwalificeerde leraren met ruime ervaring in het onderwijzen van de Arabische taal.',
    footerCopyright: 'Alle rechten voorbehouden.',
    dashboard: 'Dashboard',
    myLessons: 'Mijn lessen',
    myExams: 'Mijn examens',
    myResults: 'Mijn resultaten',
    myChildren: 'Mijn kinderen',
    lessons: 'Lessen',
    exams: 'Examens',
    section: 'Sectie',
    unit: 'Eenheid',
    level: 'Niveau',
    locked: 'Vergrendeld',
    unlockHint: 'Slaag voor het eindexamen van de vorige eenheid om te ontgrendelen.',
    startExam: 'Start examen',
    submitExam: 'Examen indienen',
    examPassed: 'Geslaagd',
    examFailed: 'Niet geslaagd',
    score: 'Score',
    correctAnswer: 'Juiste antwoord',
    yourAnswer: 'Jouw antwoord',
    correct: 'Juist',
    incorrect: 'Onjuist',
    true: 'Waar',
    false: 'Onwaar',
    typeAnswer: 'Typ je antwoord',
    admin: 'Beheerder',
    teacher: 'Leerkracht',
    parent: 'Ouder',
    student: 'Leerling',
    teachers: 'Leerkrachten',
    parents: 'Ouders',
    students: 'Leerlingen',
    payments: 'Betalingen',
    expenses: 'Uitgaven',
    calendar: 'Kalender',
    notes: 'Notities',
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    phone: 'Telefoon',
    photo: 'Foto',
    hourlyRate: 'Uurtarief',
    addNote: 'Notitie toevoegen',
    note: 'Notitie',
    noteScope: 'Bereik',
    general: 'Algemeen',
    yes: 'Ja',
    no: 'Nee',
    error: 'Er is iets misgegaan',
    saved: 'Opgeslagen',
  },
};

/** Read a multi-language DB field. Falls back gracefully across languages. */
export function ml(field, lang = 'en') {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field.en || field.ar || field.nl || '';
}

```

---

## src/pages/admin/Attendance.jsx

```jsx
import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import Avatar from '../../components/Avatar';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';

const STATUSES = ['present', 'late', 'excused', 'absent'];

const STATUS_COLOURS = {
  present: { bg: '#16a34a', text: 'white' },
  late:    { bg: '#f59e0b', text: 'white' },
  excused: { bg: '#6366f1', text: 'white' },
  absent:  { bg: '#dc2626', text: 'white' },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Read a student's parent's display name no matter how `parent` arrives:
 *   - undefined / null / empty string  -> ''
 *   - populated object {firstName, lastName, email}
 *   - bare ObjectId string (rare here, but defensive)
 */
function parentDisplay(student) {
  const p = student?.parent;
  if (!p) return '';
  if (typeof p === 'object') {
    return `${p.firstName || ''} ${p.lastName || ''} ${p.email || ''}`.trim();
  }
  return '';
}

/**
 * Free-text filter across firstName + lastName + email + parent's name/email.
 * Case-insensitive, multi-word: each whitespace-separated chunk in the query
 * must appear somewhere in the haystack.
 */
function studentMatches(student, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [
    student.firstName, student.lastName, student.email,
    parentDisplay(student),
  ].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every((chunk) => hay.includes(chunk));
}

/**
 * Tailwind classes for the gender-tinted background. Picks a soft pastel in
 * light mode and a deeply tinted but dark-friendly variant in dark mode.
 *
 *   - male:   blue-50  / dark blue-950 at 40 % opacity
 *   - female: pink-50  / dark pink-950 at 40 % opacity
 *
 * Used for both Record-tab cards and History-tab rows AND the chip picker
 * so the male/female cue is consistent everywhere.
 */
function genderTintClass(student) {
  return student?.gender === 'female'
    ? 'bg-pink-50 dark:bg-pink-950/40'
    : 'bg-blue-50 dark:bg-blue-950/40';
}

export default function AdminAttendance() {
  const { t } = useLang();
  const [tab, setTab] = useState('record');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('attendanceTitle')}</h1>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab('record')}
          className={'btn text-sm ' + (tab === 'record' ? 'btn-primary' : 'btn-ghost')}
        >
          {t('record')}
        </button>
        <button
          onClick={() => setTab('history')}
          className={'btn text-sm ' + (tab === 'history' ? 'btn-primary' : 'btn-ghost')}
        >
          {t('history')}
        </button>
      </div>

      {tab === 'record' ? <RecordTab /> : <HistoryTab />}
    </div>
  );
}

/* ---------- RECORD TAB ---------------------------------------------------- */

function RecordTab() {
  const { t } = useLang();
  const dialog = useDialog();
  const min = todayStr();

  const [date, setDate] = useState(min);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState(''); // '' | 'male' | 'female'

  const load = async (dateStr) => {
    setErr(''); setBusy(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        api.get('/students'),
        api.get('/attendance', { params: { date: dateStr } }),
      ]);
      setStudents(stuRes.data);
      const map = {};
      for (const r of attRes.data) {
        const sid = r.student?._id || r.student;
        if (sid) map[String(sid)] = r.status;
      }
      setRecords(map);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(date); /* eslint-disable-next-line */ }, [date]);

  const setStatus = (sid, status) => setRecords((r) => ({ ...r, [String(sid)]: status }));
  const isPast = date < min;

  const onSave = async () => {
    if (isPast) {
      await dialog.notify({ variant: 'error', title: t('pastDateBlocked') });
      return;
    }
    setBusy(true); setErr('');
    try {
      const payload = {
        date,
        records: Object.entries(records).map(([student, status]) => ({ student, status })),
      };
      await api.post('/attendance/bulk', payload);
      await dialog.notify({ variant: 'success', title: t('attendanceSaved') });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  // Apply search + gender filter before grouping by level so the empty-state
  // messaging works against the visible set.
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (!studentMatches(s, search)) return false;
      // Default 'male' if the student has no gender stored — matches how
      // the rest of the UI tints unknown-gender as male.
      if (genderFilter && (s.gender || 'male') !== genderFilter) return false;
      return true;
    });
  }, [students, search, genderFilter]);

  const byLevel = useMemo(() => {
    const out = {};
    for (const s of filteredStudents) {
      const k = s.level || '?';
      (out[k] = out[k] || []).push(s);
    }
    return out;
  }, [filteredStudents]);
  const levels = Object.keys(byLevel).sort();

  // Status counters reflect the FULL student set, not the filtered view —
  // the user wants to know how many of all students are recorded so far.
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  for (const v of Object.values(records)) if (counts[v] != null) counts[v]++;

  return (
    <>
      <div className="card flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-xs mb-1">{t('pickDate')}</span>
          <input type="date" className="input"
                 min={min} value={date}
                 onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="block flex-1 min-w-[220px]">
          <span className="block text-xs mb-1">{t('searchStudents')}</span>
          <input
            type="text" className="input"
            placeholder={t('searchStudents')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {/*
          Gender toggle — three buttons: all / male / female. Each lights up
          in its representative colour when active so the filter state is
          obvious. Composes with the search box.
        */}
        <div className="block">
          <span className="block text-xs mb-1">{t('tableGender')}</span>
          <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden">
            <GenderToggleBtn
              label={t('allStudents')}
              active={genderFilter === ''}
              onClick={() => setGenderFilter('')}
              activeStyle={{ backgroundColor: '#64748B', color: 'white' }}
            />
            <GenderToggleBtn
              label={t('male') || 'male'}
              active={genderFilter === 'male'}
              onClick={() => setGenderFilter('male')}
              activeStyle={{ backgroundColor: '#2563EB', color: 'white' }}
            />
            <GenderToggleBtn
              label={t('female') || 'female'}
              active={genderFilter === 'female'}
              onClick={() => setGenderFilter('female')}
              activeStyle={{ backgroundColor: '#DB2777', color: 'white' }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {STATUSES.map((s) => (
            <span
              key={s}
              className="px-2 py-1 rounded-full font-semibold"
              style={{ backgroundColor: STATUS_COLOURS[s].bg, color: STATUS_COLOURS[s].text }}
            >
              {t(s)}: {counts[s]}
            </span>
          ))}
          <span className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {t('notRecorded')}: {students.length - Object.keys(records).length}
          </span>
        </div>

        <button
          className="btn btn-primary ms-auto"
          disabled={busy || isPast || Object.keys(records).length === 0}
          onClick={onSave}
        >
          {busy ? t('loading') : t('saveAttendance')}
        </button>
      </div>

      {isPast && <p className="text-sm text-red-600">{t('pastDateBlocked')}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {students.length === 0 && !busy && (
        <div className="card text-slate-500">{t('noStudentsFound')}</div>
      )}

      {students.length > 0 && filteredStudents.length === 0 && (
        <div className="card text-slate-500">{t('noMatchingStudents')}</div>
      )}

      {levels.map((lv) => (
        <section key={lv} className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase">
            {t('level')} {lv}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {byLevel[lv].map((s) => (
              <StudentRow
                key={s._id}
                student={s}
                status={records[String(s._id)] || ''}
                onStatus={(st) => setStatus(s._id, st)}
                t={t}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/* ---------- HISTORY TAB --------------------------------------------------- */

function HistoryTab() {
  const { t } = useLang();
  const today = todayStr();

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(today);

  const [allStudents, setAllStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // empty = all
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/students').then((r) => setAllStudents(r.data)).catch(() => {});
  }, []);

  const load = async () => {
    setBusy(true); setErr('');
    try {
      const params = { from, to };
      if (selectedIds.length) params.students = selectedIds.join(',');
      const { data } = await api.get('/attendance/range', { params });
      setRecords(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to, selectedIds.length, selectedIds.join(',')]);

  const toggleStudent = (id) =>
    setSelectedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const clearSelected = () => setSelectedIds([]);

  // Filter the chip list (purely cosmetic — search narrows what's shown,
  // doesn't auto-select). Selected chips outside the search are still kept
  // in selectedIds and still affect the query.
  const filteredChips = useMemo(
    () => allStudents.filter((s) => studentMatches(s, search)),
    [allStudents, search]
  );

  return (
    <>
      <div className="card space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs mb-1">{t('from')}</span>
            <input type="date" className="input" value={from} max={to}
                   onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1">{t('to')}</span>
            <input type="date" className="input" value={to} min={from}
                   onChange={(e) => setTo(e.target.value)} />
          </label>
          <div className="ms-auto text-xs text-slate-500">
            {selectedIds.length === 0
              ? t('allStudents')
              : `${selectedIds.length} ${t('studentsSelected')}`}
          </div>
        </div>

        <label className="block">
          <span className="block text-xs mb-1">{t('searchStudents')}</span>
          <input
            type="text" className="input"
            placeholder={t('searchStudents')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs">{t('selectStudents')}</span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                className="text-xs text-slate-500 hover:underline"
                onClick={clearSelected}
              >
                {t('allStudents')}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {filteredChips.map((s) => {
              const active = selectedIds.includes(s._id);
              const tint = genderTintClass(s);
              const parentName = parentDisplay(s);

              // When inactive, show the soft gender tint so the picker itself
              // makes male/female obvious. When active, swap to the accent
              // colour so the "selected" state still reads loudly.
              const cls = active
                ? 'bg-[rgb(var(--accent))] text-white border-transparent'
                : `${tint} text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:opacity-90`;

              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => toggleStudent(s._id)}
                  title={parentName ? `${t('parent')}: ${parentName}` : ''}
                  className={
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm transition ' + cls
                  }
                >
                  <Avatar user={s} size={20} />
                  <span>{s.firstName} {s.lastName}</span>
                </button>
              );
            })}
            {allStudents.length === 0 && <span className="text-xs text-slate-500">—</span>}
            {allStudents.length > 0 && filteredChips.length === 0 && (
              <span className="text-xs text-slate-500">{t('noMatchingStudents')}</span>
            )}
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2"></th>
              <th className="text-start px-3 py-2">{t('student')}</th>
              <th className="text-start px-3 py-2">{t('parent')}</th>
              <th className="text-start px-3 py-2">{t('level')}</th>
              <th className="text-start px-3 py-2">{t('tableDate')}</th>
              <th className="text-start px-3 py-2">{t('tableStatus')}</th>
              <th className="text-start px-3 py-2">{t('notes')}</th>
            </tr>
          </thead>
          <tbody>
            {!busy && records.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                {t('noResults')}
              </td></tr>
            )}
            {records.map((r) => {
              const c = STATUS_COLOURS[r.status] || { bg: '#64748B', text: 'white' };
              const tint = genderTintClass(r.student);
              const pName = parentDisplay(r.student);
              return (
                <tr key={r._id} className={'border-t border-slate-200 dark:border-slate-800 ' + tint}>
                  <td className="px-3 py-2"><Avatar user={r.student} size={28} /></td>
                  <td className="px-3 py-2">
                    {r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">{pName || '—'}</td>
                  <td className="px-3 py-2">{r.student?.level || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: c.bg, color: c.text }}
                    >
                      {t(r.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.note || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- shared row used by Record tab --------------------------------- */

/**
 * One segment of the all/male/female toggle. When inactive it shows a muted
 * label; when active it picks up the colour passed via activeStyle so the
 * blue/pink mapping reads at a glance.
 */
function GenderToggleBtn({ label, active, onClick, activeStyle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3 py-1.5 text-xs transition ' +
        (active
          ? ''
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
      }
      style={active ? activeStyle : undefined}
    >
      {label}
    </button>
  );
}

function StudentRow({ student, status, onStatus, t }) {
  const tint = genderTintClass(student);
  const c = STATUS_COLOURS[status]; // undefined when not recorded yet

  // When a status is set, draw a thick coloured left edge + a soft colour
  // wash on top of the gender tint. We use the status colour at low alpha so
  // the gender background still shows through enough to be readable, while
  // the status is the dominant signal. When nothing's set, just show the
  // gender tint as before.
  //
  // The status's own brand colour also drives the inset border — so a row's
  // colour change is visible from the very edge of the card, useful when
  // scanning a dense list.
  const statusStyle = c
    ? {
        boxShadow: `inset 4px 0 0 0 ${c.bg}`,
        backgroundImage: `linear-gradient(${c.bg}1A, ${c.bg}1A)`, // 1A = ~10% alpha
      }
    : undefined;

  return (
    <div
      className={'card flex items-center gap-3 transition-colors duration-150 ' + tint}
      style={statusStyle}
    >
      <Avatar user={student} size={36} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{student.firstName} {student.lastName}</p>
        <p className="text-xs text-slate-500 truncate">
          {student.email}
          {parentDisplay(student) && <> · {parentDisplay(student)}</>}
        </p>
      </div>
      <div className="flex gap-1 flex-wrap">
        {STATUSES.map((st) => {
          const active = status === st;
          const sc = STATUS_COLOURS[st];
          return (
            <button
              key={st}
              type="button"
              onClick={() => onStatus(st)}
              className="text-xs px-2 py-1 rounded-full font-semibold transition"
              style={{
                backgroundColor: active ? sc.bg : 'transparent',
                color: active ? sc.text : sc.bg,
                border: `1.5px solid ${sc.bg}`,
              }}
            >
              {t(st)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

```

---

## src/pages/admin/Calendar.jsx

```jsx
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';

export default function AdminCalendar() {
  const { t } = useLang();
  const dialog = useDialog();
  const [entries, setEntries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState({
    kind: 'assignment',
    date: new Date().toISOString().slice(0, 10),
    startTime: '', endTime: '',
    teacher: '', lessons: [], title: '', notes: '',
  });
  const [err, setErr] = useState('');

  const load = async () => {
    const [e, t, l] = await Promise.all([
      api.get('/calendar'),
      api.get('/teachers'),
      api.get('/lessons'),
    ]);
    setEntries(e.data); setTeachers(t.data); setLessons(l.data);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post('/calendar', form);
      setForm((f) => ({ ...f, title: '', notes: '', lessons: [] }));
      load();
    } catch (e) { setErr(e.response?.data?.message || t('error')); }
  };

  const onDelete = async (id) => {
    const ok = await dialog.confirm({ title: t('confirmDelete'), danger: true });
    if (!ok) return;
    await api.delete(`/calendar/${id}`);
    load();
  };

  const teacherName = (tch) => tch ? `${tch.firstName} ${tch.lastName}` : '—';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('calendar')}</h1>

      <form onSubmit={onCreate} className="card grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-sm mb-1">Kind</span>
          <select className="input" value={form.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="assignment">Assignment</option>
            <option value="availability">Availability</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Date</span>
          <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('teacher')}</span>
          <select className="input" value={form.teacher} onChange={(e) => set('teacher', e.target.value)}>
            <option value="">—</option>
            {teachers.map((tt) => <option key={tt._id} value={tt._id}>{teacherName(tt)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Start</span>
          <input type="time" className="input" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">End</span>
          <input type="time" className="input" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Title</span>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="block md:col-span-3">
          <span className="block text-sm mb-1">{t('lessons')}</span>
          <select multiple className="input h-24"
            value={form.lessons}
            onChange={(e) => set('lessons', Array.from(e.target.selectedOptions).map((o) => o.value))}>
            {lessons.map((l) => <option key={l._id} value={l._id}>{(l.title?.en || l.title?.nl || l.title?.ar || 'Lesson')} — {l.section}</option>)}
          </select>
        </label>
        {err && <p className="text-sm text-red-600 md:col-span-3">{err}</p>}
        <div className="md:col-span-3">
          <button className="btn btn-primary">{t('create')}</button>
        </div>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2">{t('tableDate')}</th>
              <th className="text-start px-3 py-2">{t('tableKind')}</th>
              <th className="text-start px-3 py-2">{t('teacher')}</th>
              <th className="text-start px-3 py-2">{t('tableTime')}</th>
              <th className="text-start px-3 py-2">{t('lessons')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">—</td></tr>}
            {entries.map((e) => (
              <tr key={e._id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-3 py-2">{e.kind}</td>
                <td className="px-3 py-2">{teacherName(e.teacher)}</td>
                <td className="px-3 py-2">{e.startTime || '—'} – {e.endTime || '—'}</td>
                <td className="px-3 py-2">{(e.lessons || []).length}</td>
                <td className="px-3 py-2 text-end">
                  <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(e._id)}>{t('delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

```

---

## src/pages/admin/Dashboard.jsx

```jsx
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import UpcomingBirthdays from '../../components/UpcomingBirthdays';

export default function AdminDashboard() {
  const { t } = useLang();
  const { user } = useAuth();

  const tiles = [
    { to: '/admin/registrations', label: t('registrations'), icon: '📝', tint: '#FEF3C7', ring: '#F59E0B' },
    { to: '/admin/teachers',      label: t('teachers'),      icon: '👩‍🏫', tint: '#DBEAFE', ring: '#2563EB' },
    { to: '/admin/parents',       label: t('parents'),       icon: '👨‍👩‍👧', tint: '#FCE7F3', ring: '#DB2777' },
    { to: '/admin/students',      label: t('students'),      icon: '🎓',  tint: '#D1FAE5', ring: '#059669' },

    { to: '/admin/lessons',       label: t('lessons'),       icon: '📚',  tint: '#E0E7FF', ring: '#4F46E5' },
    { to: '/admin/exams',         label: t('exams'),         icon: '📋',  tint: '#FFE4E6', ring: '#E11D48' },
    { to: '/admin/exam-results',  label: t('myResults'),     icon: '📈',  tint: '#CFFAFE', ring: '#0891B2' },
    { to: '/admin/news',          label: t('news'),          icon: '📰',  tint: '#FEF9C3', ring: '#CA8A04' },

    { to: '/admin/payments',      label: t('payments'),      icon: '💶',  tint: '#DCFCE7', ring: '#16A34A' },
    { to: '/admin/attendance',    label: t('attendance'),    icon: '✅',  tint: '#FAE8FF', ring: '#9333EA' },
    { to: '/admin/calendar',      label: t('calendar'),      icon: '🗓',  tint: '#FFEDD5', ring: '#EA580C' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {t('welcomeBack')}, {user?.firstName}
        </h1>
        <p className="text-slate-500">{t('admin')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((tl) => (
          <Link
            key={tl.to}
            to={tl.to}
            className="card flex flex-col items-center text-center hover:shadow-md hover:-translate-y-0.5 transition"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-2"
              style={{
                backgroundColor: tl.tint,
                boxShadow: `inset 0 0 0 1.5px ${tl.ring}33`,
              }}
            >
              <span style={{ filter: 'saturate(1.1)' }}>{tl.icon}</span>
            </div>
            <div className="font-medium text-sm">{tl.label}</div>
          </Link>
        ))}
      </div>

      {/* Birthdays panel below the action grid — easy to scan, always visible. */}
      <UpcomingBirthdays />
    </div>
  );
}

```

---

## src/pages/admin/ExamResultDetail.jsx

```jsx
import ExamResultDetail from '../../components/ExamResultDetail';

export default function AdminExamResultDetail() {
  return <ExamResultDetail backTo="/admin/exam-results" />;
}

```

---

## src/pages/admin/ExamResults.jsx

```jsx
import ExamResultsBrowser from '../../components/ExamResultsBrowser';
import { useLang } from '../../context/LanguageContext';

export default function AdminExamResults() {
  const { t } = useLang();
  return <ExamResultsBrowser title={t('exams') + ' — ' + t('myResults')} detailPathPrefix="/admin/exam-results" />;
}

```

---

## src/pages/admin/Exams.jsx

```jsx
import CrudTable from '../../components/CrudTable';
import ExamForm from '../../components/ExamForm';
import { useLang } from '../../context/LanguageContext';

const empty = {
  title: { en: '', ar: '', nl: '' },
  section: 'Arabic',
  level: 'A',
  type: 'lessons',
  passingGrade: 50,
  questions: [],
};

export default function AdminExams() {
  const { t, ml } = useLang();
  return (
    <CrudTable
      title={t('exams')}
      endpoint="/exams"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('section'), render: (it) => it.section },
        { label: t('level'), render: (it) => it.level },
        { label: t('tableType'), render: (it) => it.type },
        { label: t('tableQuestions'), render: (it) => (it.questions || []).length },
        { label: t('tablePassPct'), render: (it) => `${it.passingGrade}%` },
      ]}
      Form={ExamForm}
    />
  );
}

```

---

## src/pages/admin/Homeworks.jsx

```jsx
import { useNavigate } from 'react-router-dom';
import CrudTable from '../../components/CrudTable';
import HomeworkForm from '../../components/HomeworkForm';
import { useLang } from '../../context/LanguageContext';

const empty = {
  kind: 'writing',
  title: { en: '', ar: '', nl: '' },
  instructions: { en: '', ar: '', nl: '' },
  level: 'A',
  dueDate: '',
  prompts: [],
};

export default function AdminHomeworks() {
  const { t, ml } = useLang();
  const nav = useNavigate();
  const kindLabel = (k) =>
    k === 'writing' ? t('writing')
    : k === 'recordedReading' ? t('recordedReading')
    : k === 'bookReading' ? t('bookReading')
    : k;

  return (
    <CrudTable
      title={t('homeworks')}
      endpoint="/homeworks"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('kind'),       render: (it) => kindLabel(it.kind) },
        { label: t('level'),      render: (it) => it.level },
        { label: t('teacher'),    render: (it) =>
            it.teacher
              ? `${it.teacher.firstName || ''} ${it.teacher.lastName || ''}`.trim() || '—'
              : '—' },
        { label: t('dueDate'),    render: (it) => it.dueDate ? new Date(it.dueDate).toLocaleDateString() : '—' },
      ]}
      Form={HomeworkForm}
      extraRowActions={(it) => (
        <button
          className="btn btn-primary text-xs"
          onClick={() => nav(`/admin/homeworks/${it._id}/submissions`)}
          title={t('submissions')}
        >
          {t('submissions')}
        </button>
      )}
    />
  );
}

```

---

## src/pages/admin/HomeworkSubmissions.jsx

```jsx
import HomeworkSubmissionsView from '../../components/HomeworkSubmissionsView';
import { useLang } from '../../context/LanguageContext';

export default function AdminHomeworkSubmissions() {
  const { t } = useLang();
  return <HomeworkSubmissionsView backTo="/admin/homeworks" backLabel={t('homeworks')} />;
}

```

---

## src/pages/admin/Lessons.jsx

```jsx
import CrudTable from '../../components/CrudTable';
import LessonForm from '../../components/LessonForm';
import { useLang } from '../../context/LanguageContext';

const empty = {
  title: { en: '', ar: '', nl: '' },
  unitName: { en: '', ar: '', nl: '' },
  section: 'Arabic',
  level: 'A',
  order: 0,
  blocks: [],
};

export default function AdminLessons() {
  const { t, ml } = useLang();
  return (
    <CrudTable
      title={t('lessons')}
      endpoint="/lessons"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('section'), render: (it) => it.section },
        { label: t('level'), render: (it) => it.level },
        { label: t('tableBlocks'), render: (it) => (it.blocks || []).length },
      ]}
      Form={LessonForm}
    />
  );
}

```

---

## src/pages/admin/News.jsx

```jsx
import CrudTable from '../../components/CrudTable';
import MultiLangInput from '../../components/MultiLangInput';
import { useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';

const empty = {
  title: { en: '', ar: '', nl: '' },
  coverImage: '',
  blocks: [],
  published: true,
};

export default function AdminNews() {
  const { t, ml } = useLang();
  return (
    <CrudTable
      title={t('news')}
      endpoint="/news"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('tablePublished'), render: (it) => it.published ? '✓' : '—' },
        { label: t('tableDate'), render: (it) => new Date(it.createdAt).toLocaleDateString() },
      ]}
      Form={NewsForm}
    />
  );
}

function NewsForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const set = (k, v) => onChange({ ...value, [k]: v });
  const blocks = value.blocks || [];

  // Defaults per block type — same shapes as the lesson editor.
  const NEW_BLOCK = {
    text: () => ({ content: { en:'', ar:'', nl:'' } }),
    image: () => ({ url: '' }),
    video: () => ({ url: '' }),
    imageAudio: () => ({ url: '', audioUrl: '' }),
    imageWithIcons: () => ({
      url: '',
      icons: [
        { kind: 'boy',  audioUrl: '', label: { en:'', ar:'', nl:'' } },
        { kind: 'girl', audioUrl: '', label: { en:'', ar:'', nl:'' } },
        { kind: 'man',  audioUrl: '', label: { en:'', ar:'', nl:'' } },
      ],
    }),
  };

  const addBlock = (type) => set('blocks', [...blocks, {
    type, order: blocks.length, perRow: 1, size: '100',
    caption: { en:'', ar:'', nl:'' },
    ...NEW_BLOCK[type](),
  }]);
  const updateBlock = (i, patch) => set('blocks', blocks.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const removeBlock = (i) => set('blocks', blocks.filter((_, idx) => idx !== i));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
      <div>
        <span className="block text-sm mb-1">Title</span>
        <MultiLangInput value={value.title || {}} onChange={(v) => set('title', v)} />
      </div>

      <CoverField value={value.coverImage} onChange={(v) => set('coverImage', v)} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!value.published} onChange={(e) => set('published', e.target.checked)} />
        Published
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">Content blocks</h3>
          <div className="flex gap-1 flex-wrap">
            {['text', 'image', 'video', 'imageAudio', 'imageWithIcons'].map((type) => (
              <button key={type} type="button" className="btn btn-soft text-xs" onClick={() => addBlock(type)}>+ {type}</button>
            ))}
          </div>
        </div>

        {blocks.map((b, i) => (
          <div key={i} className="card border space-y-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{b.type}</span>
              <label className="flex items-center gap-1 text-xs">
                <span className="text-slate-500">Per row</span>
                <select
                  className="input"
                  style={{ width: 70 }}
                  value={b.perRow ?? 1}
                  onChange={(e) => updateBlock(i, { perRow: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <button type="button" className="btn btn-ghost text-red-600 text-xs" onClick={() => removeBlock(i)}>×</button>
            </div>
            {b.type === 'text' && <MultiLangInput value={b.content || {}} onChange={(v) => updateBlock(i, { content: v })} multiline />}
            {(b.type === 'image' || b.type === 'video') && (
              <UploadField value={b.url} accept={b.type + '/*'} onChange={(url) => updateBlock(i, { url })} />
            )}
            {b.type === 'imageAudio' && (
              <>
                <UploadField label="Image" value={b.url} accept="image/*" onChange={(url) => updateBlock(i, { url })} />
                <UploadField label="Audio" value={b.audioUrl} accept="audio/*" onChange={(url) => updateBlock(i, { audioUrl: url })} />
              </>
            )}
            {b.type === 'imageWithIcons' && (
              <div className="space-y-2">
                <UploadField label="Main image (optional)" value={b.url} accept="image/*" onChange={(url) => updateBlock(i, { url })} />
                <p className="text-xs text-slate-500">
                  Each icon plays its own audio. Icons are the standard 🧒 / 👧 / 🧔 emoji.
                </p>
                {(b.icons || []).map((icon, iconIdx) => {
                  const emoji = { boy: '🧒', girl: '👧', man: '🧔' }[icon.kind] || '';
                  return (
                    <div key={icon.kind} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 rounded border border-slate-200 dark:border-slate-800">
                      <div className="md:col-span-2 text-xs font-medium capitalize flex items-center gap-2">
                        <span className="text-2xl leading-none">{emoji}</span>
                        {icon.kind}
                      </div>
                      <UploadField
                        label="Audio"
                        value={icon.audioUrl || ''}
                        accept="audio/*"
                        onChange={(url) => updateBlock(i, {
                          icons: b.icons.map((x, k) => k === iconIdx ? { ...x, audioUrl: url } : x),
                        })}
                      />
                      <div>
                        <span className="block text-xs mb-1">Label</span>
                        <MultiLangInput
                          value={icon.label || {}}
                          onChange={(v) => updateBlock(i, {
                            icons: b.icons.map((x, k) => k === iconIdx ? { ...x, label: v } : x),
                          })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {b.type !== 'text' && <MultiLangInput value={b.caption || {}} onChange={(v) => updateBlock(i, { caption: v })} placeholder="Caption" />}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-primary">{t('save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

function CoverField({ value, onChange }) {
  return (
    <div>
      <span className="block text-sm mb-1">Cover image</span>
      <UploadField value={value} accept="image/*" onChange={onChange} />
      {value && <img src={value} alt="" className="mt-2 max-h-32 rounded" />}
    </div>
  );
}

function UploadField({ label, value, accept, onChange }) {
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await api.post('/upload', fd);
      onChange(data.url);
    } finally { setBusy(false); }
  };
  return (
    <div>
      {label && <span className="block text-xs mb-1">{label}</span>}
      <div className="flex items-center gap-2">
        <input type="file" accept={accept} onChange={upload} className="text-sm flex-1 min-w-0" />
        {value && <span className="text-xs text-slate-500 truncate max-w-[12rem]">{value}</span>}
        {value && (
          <button type="button" className="btn btn-ghost text-xs text-red-600" onClick={() => onChange('')}>×</button>
        )}
      </div>
      {busy && <p className="text-xs text-slate-500">…</p>}
    </div>
  );
}

```

---

## src/pages/admin/Parents.jsx

```jsx
import { useState } from 'react';
import CrudTable from '../../components/CrudTable';
import UserFilterBar from '../../components/UserFilterBar';
import ValidatedField from '../../components/ValidatedField';
import PhoneInput from '../../components/PhoneInput';
import { useLang } from '../../context/LanguageContext';
import { validateEmail, validateName, validatePhone, runValidators } from '../../utils/validate';

const empty = { firstName: '', lastName: '', email: '', phone: '' };

export default function AdminParents() {
  const { t } = useLang();
  return (
    <CrudTable
      title={t('parents')}
      endpoint="/parents"
      emptyForm={empty}
      filters={{ q: '' }}
      FilterBar={(p) => <UserFilterBar {...p} />}
      columns={[
        { label: t('firstName'), render: (it) => it.firstName },
        { label: t('lastName'),  render: (it) => it.lastName },
        { label: t('email'),     render: (it) => it.email },
        { label: t('phone'),     render: (it) => it.phone || '—' },
      ]}
      Form={ParentForm}
    />
  );
}

function ParentForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const [errors, setErrors] = useState({});
  const set = (k, v) => onChange({ ...value, [k]: v });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = runValidators({
      firstName: () => validateName(value.firstName),
      lastName:  () => validateName(value.lastName),
      email:     () => validateEmail(value.email),
      phone:     () => validatePhone(value.phone, { required: false }),
    });
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ValidatedField label={t('firstName')} required
          value={value.firstName} onChange={(v) => set('firstName', v)}
          error={errors.firstName} />
        <ValidatedField label={t('lastName')} required
          value={value.lastName} onChange={(v) => set('lastName', v)}
          error={errors.lastName} />
        <ValidatedField label={t('email')} type="email" required
          value={value.email} onChange={(v) => set('email', v)}
          error={errors.email} />
        <PhoneInput label={t('phone')}
          value={value.phone} onChange={(v) => set('phone', v)}
          error={errors.phone} />
      </div>
      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-red-600">{t('errFixForm')}</p>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary">{t('save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

```

---

## src/pages/admin/Payments.jsx

```jsx
import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AdminPayments() {
  const { t } = useLang();
  const dialog = useDialog();
  const [teachers, setTeachers] = useState([]);
  const [list, setList] = useState([]);
  const [tab, setTab] = useState('attendance'); // 'attendance' | 'manual'
  const [err, setErr] = useState('');

  const load = async () => {
    const [a, b] = await Promise.all([api.get('/teachers'), api.get('/payments')]);
    setTeachers(a.data); setList(b.data);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    const ok = await dialog.confirm({ title: t('confirmDelete'), danger: true });
    if (!ok) return;
    await api.delete(`/payments/${id}`);
    load();
  };

  const downloadPayslip = async (id) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/payments/${id}/payslip`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payslip_${id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const teacherName = (id) => {
    const tch = teachers.find((x) => x._id === id || x._id === id?._id);
    return tch ? `${tch.firstName} ${tch.lastName}` : '—';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('payments')}</h1>

      {/* Mode tabs — attendance flow is the recommended one and is shown
          first; manual entry is kept for one-off corrections. */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab('attendance')}
          className={'btn text-sm ' + (tab === 'attendance' ? 'btn-primary' : 'btn-ghost')}
        >
          {t('generateFromAttendance')}
        </button>
        <button
          onClick={() => setTab('manual')}
          className={'btn text-sm ' + (tab === 'manual' ? 'btn-primary' : 'btn-ghost')}
        >
          {t('manualEntry')}
        </button>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {tab === 'attendance'
        ? <FromAttendanceForm teachers={teachers} onCreated={load} t={t} dialog={dialog} />
        : <ManualForm teachers={teachers} onCreated={load} t={t} setErr={setErr} />}

      {/* History table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2">{t('teacher')}</th>
              <th className="text-start px-3 py-2">{t('tableHours')}</th>
              <th className="text-start px-3 py-2">{t('tableRate')}</th>
              <th className="text-start px-3 py-2">{t('tableTotal')}</th>
              <th className="text-start px-3 py-2">{t('tablePeriod')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">—</td></tr>}
            {list.map((p) => (
              <tr key={p._id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-3 py-2">{p.teacher ? teacherName(p.teacher._id || p.teacher) : '—'}</td>
                <td className="px-3 py-2">{p.hoursWorked}</td>
                <td className="px-3 py-2">€ {p.hourlyRate}</td>
                <td className="px-3 py-2">€ {p.grossAmount}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {p.periodFrom ? new Date(p.periodFrom).toLocaleDateString() : '—'} → {p.periodTo ? new Date(p.periodTo).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2 text-end whitespace-nowrap">
                  <button className="btn btn-soft text-xs" onClick={() => downloadPayslip(p._id)}>PDF</button>
                  <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(p._id)}>{t('delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Generate from attendance ---------- */

/**
 * The new flow:
 *   pick teacher → pick range → preview shows recorded hours per day →
 *   admin sets rate → page shows totalHours × rate = amount →
 *   click Generate to POST /payments with the breakdown attached.
 */
function FromAttendanceForm({ teachers, onCreated, t, dialog }) {
  const [teacherId, setTeacherId] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayStr());
  const [preview, setPreview] = useState(null);
  const [rate, setRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // When the teacher changes, prefill the rate from the teacher's stored
  // hourlyRate. Admin can still override below.
  useEffect(() => {
    const tch = teachers.find((x) => x._id === teacherId);
    if (tch) setRate(tch.hourlyRate || 0);
  }, [teacherId, teachers]);

  // Re-run the preview whenever any of the inputs change. Cheap; if it
  // ever gets expensive, replace with a "Preview" button.
  useEffect(() => {
    if (!teacherId || !from || !to) { setPreview(null); return; }
    let alive = true;
    (async () => {
      setErr('');
      try {
        const { data } = await api.get('/payments/preview-from-attendance', {
          params: { teacher: teacherId, from, to },
        });
        if (alive) setPreview(data);
      } catch (e) {
        if (alive) {
          setPreview(null);
          setErr(e.response?.data?.message || t('error'));
        }
      }
    })();
    return () => { alive = false; };
  }, [teacherId, from, to, t]);

  const totalHours = preview?.totalHours || 0;
  const amount = totalHours * Number(rate || 0);

  const onGenerate = async () => {
    if (!teacherId) {
      await dialog.notify({ variant: 'error', title: t('pickTeacher') });
      return;
    }
    if (totalHours === 0) {
      await dialog.notify({ variant: 'error', title: t('noAttendanceInRange') });
      return;
    }
    setBusy(true); setErr('');
    try {
      await api.post('/payments', {
        teacher: teacherId,
        hoursWorked: totalHours,
        hourlyRate: Number(rate),
        periodFrom: from,
        periodTo: to,
        notes,
        breakdown: (preview?.days || []).map((d) => ({ date: d.date, hours: d.hours })),
      });
      onCreated();
      await dialog.notify({ variant: 'success', title: t('saved') });
      // Don't reset everything — the admin often runs the same teacher
      // for the next period. Just clear notes.
      setNotes('');
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  return (
    <div className="card space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="block md:col-span-2">
          <span className="block text-sm mb-1">{t('teacher')}</span>
          <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">— {t('pickTeacher')} —</option>
            {teachers.map((tch) => (
              <option key={tch._id} value={tch._id}>
                {tch.firstName} {tch.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('from')}</span>
          <input type="date" className="input" value={from} max={to}
                 onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('to')}</span>
          <input type="date" className="input" value={to} min={from}
                 onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {/* Breakdown preview */}
      {preview && totalHours > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2">{t('breakdown')}</h3>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="text-start px-3 py-2">{t('tableDate')}</th>
                  <th className="text-start px-3 py-2">{t('nthHour')}</th>
                  <th className="text-start px-3 py-2">{t('tableHours')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.days.map((d, i) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-xs">
                      {(d.hours || []).map((n) =>
                        <span
                          key={n}
                          className="inline-block me-1 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100"
                        >
                          {t('hourN').replace('{n}', n)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{(d.hours || []).length}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-semibold">
                  <td className="px-3 py-2">{t('tableTotal')}</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2">{totalHours}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview && totalHours === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('noAttendanceInRange')}</p>
      )}

      {/*
        Pre-submit warning when the preview returns a conflict: the chosen
        range overlaps an existing payslip for this teacher. We surface this
        here so the admin doesn't fill in the rate, click Generate, and only
        then see the 409. Reading the conflict's period helps them locate
        the original payslip.
      */}
      {preview?.conflict && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            ⚠ {t('overlapWarningTitle')}
          </p>
          <p className="text-sm mt-1 text-amber-900 dark:text-amber-100">
            {t('overlapWarningBody')
              .replace('{from}', new Date(preview.conflict.periodFrom).toLocaleDateString())
              .replace('{to}',   new Date(preview.conflict.periodTo).toLocaleDateString())
              .replace('{amount}', `€ ${Number(preview.conflict.grossAmount || 0).toFixed(2)}`)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-sm mb-1">{t('pricePerHour')}</span>
          <input type="number" min="0" step="0.01" className="input"
                 value={rate}
                 onChange={(e) => setRate(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('calculatedAmount')}</span>
          <div className="input flex items-center font-semibold">€ {amount.toFixed(2)}</div>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('notes')}</span>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div>
        <button
          className="btn btn-primary"
          disabled={busy || !teacherId || totalHours === 0 || !!preview?.conflict}
          onClick={onGenerate}
          title={preview?.conflict ? t('overlapWarningTitle') : ''}
        >
          {busy ? t('loading') : t('generatePayslip')}
        </button>
      </div>
    </div>
  );
}

/* ---------- Manual entry (legacy fallback) ---------- */

function ManualForm({ teachers, onCreated, t, setErr }) {
  const [form, setForm] = useState({
    teacher: '', hoursWorked: 0, hourlyRate: 0,
    periodFrom: '', periodTo: '', notes: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Prefill rate from teacher's stored hourlyRate when they pick one.
  useEffect(() => {
    const tch = teachers.find((x) => x._id === form.teacher);
    if (tch) setForm((f) => ({ ...f, hourlyRate: tch.hourlyRate || 0 }));
  }, [form.teacher, teachers]);

  const onCreate = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post('/payments', form);
      setForm({ teacher: '', hoursWorked: 0, hourlyRate: 0, periodFrom: '', periodTo: '', notes: '' });
      onCreated();
    } catch (e) { setErr(e.response?.data?.message || t('error')); }
  };

  return (
    <form onSubmit={onCreate} className="card grid grid-cols-1 md:grid-cols-3 gap-3">
      <label className="block">
        <span className="block text-sm mb-1">{t('teacher')}</span>
        <select className="input" value={form.teacher} onChange={(e) => set('teacher', e.target.value)} required>
          <option value="">—</option>
          {teachers.map((tch) => <option key={tch._id} value={tch._id}>{tch.firstName} {tch.lastName}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="block text-sm mb-1">{t('tableHours')}</span>
        <input type="number" min="0" step="0.5" className="input" value={form.hoursWorked} onChange={(e) => set('hoursWorked', Number(e.target.value))} required />
      </label>
      <label className="block">
        <span className="block text-sm mb-1">{t('hourlyRate')}</span>
        <input type="number" min="0" className="input" value={form.hourlyRate} onChange={(e) => set('hourlyRate', Number(e.target.value))} required />
      </label>
      <label className="block">
        <span className="block text-sm mb-1">{t('from')}</span>
        <input type="date" className="input" value={form.periodFrom} onChange={(e) => set('periodFrom', e.target.value)} />
      </label>
      <label className="block">
        <span className="block text-sm mb-1">{t('to')}</span>
        <input type="date" className="input" value={form.periodTo} onChange={(e) => set('periodTo', e.target.value)} />
      </label>
      <label className="block md:col-span-3">
        <span className="block text-sm mb-1">{t('notes')}</span>
        <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      <div className="md:col-span-3">
        <button className="btn btn-primary">{t('create')} {t('payments').toLowerCase()}</button>
      </div>
    </form>
  );
}

```

---

## src/pages/admin/Registrations.jsx

```jsx
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';

const TABS = ['pending', 'approved', 'rejected'];

/**
 * Admin queue of registration requests. All confirmations / prompts /
 * notifications go through the in-app dialog system — no window.* calls.
 */
export default function AdminRegistrations() {
  const { t } = useLang();
  const dialog = useDialog();

  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const { data } = await api.get('/registrations', { params: { status: tab } });
      setItems(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const approve = async (it) => {
    const ok = await dialog.confirm({
      title: t('confirmApprove'),
      message: `${it.parent.firstName} ${it.parent.lastName}`,
    });
    if (!ok) return;
    setBusyId(it._id); setErr('');
    try {
      await api.post(`/registrations/${it._id}/approve`);
      await dialog.notify({
        variant: 'success',
        title: t('approved'),
        message: 'Parent and student accounts created. Credentials have been emailed.',
      });
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (it) => {
    const reason = await dialog.prompt({
      title: t('reject'),
      message: `${it.parent.firstName} ${it.parent.lastName}`,
      placeholder: t('rejectionReason'),
      multiline: true,
      confirmLabel: t('reject'),
    });
    if (reason === null) return; // user cancelled
    setBusyId(it._id); setErr('');
    try {
      await api.post(`/registrations/${it._id}/reject`, { reason });
      await dialog.notify({
        variant: 'info',
        title: t('rejected'),
        message: 'The applicant has been notified by email.',
      });
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (it) => {
    const ok = await dialog.confirm({
      title: t('confirmRejectHistory'),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/registrations/${it._id}`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('registrations')}</h1>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={'btn text-sm ' + (tab === s ? 'btn-primary' : 'btn-ghost')}
          >
            {t(s)}
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="space-y-3">
        {items.length === 0 && <div className="card text-slate-500">—</div>}

        {items.map((it) => (
          <div key={it._id} className="card">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  {t('parent')}:{' '}
                  <span className="font-normal">
                    {it.parent.firstName} {it.parent.lastName} — {it.parent.email}
                    {it.parent.phone && ` · ${it.parent.phone}`}
                  </span>
                </p>
                <p className="font-semibold">
                  {t('student')}:{' '}
                  <span className="font-normal">
                    {it.student.firstName} {it.student.lastName} — {it.student.email}
                    {' · '}{t('level')} {it.student.level}
                    {' · '}{it.student.gender}
                  </span>
                </p>
                {it.message && (
                  <p className="text-slate-600 dark:text-slate-300 italic mt-1">
                    “{it.message}”
                  </p>
                )}
                {it.status === 'rejected' && it.rejectionReason && (
                  <p className="text-red-600 mt-1">
                    {t('rejectionReason')}: {it.rejectionReason}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(it.createdAt).toLocaleString()}
                  {it.decidedAt && ` · decided ${new Date(it.decidedAt).toLocaleString()}`}
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {it.status === 'pending' ? (
                  <>
                    <button
                      disabled={busyId === it._id}
                      className="btn btn-primary text-sm"
                      onClick={() => approve(it)}
                    >
                      {busyId === it._id ? t('loading') : t('approve')}
                    </button>
                    <button
                      disabled={busyId === it._id}
                      className="btn text-sm"
                      style={{ backgroundColor: '#dc2626', color: 'white' }}
                      onClick={() => reject(it)}
                    >
                      {t('reject')}
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-ghost text-xs text-red-600"
                    onClick={() => remove(it)}
                  >
                    {t('delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

```

---

## src/pages/admin/StudentNotes.jsx

```jsx
import StudentNotesView from '../../components/StudentNotesView';
import { useLang } from '../../context/LanguageContext';

export default function AdminStudentNotes() {
  const { t } = useLang();
  return <StudentNotesView backTo="/admin/students" backLabel={t('students')} />;
}

```

---

## src/pages/admin/Students.jsx

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import CrudTable from '../../components/CrudTable';
import Avatar from '../../components/Avatar';
import UserFilterBar from '../../components/UserFilterBar';
import ValidatedField from '../../components/ValidatedField';
import PhoneInput from '../../components/PhoneInput';
import { useLang } from '../../context/LanguageContext';
import {
  validateEmail, validateName, validatePhone, runValidators,
} from '../../utils/validate';

const empty = {
  firstName: '', lastName: '', email: '', parent: '', level: 'A',
  gender: 'male', paidAmount: 0, photo: '', birthDate: '',
};

export default function AdminStudents() {
  const { t } = useLang();
  const nav = useNavigate();
  const [parents, setParents] = useState([]);

  // Reload parents — used on first mount AND after the form creates a new
  // parent inline so the dropdown picks up the addition immediately.
  const reloadParents = () => api.get('/parents').then((r) => setParents(r.data));
  useEffect(() => { reloadParents(); }, []);

  const parentName = (p) => {
    if (!p) return '—';
    if (typeof p === 'object') return `${p.firstName} ${p.lastName}`;
    const found = parents.find((x) => x._id === p);
    return found ? `${found.firstName} ${found.lastName}` : '—';
  };

  const rowClass = (it) =>
    it.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30'
      : 'bg-blue-50 dark:bg-blue-950/30';

  return (
    <CrudTable
      title={t('students')}
      endpoint="/students"
      emptyForm={empty}
      filters={{ q: '', gender: '' }}
      FilterBar={(p) => <UserFilterBar {...p} withGender />}
      rowClass={rowClass}
      columns={[
        { label: t('photo'),       render: (it) => <Avatar user={it} size={36} /> },
        { label: t('firstName'),   render: (it) => it.firstName },
        { label: t('lastName'),    render: (it) => it.lastName },
        { label: t('email'),       render: (it) => it.email },
        { label: t('level'),       render: (it) => it.level },
        { label: t('tableGender'), render: (it) => (
            <span className={
              'text-xs px-2 py-0.5 rounded ' +
              (it.gender === 'female'
                ? 'bg-pink-200 text-pink-900 dark:bg-pink-900/50 dark:text-pink-200'
                : 'bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200')
            }>
              {it.gender || 'male'}
            </span>
          ) },
        { label: t('parent'),      render: (it) => parentName(it.parent) },
        { label: t('birthDate'),   render: (it) => it.birthDate ? new Date(it.birthDate).toLocaleDateString() : '—' },
        { label: t('tablePaid'),   render: (it) => `€ ${it.paidAmount || 0}` },
      ]}
      Form={(p) => (
        <StudentForm {...p} parents={parents} reloadParents={reloadParents} />
      )}
      extraRowActions={(it) => (
        <button
          className="btn btn-primary text-xs"
          onClick={() => nav(`/admin/students/${it._id}/notes`)}
          title="Open notes"
        >
          {t('notes')}
        </button>
      )}
    />
  );
}

/* ------------------------------------------------------------------ form */

function StudentForm({ value, onChange, onSubmit, onCancel, parents, reloadParents }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  // Mode: 'pick' (default — choose from existing parents) or 'create'
  // (admin types in new parent details right here in the form). Switching
  // to 'create' clears the previous parent selection.
  const [mode, setMode] = useState('pick');
  const [newParent, setNewParent] = useState({
    firstName: '', lastName: '', email: '', phone: '',
  });

  const set = (k, v) => onChange({ ...value, [k]: v });
  const setNP = (k, v) => setNewParent((p) => ({ ...p, [k]: v }));

  const onUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const { data } = await api.post('/upload', fd);
      set('photo', data.url);
    } finally { setBusy(false); }
  };

  // Toggle between pick-existing and create-new. Each mode has its own
  // validation rules — when switching to 'create' we clear the picked
  // parent so validation can't pass against the wrong source.
  const switchToCreate = () => {
    setMode('create');
    set('parent', '');
  };
  const switchToPick = () => {
    setMode('pick');
    setNewParent({ firstName: '', lastName: '', email: '', phone: '' });
    setErrors((es) => {
      const next = { ...es };
      delete next['newParent.firstName'];
      delete next['newParent.lastName'];
      delete next['newParent.email'];
      delete next['newParent.phone'];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // The `parent` field can arrive as either a populated object (when
    // editing — Mongoose returns `parent: {_id, firstName, ...}`) or as
    // an id string (when creating). Normalise to an id string for both
    // validation and the submitted payload.
    const parentId =
      value.parent && typeof value.parent === 'object'
        ? value.parent._id || ''
        : (value.parent || '');

    // Build the validator set based on the current mode.
    const baseValidators = {
      firstName: () => validateName(value.firstName),
      lastName:  () => validateName(value.lastName),
      email:     () => validateEmail(value.email),
    };

    let modeValidators;
    if (mode === 'pick') {
      modeValidators = {
        parent: () => (parentId ? '' : 'errParentRequired'),
      };
    } else {
      modeValidators = {
        'newParent.firstName': () => validateName(newParent.firstName),
        'newParent.lastName':  () => validateName(newParent.lastName),
        'newParent.email':     () => validateEmail(newParent.email),
        'newParent.phone':     () => validatePhone(newParent.phone, { required: false }),
      };
    }

    const errs = runValidators({ ...baseValidators, ...modeValidators });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      if (mode === 'create') {
        const { data: parent } = await api.post('/parents', newParent);
        reloadParents();
        // Submit with the override carrying the just-created parent id —
        // also strips any populated-object form of `parent`.
        onSubmit({ ...value, parent: parent._id });
      } else {
        // Always submit with parent as a plain id string, never an object.
        onSubmit({ ...value, parent: parentId });
      }
    } catch (err) {
      // Bubble server error into the UI. We attach it to a synthetic field
      // so the existing summary line shows it.
      setErrors({ _server: err.response?.data?.message || t('error') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar user={value} size={56} />
        <div>
          <input type="file" accept="image/*" onChange={onUpload} className="text-sm" />
          {busy && <span className="text-xs text-slate-500"> …</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ValidatedField label={t('firstName')} required
          value={value.firstName} onChange={(v) => set('firstName', v)}
          error={errors.firstName} />
        <ValidatedField label={t('lastName')} required
          value={value.lastName} onChange={(v) => set('lastName', v)}
          error={errors.lastName} />
        <ValidatedField label={t('email')} type="email" required
          value={value.email} onChange={(v) => set('email', v)}
          error={errors.email} />
        <label className="block">
          <span className="block text-sm mb-1">{t('level')}</span>
          <select value={value.level} onChange={(e) => set('level', e.target.value)} className="input">
            {['A','B','C','D'].map(l => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('tableGender')}</span>
          <select value={value.gender} onChange={(e) => set('gender', e.target.value)} className="input">
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('birthDate')}</span>
          <input type="date" className="input"
                 value={value.birthDate ? String(value.birthDate).slice(0, 10) : ''}
                 onChange={(e) => set('birthDate', e.target.value)} />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">{t('tablePaid')}</span>
          <input type="number" min="0" className="input"
                 value={value.paidAmount ?? 0}
                 onChange={(e) => set('paidAmount', Number(e.target.value))} />
        </label>
      </div>

      {/* Parent — required either by selection or by inline-create. */}
      <fieldset className="border border-slate-300 dark:border-slate-700 rounded-md p-3">
        <legend className="px-2 text-sm font-semibold">{t('parent')} *</legend>

        {mode === 'pick' ? (
          <div className="space-y-2">
            <label className="block">
              <select
                value={typeof value.parent === 'object' ? value.parent?._id || '' : value.parent || ''}
                onChange={(e) => set('parent', e.target.value || '')}
                className={
                  'input ' +
                  (errors.parent ? 'border-red-500' : '')
                }
              >
                <option value="">— {t('selectAParent')} —</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.email})</option>
                ))}
              </select>
              {errors.parent && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t(errors.parent)}</p>
              )}
            </label>
            <button
              type="button"
              className="btn btn-soft text-xs"
              onClick={switchToCreate}
            >
              {t('addNewParent')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ValidatedField label={t('firstName')} required
                value={newParent.firstName} onChange={(v) => setNP('firstName', v)}
                error={errors['newParent.firstName']} />
              <ValidatedField label={t('lastName')} required
                value={newParent.lastName} onChange={(v) => setNP('lastName', v)}
                error={errors['newParent.lastName']} />
              <ValidatedField label={t('email')} type="email" required
                value={newParent.email} onChange={(v) => setNP('email', v)}
                error={errors['newParent.email']} />
              <PhoneInput label={t('phone')}
                value={newParent.phone} onChange={(v) => setNP('phone', v)}
                error={errors['newParent.phone']} />
            </div>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={switchToPick}
            >
              {t('cancelAddParent')}
            </button>
          </div>
        )}
      </fieldset>

      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-red-600">
          {errors._server || t('errFixForm')}
        </p>
      )}

      <div className="flex gap-2">
        <button disabled={busy} className="btn btn-primary">
          {busy ? t('loading') : t('save')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

```

---

## src/pages/admin/TeacherAttendance.jsx

```jsx
import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import Avatar from '../../components/Avatar';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';

// Hour numbers we show as checkboxes. Three by default to match the spec.
// If the school later needs more, change this array — backend supports up
// to 12 already.
const HOUR_NUMBERS = [1, 2, 3];

const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Admin daily teacher-attendance recording.
 *
 *   1. Pick a date (today or future — past blocked via `min` and the server)
 *   2. Page loads all teachers + any existing record for that date
 *   3. For each teacher: three checkboxes (1st h / 2nd h / 3rd h)
 *   4. Save → POST /api/teacher-attendance/bulk (upserts by teacher+day)
 */
export default function AdminTeacherAttendance() {
  const { t } = useLang();
  const dialog = useDialog();
  const min = todayStr();

  const [date, setDate] = useState(min);
  const [teachers, setTeachers] = useState([]);
  // hoursByTeacher = { [teacherId]: Set<number> } — Set so toggling is O(1).
  const [hoursByTeacher, setHoursByTeacher] = useState({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async (dateStr) => {
    setErr(''); setBusy(true);
    try {
      const [tRes, aRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/teacher-attendance', { params: { date: dateStr } }),
      ]);
      setTeachers(tRes.data);

      const map = {};
      for (const r of aRes.data) {
        const tid = r.teacher?._id || r.teacher;
        if (tid) map[String(tid)] = new Set((r.hours || []).map(Number));
      }
      setHoursByTeacher(map);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };
  useEffect(() => { load(date); /* eslint-disable-next-line */ }, [date]);

  const toggleHour = (teacherId, n) => {
    setHoursByTeacher((cur) => {
      const next = { ...cur };
      const set = new Set(next[teacherId] || []);
      if (set.has(n)) set.delete(n); else set.add(n);
      next[teacherId] = set;
      return next;
    });
  };

  const isPast = date < min;

  const onSave = async () => {
    if (isPast) {
      await dialog.notify({ variant: 'error', title: t('pastDateBlocked') });
      return;
    }
    setBusy(true); setErr('');
    try {
      const payload = {
        date,
        records: Object.entries(hoursByTeacher).map(([teacher, hoursSet]) => ({
          teacher,
          hours: [...hoursSet].sort((a, b) => a - b),
        })),
      };
      await api.post('/teacher-attendance/bulk', payload);
      await dialog.notify({ variant: 'success', title: t('attendanceSaved') });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  // Search filter — name + email
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const hay = `${t.firstName || ''} ${t.lastName || ''} ${t.email || ''}`.toLowerCase();
      return q.split(/\s+/).every((c) => hay.includes(c));
    });
  }, [teachers, search]);

  // Quick stats for the summary chips at the top.
  const totalHours = Object.values(hoursByTeacher)
    .reduce((sum, set) => sum + (set?.size || 0), 0);
  const teachersRecorded = Object.values(hoursByTeacher)
    .filter((set) => set?.size > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">{t('teacherAttendanceTitle')}</h1>
        <button
          className="btn btn-primary"
          disabled={busy || isPast}
          onClick={onSave}
        >
          {busy ? t('loading') : t('saveAttendance')}
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-xs mb-1">{t('pickDate')}</span>
          <input type="date" className="input" min={min}
                 value={date}
                 onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block flex-1 min-w-[220px]">
          <span className="block text-xs mb-1">{t('searchStudents').replace('parent', 'email')}</span>
          <input type="text" className="input"
                 placeholder={t('searchStudents').replace('parent', 'email')}
                 value={search}
                 onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100">
            {teachersRecorded} / {teachers.length}
          </span>
          <span className="px-2 py-1 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
            {t('workedHours')}: {totalHours}
          </span>
        </div>
      </div>

      {isPast && <p className="text-sm text-red-600">{t('pastDateBlocked')}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map((teacher) => {
          const set = hoursByTeacher[String(teacher._id)] || new Set();
          return (
            <TeacherRow
              key={teacher._id}
              teacher={teacher}
              hourSet={set}
              onToggle={(n) => toggleHour(String(teacher._id), n)}
              t={t}
            />
          );
        })}
      </div>

      {!busy && filtered.length === 0 && (
        <div className="card text-slate-500">{t('noMatchingStudents').replace('students', 'teachers')}</div>
      )}
    </div>
  );
}

function TeacherRow({ teacher, hourSet, onToggle, t }) {
  const anyChecked = hourSet.size > 0;

  // Soft tint when at least one hour is checked, so the eye picks out
  // who's been recorded vs who hasn't.
  const cls = anyChecked
    ? 'bg-emerald-50 dark:bg-emerald-950/30'
    : '';

  return (
    <div className={'card flex items-center gap-3 transition-colors ' + cls}>
      <Avatar user={teacher} size={36} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{teacher.firstName} {teacher.lastName}</p>
        <p className="text-xs text-slate-500 truncate">{teacher.email}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {HOUR_NUMBERS.map((n) => {
          const on = hourSet.has(n);
          return (
            <label
              key={n}
              className={
                'inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold cursor-pointer transition ' +
                (on
                  ? 'bg-emerald-600 border-emerald-700 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800')
              }
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => onToggle(n)}
              />
              {t('hourN').replace('{n}', n)}
            </label>
          );
        })}
      </div>
    </div>
  );
}

```

---

## src/pages/admin/Teachers.jsx

```jsx
import { useState } from 'react';
import api from '../../api/client';
import CrudTable from '../../components/CrudTable';
import Avatar from '../../components/Avatar';
import UserFilterBar from '../../components/UserFilterBar';
import ValidatedField from '../../components/ValidatedField';
import PhoneInput from '../../components/PhoneInput';
import { useLang } from '../../context/LanguageContext';
import { validateEmail, validateName, validatePhone, runValidators } from '../../utils/validate';

const empty = { firstName: '', lastName: '', email: '', phone: '', photo: '', hourlyRate: 0 };

export default function AdminTeachers() {
  const { t } = useLang();

  return (
    <CrudTable
      title={t('teachers')}
      endpoint="/teachers"
      emptyForm={empty}
      filters={{ q: '' }}
      FilterBar={(p) => <UserFilterBar {...p} />}
      columns={[
        { label: t('photo'),       render: (it) => <Avatar user={it} size={36} /> },
        { label: t('firstName'),   render: (it) => it.firstName },
        { label: t('lastName'),    render: (it) => it.lastName },
        { label: t('email'),       render: (it) => it.email },
        { label: t('phone'),       render: (it) => it.phone || '—' },
        { label: t('hourlyRate'),  render: (it) => `€ ${it.hourlyRate || 0}` },
      ]}
      Form={TeacherForm}
    />
  );
}

function TeacherForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => onChange({ ...value, [k]: v });

  const onUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const { data } = await api.post('/upload', fd);
      set('photo', data.url);
    } finally { setBusy(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = runValidators({
      firstName: () => validateName(value.firstName),
      lastName:  () => validateName(value.lastName),
      email:     () => validateEmail(value.email),
      phone:     () => validatePhone(value.phone, { required: false }),
    });
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar user={value} size={56} />
        <div>
          <input type="file" accept="image/*" onChange={onUpload} className="text-sm" />
          {busy && <span className="text-xs text-slate-500"> …</span>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ValidatedField label={t('firstName')} required
          value={value.firstName} onChange={(v) => set('firstName', v)}
          error={errors.firstName} />
        <ValidatedField label={t('lastName')} required
          value={value.lastName} onChange={(v) => set('lastName', v)}
          error={errors.lastName} />
        <ValidatedField label={t('email')} type="email" required
          value={value.email} onChange={(v) => set('email', v)}
          error={errors.email} />
        <PhoneInput label={t('phone')}
          value={value.phone} onChange={(v) => set('phone', v)}
          error={errors.phone} />
        <label className="block">
          <span className="block text-sm mb-1">{t('hourlyRate')}</span>
          <input type="number" min="0" className="input"
                 value={value.hourlyRate ?? 0}
                 onChange={(e) => set('hourlyRate', Number(e.target.value))} />
        </label>
      </div>
      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-red-600">{t('errFixForm')}</p>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary">{t('save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  );
}

```

---

## src/pages/ForgotPassword.jsx

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';

export default function ForgotPassword() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await api.post('/auth/forgot-password', { email });
      // The server intentionally returns the same response regardless of
      // whether the email matched a user — we mirror that here.
      setSent(true);
    } catch (err) {
      setErr(err.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card">
        <h1 className="text-xl font-semibold mb-2">{t('forgotPasswordTitle')}</h1>

        {sent ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {t('resetSent')}
            </p>
            <Link to="/login" className="btn btn-soft w-full">{t('backToLogin')}</Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('forgotPasswordHelp')}
            </p>
            <div>
              <label className="block text-sm mb-1">{t('email')}</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input" autoFocus
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={loading} className="btn btn-primary w-full">
              {loading ? t('loading') : t('sendResetLink')}
            </button>
            <Link to="/login" className="block text-center text-sm text-slate-500 hover:underline">
              {t('backToLogin')}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

```

---

## src/pages/Landing.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import Logo from '../components/Logo';

/**
 * Kid-friendly landing page with full dark-mode support.
 *
 * All gradients and surface colours live in `index.css` under `.kid-*`
 * classes that respond to the global `.dark` toggle. JSX stays clean and
 * the page picks up the dark theme automatically when the user toggles it.
 */
export default function Landing() {
  const { t, ml, lang } = useLang();
  const [news, setNews] = useState([]);

  useEffect(() => {
    api.get('/news').then((r) => setNews(r.data)).catch(() => {});
  }, []);

  return (
    <div className="-mx-4 -my-6">
      <Hero t={t} lang={lang} />
      <FunFeatures t={t} />
      <NewsAndAbout t={t} ml={ml} lang={lang} news={news} />
      <Footer t={t} />
    </div>
  );
}

/* ---------- Hero ---------------------------------------------------------- */

function Hero({ t, lang }) {
  return (
    <section className="kid-bg-hero relative overflow-hidden px-6 pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Decorative blobs — kept brightly coloured in both modes since they're
          dimmed by opacity and blur, so contrast is fine. */}
      <div
        aria-hidden="true"
        className="kid-blob absolute -top-16 -left-10 w-72 h-72 opacity-40 dark:opacity-25"
        style={{ background: '#FDE68A', filter: 'blur(2px)' }}
      />
      <div
        aria-hidden="true"
        className="kid-blob absolute -bottom-20 -right-8 w-96 h-96 opacity-50 dark:opacity-30"
        style={{ background: '#A7F3D0', animationDelay: '2s', filter: 'blur(2px)' }}
      />
      <div
        aria-hidden="true"
        className="kid-blob absolute top-1/3 right-1/4 w-44 h-44 opacity-50 dark:opacity-30 hidden md:block"
        style={{ background: '#FBCFE8', animationDelay: '4s', filter: 'blur(2px)' }}
      />

      <Sparkles />

      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Copy */}
        <div className="text-center md:text-start kid-fade-up">
          {/* Big animated logo badge above the headline */}
          <div className="flex md:justify-start justify-center mb-5">
            <div
              className="kid-bob inline-block rounded-full bg-white/60 dark:bg-white/10 backdrop-blur p-2 shadow-lg"
              style={{ boxShadow: '0 12px 32px -8px rgba(124, 58, 237, 0.45)' }}
            >
              <Logo variant="badge" size={88} />
            </div>
          </div>

          <h1 className="kid-hero-title text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            {t('heroTitle')}
          </h1>
          {/* Tagline uses kid-hero-tagline so it gets bright slate-100 in dark
              mode, slate-700 in light. */}
          <p className="kid-hero-tagline text-lg md:text-xl mb-8 max-w-xl mx-auto md:mx-0">
            {t('heroTagline')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
            <Link
              to="/register"
              className="kid-cta inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-bold text-white shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.45)',
              }}
            >
              <span>🎉</span>
              <span className="mx-2">{t('btnRegister')}</span>
              <span>{lang === 'ar' ? '←' : '→'}</span>
            </Link>
            {/* <Link
              to="/news"
              className="kid-cta inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-bold bg-white dark:bg-slate-900 kid-text-strong shadow-md border-2 border-white dark:border-slate-700"
            >
              <span className="me-2">✨</span>
              {t('btnExplore')}
            </Link> */}
          </div>
        </div>

        {/* Illustration */}
        <div className="relative h-72 md:h-96 kid-fade-up kid-d2">
          <FloatingScene />
        </div>
      </div>

      {/* Wavy bottom edge — fill driven by `.kid-wave-fill` so it picks up
          the right page-background colour in light vs dark. */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        style={{ height: 60 }}
        aria-hidden="true"
      >
        <path
          d="M0,40 C240,80 480,0 720,30 C960,60 1200,20 1440,50 L1440,80 L0,80 Z"
          className="kid-wave-fill"
        />
      </svg>
    </section>
  );
}

/* ---------- Floating illustration scene ----------------------------------- */

function FloatingScene() {
  return (
    <div className="relative w-full h-full">
      <div className="kid-spin-slow absolute top-2 right-10" style={{ width: 80, height: 80 }} aria-hidden="true">
        <SunSVG />
      </div>
      <div className="kid-float absolute top-12 left-4" style={{ width: 90 }} aria-hidden="true">
        <CloudSVG />
      </div>
      <div className="kid-bob absolute bottom-2 left-1/2"
           style={{ width: 200, transform: 'translateX(-50%)' }} aria-hidden="true">
        <KidWithBookSVG />
      </div>
      <div className="kid-wiggle absolute bottom-24 right-10" style={{ width: 56 }} aria-hidden="true">
        <StarSVG />
      </div>
      <div className="kid-float absolute top-1/2 left-2"
           style={{ width: 80, animationDelay: '1s' }} aria-hidden="true">
        <PencilSVG />
      </div>
    </div>
  );
}

/* ---------- Sparkles ------------------------------------------------------ */

function Sparkles() {
  const sparks = [
    { top: '15%', left: '8%',  delay: '0s' },
    { top: '70%', left: '15%', delay: '1.4s' },
    { top: '40%', left: '40%', delay: '2.2s' },
    { top: '20%', left: '70%', delay: '0.6s' },
    { top: '78%', left: '60%', delay: '1.8s' },
    { top: '55%', left: '88%', delay: '3.0s' },
  ];
  return (
    <>
      {sparks.map((s, i) => (
        <div
          key={i}
          className="kid-wiggle absolute"
          aria-hidden="true"
          style={{ top: s.top, left: s.left, animationDelay: s.delay, fontSize: 20, opacity: 0.7 }}
        >
          ✨
        </div>
      ))}
    </>
  );
}

/* ---------- Feature tiles ------------------------------------------------- */

function FunFeatures({ t }) {
  // The tile classes (`kid-tile-yellow` etc.) provide the bg in both modes;
  // the `--ring` CSS var inside each class drives the heading colour and
  // the badge drop-shadow so per-tile accent is preserved.
  const tiles = [
    { icon: '🕌', title: t('feature1Title'), text: t('feature1Text'), cls: 'kid-tile-yellow' },
    { icon: '📚', title: t('feature2Title'), text: t('feature2Text'), cls: 'kid-tile-blue'   },
    { icon: '👨‍🏫', title: t('feature3Title'), text: t('feature3Text'), cls: 'kid-tile-pink'   },
    { icon: '🌟', title: t('appName'),       text: t('tagline'),       cls: 'kid-tile-mint'   },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tiles.map((tile, i) => (
          <div
            key={i}
            className={`${tile.cls} kid-tile kid-fade-up kid-d${i + 1} rounded-3xl p-6 text-center shadow-md`}
          >
            <div
              className="kid-tile-badge kid-bob inline-flex items-center justify-center mb-4 rounded-full"
              style={{ width: 72, height: 72, fontSize: 36 }}
            >
              {tile.icon}
            </div>
            <h3
              className="text-lg font-extrabold mb-2"
              style={{ color: 'var(--ring)' }}
            >
              {tile.title}
            </h3>
            <p className="kid-text-body text-sm">{tile.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- About + News -------------------------------------------------- */

function NewsAndAbout({ t, ml, lang, news }) {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12 grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="kid-bg-about md:col-span-7 rounded-3xl p-8 shadow-md kid-fade-up">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl kid-wiggle inline-block">📖</span>
          <h2 className="kid-text-strong text-2xl md:text-3xl font-extrabold">
            {t('aboutTitle')}
          </h2>
        </div>
        <p className="kid-text-body leading-relaxed mb-5">{t('aboutText')}</p>
        <Link
          to="/news"
          className="kid-cta inline-flex items-center px-6 py-3 rounded-full font-bold text-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' }}
        >
          {t('btnAboutMore')}
          <span className="ms-2">{lang === 'ar' ? '←' : '→'}</span>
        </Link>
      </div>

      <aside className="kid-bg-news md:col-span-5 rounded-3xl p-6 shadow-md kid-fade-up kid-d2">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl kid-bob inline-block">📰</span>
          <h3 className="kid-text-strong text-xl font-extrabold">{t('newsTitle')}</h3>
        </div>

        <div className="space-y-3">
          {news.length === 0 && (
            <p className="kid-text-muted text-sm">{t('noNews')}</p>
          )}
          {news.slice(0, 3).map((n, i) => (
            <Link
              key={n._id}
              to={`/news/${n._id}`}
              className={`kid-news-item kid-tile kid-fade-up kid-d${i + 1} flex items-center gap-3 p-3 rounded-2xl`}
            >
              <div
                className="h-14 w-14 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FBCFE8, #BFDBFE)' }}
              >
                {n.coverImage ? (
                  <img src={n.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🌟</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="kid-text-strong font-bold truncate">{ml(n.title)}</h4>
                <p className="kid-text-muted text-xs">
                  {new Date(n.createdAt).toLocaleDateString(
                    lang === 'ar' ? 'ar-EG' : lang === 'nl' ? 'nl-NL' : 'en-US'
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </section>
  );
}

/* ---------- Footer -------------------------------------------------------- */

function Footer({ t }) {
  return (
    <footer className="kid-bg-footer px-6 py-10 mt-4 text-white relative overflow-hidden">
      <div className="absolute -top-10 -left-10 text-7xl opacity-20 kid-spin-slow" aria-hidden="true">
        🌟
      </div>
      <div className="absolute -bottom-8 right-8 text-6xl opacity-25 kid-float" aria-hidden="true">
        🌙
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="flex justify-center mb-3">
          <Logo size={56} color="white" />
        </div>
        <p className="text-sm opacity-90">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}

/* ---------- Inline SVGs --------------------------------------------------- */

function SunSVG() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
      <circle cx="50" cy="50" r="22" fill="#FBBF24" />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x1 = 50 + Math.cos(angle) * 30;
        const y1 = 50 + Math.sin(angle) * 30;
        const x2 = 50 + Math.cos(angle) * 42;
        const y2 = 50 + Math.sin(angle) * 42;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#FBBF24" strokeWidth="5" strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

function CloudSVG() {
  return (
    <svg viewBox="0 0 100 60" className="w-full h-full" aria-hidden="true">
      <ellipse cx="30" cy="40" rx="20" ry="14" fill="white" />
      <ellipse cx="55" cy="32" rx="22" ry="18" fill="white" />
      <ellipse cx="75" cy="42" rx="18" ry="13" fill="white" />
      <ellipse cx="50" cy="48" rx="40" ry="10" fill="white" />
    </svg>
  );
}

function StarSVG() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
      <polygon
        points="50,5 61,38 96,38 67,58 78,92 50,72 22,92 33,58 4,38 39,38"
        fill="#FBBF24" stroke="#F59E0B" strokeWidth="3" strokeLinejoin="round"
      />
      <circle cx="40" cy="48" r="3" fill="#1F2937" />
      <circle cx="60" cy="48" r="3" fill="#1F2937" />
      <path d="M 40 60 Q 50 68 60 60" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function PencilSVG() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
      <g transform="rotate(-30 50 50)">
        <rect x="20" y="44" width="50" height="14" fill="#FCD34D" stroke="#92400E" strokeWidth="2" />
        <polygon points="70,44 85,51 70,58" fill="#FDE68A" stroke="#92400E" strokeWidth="2" />
        <polygon points="80,48 85,51 80,54" fill="#1F2937" />
        <rect x="10" y="44" width="12" height="14" fill="#F87171" stroke="#92400E" strokeWidth="2" />
      </g>
    </svg>
  );
}

function KidWithBookSVG() {
  return (
    <svg viewBox="0 0 220 220" className="w-full h-full" aria-hidden="true">
      <ellipse cx="110" cy="200" rx="70" ry="12" fill="#0000001a" />
      <path d="M 60 200 L 60 130 Q 60 110 80 110 L 140 110 Q 160 110 160 130 L 160 200 Z"
            fill="#A78BFA" stroke="#7C3AED" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="110" cy="80" r="40" fill="#FED7AA" stroke="#9A3412" strokeWidth="3" />
      <path d="M 70 60 Q 110 30 150 60 Q 145 50 140 45 Q 110 35 80 45 Q 75 50 70 60 Z" fill="#7C2D12" />
      <circle cx="95" cy="80" r="4.5" fill="#1F2937" />
      <circle cx="125" cy="80" r="4.5" fill="#1F2937" />
      <circle cx="96" cy="78" r="1.5" fill="white" />
      <circle cx="126" cy="78" r="1.5" fill="white" />
      <path d="M 95 95 Q 110 108 125 95" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="82" cy="92" r="5" fill="#F9A8D4" opacity="0.7" />
      <circle cx="138" cy="92" r="5" fill="#F9A8D4" opacity="0.7" />
      <g>
        <path d="M 60 150 L 110 145 L 160 150 L 160 180 L 110 175 L 60 180 Z"
              fill="white" stroke="#1F2937" strokeWidth="3" strokeLinejoin="round" />
        <line x1="110" y1="145" x2="110" y2="175" stroke="#1F2937" strokeWidth="2" />
        <line x1="75" y1="158" x2="100" y2="156" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="75" y1="166" x2="100" y2="164" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="120" y1="156" x2="145" y2="158" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <line x1="120" y1="164" x2="145" y2="166" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <ellipse cx="60" cy="155" rx="10" ry="14" fill="#FED7AA" stroke="#9A3412" strokeWidth="3" />
      <ellipse cx="160" cy="155" rx="10" ry="14" fill="#FED7AA" stroke="#9A3412" strokeWidth="3" />
    </svg>
  );
}

```

---

## src/pages/Login.jsx

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import ValidatedField from '../components/ValidatedField';
import { validateEmail } from '../utils/validate';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    const ee = validateEmail(email);
    setEmailErr(ee);
    if (ee) return;

    setLoading(true);
    try {
      const data = await login(email, password);
      nav(`/${data.role}`);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card">
        <h1 className="text-xl font-semibold mb-4">{t('login')}</h1>
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          <ValidatedField label={t('email')} type="email" required autoComplete="email"
            value={email} onChange={setEmail}
            error={emailErr} />
          <div>
            <label className="block text-sm mb-1">{t('password')}</label>
            <input type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input" />
            <Link to="/forgot-password" className="text-xs text-slate-500 hover:underline block mt-1">
              {t('forgotPassword')}
            </Link>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={loading} className="btn btn-primary w-full">
            {loading ? t('loading') : t('login')}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-sm">
          <span className="text-slate-500 me-2">{t('needAccount')}</span>
          <Link to="/register" className="font-medium hover:underline" style={{ color: 'rgb(var(--accent))' }}>
            {t('register')}
          </Link>
        </div>
      </div>
    </div>
  );
}

```

---

## src/pages/NewsDetail.jsx

```jsx
export { NewsDetail as default } from './_NewsShared';

```

---

## src/pages/NewsList.jsx

```jsx
export { NewsList as default } from './_NewsShared';

```

---

## src/pages/parent/ChildDetail.jsx

```jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import MultiLangInput from '../../components/MultiLangInput';

/**
 * Parent's view of a single child:
 *   - profile basics
 *   - exam results
 *   - notes timeline (all visible to the parent — admin / teacher / parent)
 *   - "add note" form (text + optional image/video upload)
 *
 * Backend visibility rules already enforce parent-only-own-children, so a
 * parent who hand-tampers the URL still cannot read another child.
 */
export default function ParentChildDetail() {
  const { id } = useParams();
  const { t, ml } = useLang();

  const [child, setChild] = useState(null);
  const [results, setResults] = useState([]);
  const [notes, setNotes] = useState([]);
  const [err, setErr] = useState('');

  // Add-note form state
  const [noteText, setNoteText] = useState({ en: '', ar: '', nl: '' });
  const [noteImage, setNoteImage] = useState('');
  const [noteVideo, setNoteVideo] = useState('');
  const [posting, setPosting] = useState(false);

  const loadAll = async () => {
    setErr('');
    try {
      const [c, r, n] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/exam-results/student/${id}`),
        api.get(`/notes/student/${id}`),
      ]);
      setChild(c.data); setResults(r.data); setNotes(n.data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);

  const upload = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    const { data } = await api.post('/upload', fd);
    return data.url;
  };

  const onAddNote = async (e) => {
    e.preventDefault();
    setPosting(true); setErr('');
    try {
      await api.post('/notes', {
        student: id,
        scope: 'general',
        text: noteText,
        imageUrl: noteImage,
        videoUrl: noteVideo,
      });
      setNoteText({ en: '', ar: '', nl: '' });
      setNoteImage(''); setNoteVideo('');
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setPosting(false);
    }
  };

  if (err && !child) return <div className="text-red-600">{err}</div>;
  if (!child) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link to="/parent/children" className="text-sm text-slate-500 hover:underline">← {t('back')}</Link>

      {/* Profile */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-2xl">
          {child.photo ? <img src={child.photo} alt="" className="w-full h-full object-cover" /> : '👤'}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{child.firstName} {child.lastName}</h1>
          <p className="text-sm text-slate-500">
            {t('level')} {child.level} · {child.email}
          </p>
        </div>
      </div>

      {/* Exam results */}
      <section>
        <h2 className="font-semibold mb-2">{t('myResults')}</h2>
        {results.length === 0 ? (
          <div className="card text-slate-500">—</div>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r._id} className="card flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center"
                  style={{ backgroundColor: r.passed ? '#16a34a' : '#dc2626' }}
                >
                  {r.percentage}%
                </div>
                <div className="flex-1">
                  <p className="font-medium">{r.exam ? ml(r.exam.title) : '—'}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(r.submittedAt).toLocaleString()} · {r.totalScore}/{r.maxScore}
                  </p>
                </div>
                <span className={'text-xs ' + (r.passed ? 'text-green-600' : 'text-red-600')}>
                  {r.passed ? t('examPassed') : t('examFailed')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      <section>
        <h2 className="font-semibold mb-2">{t('notes')}</h2>

        <form onSubmit={onAddNote} className="card space-y-3">
          <p className="text-sm font-medium">{t('addNote')}</p>
          <MultiLangInput value={noteText} onChange={setNoteText} multiline placeholder={t('note')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <UploadField label={t('photo')} accept="image/*" value={noteImage} onChange={setNoteImage} upload={upload} />
            <UploadField label="Video" accept="video/*" value={noteVideo} onChange={setNoteVideo} upload={upload} />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={posting} className="btn btn-primary">
            {posting ? t('loading') : t('add')}
          </button>
        </form>

        <div className="space-y-2 mt-3">
          {notes.length === 0 && <div className="card text-slate-500">—</div>}
          {notes.map((n) => (
            <div key={n._id} className="card">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{n.authorName} · {n.authorRole}</span>
                <span>{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {ml(n.text) && <p className="whitespace-pre-wrap">{ml(n.text)}</p>}
              {n.imageUrl && <img src={n.imageUrl} alt="" className="mt-2 max-h-48 rounded" />}
              {n.videoUrl && <video src={n.videoUrl} controls className="mt-2 max-h-48 rounded w-full" />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function UploadField({ label, accept, value, onChange, upload }) {
  const [busy, setBusy] = useState(false);
  const onPick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { onChange(await upload(f)); } finally { setBusy(false); }
  };
  return (
    <label className="block">
      <span className="block text-xs mb-1">{label}</span>
      <input type="file" accept={accept} onChange={onPick} className="text-sm" />
      {busy && <span className="text-xs text-slate-500"> …</span>}
      {value && <p className="text-xs text-slate-500 truncate">{value}</p>}
    </label>
  );
}

```

---

## src/pages/parent/Children.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';

export default function ParentChildren() {
  const { t } = useLang();
  const [children, setChildren] = useState([]);

  useEffect(() => { api.get('/parents/me/children').then((r) => setChildren(r.data)); }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('myChildren')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children.length === 0 && <div className="card text-slate-500">—</div>}
        {children.map((c) => (
          <Link key={c._id} to={`/parent/children/${c._id}`} className="card flex items-center gap-4 hover:shadow-md transition">
            <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-xl">
              {c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover" /> : '👤'}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{c.firstName} {c.lastName}</p>
              <p className="text-xs text-slate-500">{t('level')} {c.level}</p>
            </div>
            <span className="text-slate-400">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

```

---

## src/pages/parent/Dashboard.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function ParentDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [children, setChildren] = useState([]);

  useEffect(() => {
    api.get('/parents/me/children')
      .then((r) => setChildren(r.data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('welcomeBack')}, {user?.firstName}</h1>
        <p className="text-slate-500">{t('parent')}</p>
      </div>

      <Link to="/parent/children" className="card hover:shadow-md transition block">
        <div className="text-sm text-slate-500">{t('myChildren')}</div>
        <div className="text-3xl font-semibold">{children.length}</div>
        <p className="text-xs text-slate-500 mt-1">
          {children.map((c) => `${c.firstName} ${c.lastName}`).join(' · ') || '—'}
        </p>
      </Link>
    </div>
  );
}

```

---

## src/pages/parent/ExamResultDetail.jsx

```jsx
import ExamResultDetail from '../../components/ExamResultDetail';

export default function ParentExamResultDetail() {
  return <ExamResultDetail backTo="/parent/exam-results" />;
}

```

---

## src/pages/parent/ExamResults.jsx

```jsx
import ExamResultsBrowser from '../../components/ExamResultsBrowser';
import { useLang } from '../../context/LanguageContext';

export default function ParentExamResults() {
  const { t } = useLang();
  return <ExamResultsBrowser title={t('myResults')} detailPathPrefix="/parent/exam-results" />;
}

```

---

## src/pages/parent/Exams.jsx

```jsx
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';

export default function ParentExams() {
  const { t, ml } = useLang();
  const [exams, setExams] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/exams')
      .then((r) => setExams(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [t]);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('exams')}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exams.length === 0 && <div className="card text-slate-500">—</div>}
        {exams.map((e) => (
          <div key={e._id} className="card">
            <h3 className="font-semibold">{ml(e.title)}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {e.section} · {t('level')} {e.level}
              {e.type === 'unit' ? ' · 🎓' : ''}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {e.questions?.length || 0} questions · pass ≥ {e.passingGrade}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

```

---

## src/pages/parent/Homeworks.jsx

```jsx
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';
import MultiLangInput from '../../components/MultiLangInput';
import HomeworkStatusBadge from '../../components/HomeworkStatusBadge';
import Avatar from '../../components/Avatar';

/**
 * Parent's homework view. We load:
 *   - the parent's children
 *   - all homeworks visible to the parent (their level)
 *   - submissions per (child, homework) — fetched lazily inside the row
 *
 * For book-reading homeworks the parent can leave a note that flips the
 * homework into "confirmed by parent" state. Other kinds are read-only
 * here — a parent can see their child's work but doesn't grade it.
 */
export default function ParentHomeworks() {
  const { t, ml } = useLang();
  const dialog = useDialog();
  const [children, setChildren] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [c, h] = await Promise.all([
          api.get('/parents/me/children'),
          api.get('/homeworks'),
        ]);
        setChildren(c.data);
        setHomeworks(h.data);
      } catch (e) {
        setErr(e.response?.data?.message || t('error'));
      } finally {
        setBusy(false);
      }
    })();
  }, [t]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (busy) return <p className="text-slate-500">{t('loading')}</p>;

  // Build a flat list of (child, homework) pairs so each row is clear.
  const pairs = [];
  for (const child of children) {
    for (const hw of homeworks) {
      if (hw.level === child.level) {
        pairs.push({ child, hw });
      }
    }
  }

  if (pairs.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">{t('homeworks')}</h1>
        <div className="card text-slate-500">{t('noHomework')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('homeworks')}</h1>
      <div className="space-y-2">
        {pairs.map(({ child, hw }) => (
          <ParentHomeworkRow
            key={`${child._id}-${hw._id}`}
            child={child}
            hw={hw}
            t={t}
            ml={ml}
            onSavedNote={() => dialog.notify({ variant: 'success', title: t('parentNoteSaved') })}
          />
        ))}
      </div>
    </div>
  );
}

function ParentHomeworkRow({ child, hw, t, ml, onSavedNote }) {
  // Each row independently fetches the submission for this (child, hw).
  // Cheap; saves us a complicated nested aggregate on the server.
  const [submission, setSubmission] = useState(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState({ en: '', ar: '', nl: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/homeworks/${hw._id}/submission`, {
          params: { student: child._id },
        });
        if (!alive) return;
        if (data) {
          setSubmission(data);
          if (data.parentNote) setNote(data.parentNote);
        }
      } catch {
        // Quiet — "no submission yet" is the common case.
      }
    })();
    return () => { alive = false; };
  }, [hw._id, child._id]);

  const onSave = async () => {
    setSaving(true); setErr('');
    try {
      const { data } = await api.post(`/homeworks/${hw._id}/parent-note`, {
        studentId: child._id,
        note,
      });
      setSubmission(data);
      setOpen(false);
      onSavedNote();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setSaving(false); }
  };

  const tint =
    child.gender === 'female'
      ? 'bg-pink-50 dark:bg-pink-950/30'
      : 'bg-blue-50 dark:bg-blue-950/30';

  const kindIcon =
    hw.kind === 'writing' ? '✍️'
    : hw.kind === 'recordedReading' ? '🎙️'
    : '📖';

  return (
    <div className={'card space-y-2 ' + tint}>
      <div className="flex items-start gap-3">
        <Avatar user={child} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{child.firstName} {child.lastName}</p>
          <p className="text-sm">
            <span className="me-2">{kindIcon}</span>
            <span className="font-semibold">{ml(hw.title)}</span>
          </p>
          {hw.dueDate && (
            <p className="text-xs text-slate-500">
              {t('dueDate')}: {new Date(hw.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <HomeworkStatusBadge homework={hw} submission={submission} />
      </div>

      {ml(hw.instructions) && (
        <p className="text-sm text-slate-700 dark:text-slate-300">{ml(hw.instructions)}</p>
      )}

      {/* Recorded reading — let the parent listen to the recording */}
      {hw.kind === 'recordedReading' && submission?.audioUrl && (
        <audio src={submission.audioUrl} controls className="w-full" />
      )}

      {/* Book reading — parent leaves a note */}
      {hw.kind === 'bookReading' && (
        <>
          {submission?.confirmedByParent && !open && (
            <div className="text-sm">
              <p className="font-medium text-green-700 dark:text-green-300">{t('parentConfirmed')} ✓</p>
              {ml(submission.parentNote) && (
                <p className="italic mt-1">{ml(submission.parentNote)}</p>
              )}
              <button
                type="button"
                className="btn btn-ghost text-xs mt-1"
                onClick={() => setOpen(true)}
              >
                {t('edit')}
              </button>
            </div>
          )}
          {(!submission?.confirmedByParent || open) && (
            <div className="space-y-2">
              <MultiLangInput value={note} onChange={setNote} multiline />
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={onSave}
                >
                  {saving ? t('loading') : t('leaveParentNote')}
                </button>
                {open && (
                  <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                    {t('cancel')}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

```

---

## src/pages/Profile.jsx

```jsx
import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import ValidatedField from '../components/ValidatedField';
import PhoneInput from '../components/PhoneInput';
import { validateEmail, validateName, validatePhone, runValidators } from '../utils/validate';

export default function Profile() {
  const { user, role, updateUser } = useAuth();
  const { t } = useLang();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    photo: user?.photo || '',
  });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    const errs = runValidators({
      firstName: () => validateName(form.firstName),
      lastName:  () => validateName(form.lastName),
      email:     () => validateEmail(form.email),
      phone:     () => validatePhone(form.phone, { required: false }),
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      setMsg(t('saved'));
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  const onResetPwd = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await api.post('/auth/reset-password', pwd);
      setPwd({ currentPassword: '', newPassword: '' });
      setMsg(t('saved'));
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/upload', fd);
      set('photo', data.url);
    } catch (err) {
      setErr(err.response?.data?.message || t('error'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{t('profile')}</h1>
      <p className="text-sm text-slate-500">{t(role)}</p>

      <form onSubmit={onSave} noValidate className="card space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : null}
          </div>
          <input type="file" accept="image/*" onChange={onUpload} className="text-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ValidatedField label={t('firstName')} required
            value={form.firstName} onChange={(v) => set('firstName', v)}
            error={errors.firstName} />
          <ValidatedField label={t('lastName')} required
            value={form.lastName} onChange={(v) => set('lastName', v)}
            error={errors.lastName} />
          <ValidatedField label={t('email')} type="email" required
            value={form.email} onChange={(v) => set('email', v)}
            error={errors.email} />
          <PhoneInput label={t('phone')}
            value={form.phone} onChange={(v) => set('phone', v)}
            error={errors.phone} />
        </div>

        {Object.keys(errors).length > 0 && <p className="text-sm text-red-600">{t('errFixForm')}</p>}
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}

        <button className="btn btn-primary">{t('save')}</button>
      </form>

      <form onSubmit={onResetPwd} className="card space-y-3">
        <h2 className="font-semibold">{t('resetPassword')}</h2>
        <label className="block">
          <span className="block text-sm mb-1">{t('currentPassword')}</span>
          <input type="password" className="input"
                 value={pwd.currentPassword}
                 onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('newPassword')}</span>
          <input type="password" className="input"
                 value={pwd.newPassword}
                 onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} />
        </label>
        <button className="btn btn-primary">{t('save')}</button>
      </form>
    </div>
  );
}

```

---

## src/pages/Register.jsx

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import ValidatedField from '../components/ValidatedField';
import PhoneInput from '../components/PhoneInput';
import {
  validateEmail, validatePhone, validateName, runValidators,
} from '../utils/validate';

/**
 * Public registration form. Validates email, phone (parent only — optional),
 * first names and last names for both parent and student. Errors are
 * displayed inline and block submission until cleared.
 */
export default function Register() {
  const { t } = useLang();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const [errors, setErrors] = useState({});

  const [parent, setParent] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [student, setStudent] = useState({ firstName: '', lastName: '', email: '', level: 'A', gender: 'male' });
  const [message, setMessage] = useState('');

  const setP = (k, v) => setParent((p) => ({ ...p, [k]: v }));
  const setS = (k, v) => setStudent((s) => ({ ...s, [k]: v }));

  // Build the full set of validators. Re-evaluated each call; cheap.
  const validate = () => runValidators({
    'parent.firstName': () => validateName(parent.firstName),
    'parent.lastName':  () => validateName(parent.lastName),
    'parent.email':     () => validateEmail(parent.email),
    'parent.phone':     () => validatePhone(parent.phone, { required: false }),
    'student.firstName': () => validateName(student.firstName),
    'student.lastName':  () => validateName(student.lastName),
    'student.email':     () => validateEmail(student.email),
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerErr('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await api.post('/registrations', { parent, student, message });
      setSubmitted(true);
    } catch (e) {
      setServerErr(e.response?.data?.message || t('error'));
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="card text-center">
          <h1 className="text-xl font-semibold mb-2">{t('registerThanksTitle')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            {t('registerThanksText')}
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/" className="btn btn-soft">{t('home')}</Link>
            <Link to="/login" className="btn btn-primary">{t('login')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-1">{t('registerTitle')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">{t('registerHelp')}</p>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="font-semibold mb-1">{t('parent')}</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ValidatedField label={t('firstName')} required
                value={parent.firstName} onChange={(v) => setP('firstName', v)}
                error={errors['parent.firstName']} />
              <ValidatedField label={t('lastName')} required
                value={parent.lastName} onChange={(v) => setP('lastName', v)}
                error={errors['parent.lastName']} />
              <ValidatedField label={t('email')} type="email" required autoComplete="email"
                value={parent.email} onChange={(v) => setP('email', v)}
                error={errors['parent.email']} />
              <PhoneInput label={t('phone')}
                value={parent.phone} onChange={(v) => setP('phone', v)}
                error={errors['parent.phone']} />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-semibold mb-1">{t('student')}</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ValidatedField label={t('firstName')} required
                value={student.firstName} onChange={(v) => setS('firstName', v)}
                error={errors['student.firstName']} />
              <ValidatedField label={t('lastName')} required
                value={student.lastName} onChange={(v) => setS('lastName', v)}
                error={errors['student.lastName']} />
              <ValidatedField label={t('email')} type="email" required
                value={student.email} onChange={(v) => setS('email', v)}
                error={errors['student.email']} />
              <label className="block">
                <span className="block text-sm mb-1">{t('level')}</span>
                <select className="input" value={student.level} onChange={(e) => setS('level', e.target.value)}>
                  {['A','B','C','D'].map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="block text-sm mb-1">{t('tableGender')}</span>
                <select className="input" value={student.gender} onChange={(e) => setS('gender', e.target.value)}>
                  <option value="male">male</option>
                  <option value="female">female</option>
                </select>
              </label>
            </div>
          </fieldset>

          <label className="block">
            <span className="block text-sm mb-1">{t('messageOptional')}</span>
            <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>

          {Object.keys(errors).length > 0 && (
            <p className="text-sm text-red-600">{t('errFixForm')}</p>
          )}
          {serverErr && <p className="text-sm text-red-600">{serverErr}</p>}

          <div className="flex items-center gap-3">
            <button disabled={busy} className="btn btn-primary">
              {busy ? t('loading') : t('submit')}
            </button>
            <Link to="/login" className="text-sm text-slate-500 hover:underline">
              {t('backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

```

---

## src/pages/ResetPassword.jsx

```jsx
import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';

/**
 * URL: /reset-password?token=...&email=...
 * The token + email come from the email link the user clicked. We submit
 * them along with the new password to /api/auth/reset-password-with-token.
 */
export default function ResetPassword() {
  const { t } = useLang();
  const [params] = useSearchParams();
  const nav = useNavigate();

  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const missing = !token || !email;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setErr('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password-with-token', {
        email, token, newPassword: password,
      });
      nav('/login', { replace: true });
    } catch (err) {
      setErr(err.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card">
        <h1 className="text-xl font-semibold mb-2">{t('setNewPassword')}</h1>

        {missing ? (
          <>
            <p className="text-sm text-red-600 mb-3">
              The reset link is missing or malformed. Request a new one.
            </p>
            <Link to="/forgot-password" className="btn btn-soft w-full">
              {t('forgotPassword')}
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-xs text-slate-500">
              {t('email')}: <span className="font-medium">{email}</span>
            </p>
            <div>
              <label className="block text-sm mb-1">{t('newPassword')}</label>
              <input
                type="password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input" autoFocus
              />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('newPassword')} ({t('confirm') || 'confirm'})</label>
              <input
                type="password" required minLength={6}
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="input"
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={loading} className="btn btn-primary w-full">
              {loading ? t('loading') : t('save')}
            </button>
            <Link to="/login" className="block text-center text-sm text-slate-500 hover:underline">
              {t('backToLogin')}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

```

---

## src/pages/student/Dashboard.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [lessons, setLessons] = useState([]);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);

  useEffect(() => {
    api.get('/lessons').then((r) => setLessons(r.data)).catch(() => {});
    api.get('/exams').then((r) => setExams(r.data)).catch(() => {});
    if (user?._id) {
      api.get(`/exam-results/student/${user._id}`).then((r) => setResults(r.data)).catch(() => {});
    }
  }, [user?._id]);

  const unlocked = lessons.filter((l) => !l.locked);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {t('welcomeBack')}, {user?.firstName}
        </h1>
        <p className="text-slate-500">{t('level')}: {user?.level}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label={t('myLessons')} value={`${unlocked.length}/${lessons.length}`} to="/student/lessons" />
        <Stat label={t('myExams')} value={exams.length} to="/student/exams" />
        <Stat label={t('myResults')} value={results.length} to="/student/results" />
      </div>
    </div>
  );
}

function Stat({ label, value, to }) {
  return (
    <Link to={to} className="card hover:shadow-md transition">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </Link>
  );
}

```

---

## src/pages/student/Exams.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function StudentExams() {
  const { user } = useAuth();
  const { t, ml } = useLang();
  const [exams, setExams] = useState([]);
  const [resultsByExam, setResultsByExam] = useState({}); // examId -> result
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const [{ data: exams }, { data: results }] = await Promise.all([
        api.get('/exams'),
        user?._id ? api.get(`/exam-results/student/${user._id}`) : Promise.resolve({ data: [] }),
      ]);
      const map = {};
      for (const r of results) {
        const examId = r.exam?._id || r.exam;
        if (examId) map[String(examId)] = r;
      }
      setResultsByExam(map);
      setExams(exams);
      setLoading(false);
    };
    run().catch(() => setLoading(false));
  }, [user?._id]);

  if (loading) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('myExams')}</h1>
      {exams.length === 0 && <div className="card text-slate-500">—</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exams.map((e) => {
          // The server may already tell us via `alreadyTaken`; we also fall
          // back to the local results map for safety.
          const taken = e.alreadyTaken || !!resultsByExam[String(e._id)];
          const prevResult = resultsByExam[String(e._id)];
          const passed = prevResult?.passed;

          return (
            <div key={e._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{ml(e.title)}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {e.section} · {t('level')} {e.level}
                    {e.type === 'unit' ? ' · 🎓' : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {e.questions?.length || 0} questions · pass ≥ {e.passingGrade}%
                  </p>
                </div>
                {taken && (
                  <span
                    className={
                      'text-xs px-2 py-1 rounded font-medium ms-2 ' +
                      (passed
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300')
                    }
                  >
                    {prevResult ? `${prevResult.percentage}%` : '✓'}
                  </span>
                )}
              </div>

              <div className="mt-3">
                {taken ? (
                  <Link to="/student/results" className="btn btn-soft text-sm">
                    {t('myResults')}
                  </Link>
                ) : (
                  <Link to={`/student/exams/${e._id}`} className="btn btn-primary text-sm">
                    {t('startExam')}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

```

---

## src/pages/student/ExamTaker.jsx

```jsx
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

```

---

## src/pages/student/HomeworkDo.jsx

```jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';
import HomeworkStatusBadge from '../../components/HomeworkStatusBadge';

/**
 * The student's homework detail page. Branches on `kind`:
 *
 *   writing         -> list of prompts; one input per prompt; submit
 *   recordedReading -> MediaRecorder UI; upload; submit audioUrl
 *   bookReading     -> read-only instructions; tells the student a parent
 *                      will confirm via the parent app
 */
export default function StudentHomeworkDo() {
  const { id } = useParams();
  const { t, ml } = useLang();
  const dialog = useDialog();

  const [hw, setHw] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // writing state
  const [answers, setAnswers] = useState([]);
  // recorded reading state
  const [audioUrl, setAudioUrl] = useState('');

  // Submission, if any (annotated by the list endpoint, but we re-fetch to
  // get fresh state when navigating directly).
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: hwDoc }, { data: list }] = await Promise.all([
          api.get(`/homeworks/${id}`),
          api.get('/homeworks'),
        ]);
        if (!alive) return;
        setHw(hwDoc);
        const sub = list.find((h) => h._id === id)?.mySubmission || null;
        setSubmission(sub);

        // Pre-fill writing answers from a previous submission if any.
        if (hwDoc.kind === 'writing') {
          const prev = sub?.answers || [];
          setAnswers((hwDoc.prompts || []).map((_, i) => prev[i] || ''));
        }
        if (hwDoc.kind === 'recordedReading' && sub?.audioUrl) {
          setAudioUrl(sub.audioUrl);
        }
      } catch (e) {
        if (alive) setErr(e.response?.data?.message || t('error'));
      }
    })();
    return () => { alive = false; };
  }, [id, t]);

  const submitWriting = async () => {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post(`/homeworks/${id}/submit`, { answers });
      setSubmission(data);
      await dialog.notify({
        variant: 'success',
        title: t('homeworkSubmitted'),
        message: data.autoScore != null
          ? `${t('autoScore')}: ${data.autoScore}%`
          : '',
      });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  const submitRecording = async () => {
    if (!audioUrl) {
      setErr('Record audio first.');
      return;
    }
    setBusy(true); setErr('');
    try {
      const { data } = await api.post(`/homeworks/${id}/submit`, { audioUrl });
      setSubmission(data);
      await dialog.notify({ variant: 'success', title: t('homeworkSubmitted') });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  if (err && !hw) return <div className="text-red-600">{err}</div>;
  if (!hw) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link to="/student/homeworks" className="text-sm text-slate-500 hover:underline">
        ← {t('back')}
      </Link>

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{ml(hw.title)}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('level')} {hw.level}
              {hw.dueDate && ` · ${t('dueDate')}: ${new Date(hw.dueDate).toLocaleDateString()}`}
            </p>
          </div>
          <HomeworkStatusBadge homework={hw} submission={submission} />
        </div>
        {ml(hw.instructions) && (
          <p className="mt-3 whitespace-pre-wrap">{ml(hw.instructions)}</p>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {hw.kind === 'writing' && (
        <WritingTask
          hw={hw} answers={answers} setAnswers={setAnswers}
          onSubmit={submitWriting} busy={busy}
          submission={submission}
          t={t} ml={ml}
        />
      )}

      {hw.kind === 'recordedReading' && (
        <RecordingTask
          audioUrl={audioUrl} setAudioUrl={setAudioUrl}
          onSubmit={submitRecording} busy={busy}
          submission={submission}
          t={t}
        />
      )}

      {hw.kind === 'bookReading' && (
        <BookReadingTask submission={submission} t={t} ml={ml} />
      )}

      {/* Teacher feedback / score, if present */}
      {submission?.teacherScore != null && (
        <div className="card">
          <p className="text-sm">
            <span className="text-slate-500">{t('score')}:</span>{' '}
            <span className="font-semibold">{submission.teacherScore}%</span>
          </p>
          {ml(submission.teacherFeedback) && (
            <p className="text-sm mt-2 italic">{ml(submission.teacherFeedback)}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Writing -------------------------------------------------------- */

function WritingTask({ hw, answers, setAnswers, onSubmit, busy, submission, t, ml }) {
  const setAt = (i, v) =>
    setAnswers((cur) => cur.map((x, idx) => idx === i ? v : x));

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">{t('writing')}</h2>
      {(hw.prompts || []).map((p, i) => (
        <div key={i} className="space-y-1">
          <p className="font-medium text-lg" dir="rtl">{ml(p.prompt)}</p>
          <input
            className="input"
            value={answers[i] || ''}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={t('yourAnswer')}
            dir="rtl"
          />
        </div>
      ))}
      <div className="pt-2">
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={onSubmit}
        >
          {busy ? t('loading') : t('submitHomework')}
        </button>
        {submission?.autoScore != null && (
          <span className="ms-3 text-sm text-slate-500">
            {t('autoScore')}: <strong>{submission.autoScore}%</strong>
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Recorded reading ---------------------------------------------- */

/**
 * Browser MediaRecorder UI. Tap record, the browser asks for mic permission,
 * tap stop when done, an HTML <audio> appears with the recording. Clicking
 * "submit" uploads the blob to /api/upload and posts the returned URL to
 * /api/homeworks/:id/submit.
 */
function RecordingTask({ audioUrl, setAudioUrl, onSubmit, busy, submission, t }) {
  const [recording, setRecording] = useState(false);
  const [localBlobUrl, setLocalBlobUrl] = useState('');
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const start = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // webm/opus is the most reliable browser default. Falls through to
      // whatever the browser picks if unsupported.
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        // Stop tracks so the browser's mic indicator goes away.
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setLocalBlobUrl(url);
        // Upload right away — the user gets immediate feedback if upload
        // fails, and on success the audioUrl is ready for submit.
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append('file', new File([blob], `recording-${Date.now()}.webm`, { type: blob.type }));
          const { data } = await api.post('/upload', fd);
          setAudioUrl(data.url);
        } catch (e) {
          setErr(e.response?.data?.message || 'Upload failed');
        } finally {
          setUploading(false);
        }
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      setErr(e.message || 'Microphone permission denied');
    }
  };

  const stop = () => {
    if (mediaRef.current && recording) {
      mediaRef.current.stop();
      setRecording(false);
    }
  };

  const previewUrl = localBlobUrl || (audioUrl ? audioUrl : '');

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">{t('recordedReading')}</h2>

      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button type="button" className="btn btn-primary" onClick={start} disabled={uploading}>
            🎙️ {previewUrl ? t('rerecord') : t('recordAudio')}
          </button>
        ) : (
          <button type="button" className="btn" style={{ backgroundColor: '#dc2626', color: 'white' }} onClick={stop}>
            ⏹ {t('stopRecording')}
          </button>
        )}
        {recording && <span className="text-xs text-red-600">● recording…</span>}
        {uploading && <span className="text-xs text-slate-500">uploading…</span>}
      </div>

      {previewUrl && (
        <audio src={previewUrl} controls className="w-full" />
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div>
        <button
          className="btn btn-primary"
          disabled={busy || !audioUrl || uploading || recording}
          onClick={onSubmit}
        >
          {busy ? t('loading') : t('submitHomework')}
        </button>
      </div>

      {submission?.audioUrl && submission.audioUrl !== audioUrl && (
        <p className="text-xs text-slate-500">
          Previous submission: <a href={submission.audioUrl} target="_blank" rel="noreferrer" className="underline">audio</a>
        </p>
      )}
    </div>
  );
}

/* ---------- Book reading -------------------------------------------------- */

function BookReadingTask({ submission, t, ml }) {
  return (
    <div className="card space-y-2">
      <h2 className="font-semibold">{t('bookReading')}</h2>
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Read the page aloud at home. Your parent will leave a note in their app
        once you've read it.
      </p>
      {submission?.confirmedByParent && (
        <div className="mt-2 text-sm">
          <p className="font-medium">{t('parentConfirmed')} ✓</p>
          {ml(submission.parentNote) && (
            <p className="italic mt-1">{ml(submission.parentNote)}</p>
          )}
        </div>
      )}
    </div>
  );
}

```

---

## src/pages/student/Homeworks.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import HomeworkStatusBadge from '../../components/HomeworkStatusBadge';

export default function StudentHomeworks() {
  const { t, ml } = useLang();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/homeworks')
      .then((r) => setItems(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')))
      .finally(() => setBusy(false));
  }, [t]);

  const kindIcon = (k) =>
    k === 'writing' ? '✍️'
    : k === 'recordedReading' ? '🎙️'
    : k === 'bookReading' ? '📖' : '📋';

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('myHomework')}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!busy && items.length === 0 && <div className="card text-slate-500">{t('noHomework')}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((h) => (
          <Link
            key={h._id}
            to={`/student/homeworks/${h._id}`}
            className="card flex items-start gap-3 hover:shadow-md transition"
          >
            <span className="text-3xl">{kindIcon(h.kind)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{ml(h.title)}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {h.kind === 'writing' && `${(h.prompts || []).length} ${t('tableQuestions')}`}
                {h.kind === 'recordedReading' && t('recordedReading')}
                {h.kind === 'bookReading' && t('bookReading')}
                {h.dueDate && ` · ${new Date(h.dueDate).toLocaleDateString()}`}
              </p>
            </div>
            <HomeworkStatusBadge homework={h} submission={h.mySubmission} />
          </Link>
        ))}
      </div>
    </div>
  );
}

```

---

## src/pages/student/Lessons.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';

export default function StudentLessons() {
  const { t, ml } = useLang();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/lessons')
      .then((r) => setLessons(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">{t('loading')}</p>;

  // Group by section, preserving order from the server
  const bySection = {};
  for (const l of lessons) {
    const s = l.section || '_';
    bySection[s] = bySection[s] || [];
    bySection[s].push(l);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('myLessons')}</h1>
      {Object.entries(bySection).map(([section, items]) => (
        <section key={section}>
          <h2 className="text-lg font-semibold mb-2">{section}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((l) => (
              <LessonCard key={l._id} lesson={l} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LessonCard({ lesson }) {
  const { t, ml } = useLang();

  if (lesson.locked) {
    return (
      <div className="card opacity-60 cursor-not-allowed">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{ml(lesson.title)}</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
            🔒 {t('locked')}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{t('unlockHint')}</p>
      </div>
    );
  }

  return (
    <Link to={`/student/lessons/${lesson._id}`} className="card hover:shadow-md transition">
      <h3 className="font-semibold">{ml(lesson.title)}</h3>
      <p className="text-xs text-slate-500 mt-1">
        {ml(lesson.unitName) || t('unit')}
      </p>
    </Link>
  );
}

```

---

## src/pages/student/LessonView.jsx

```jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import ContentBlock from '../../components/ContentBlock';
import { groupBlocksIntoRows } from '../../components/blockLayout';

export default function LessonView() {
  const { id } = useParams();
  const { t, ml } = useLang();
  const [lesson, setLesson] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/lessons/${id}`)
      .then((r) => setLesson(r.data))
      .catch((e) => setErr(e.response?.data?.message || t('error')));
  }, [id, t]);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!lesson) return <p className="text-slate-500">{t('loading')}</p>;

  const blocks = (lesson.blocks || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const rows = groupBlocksIntoRows(blocks);

  // Inline flex on each row container — bulletproof against missing classes.
  const rowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    width: '100%',
  };

  return (
    <article className="max-w-3xl mx-auto">
      <Link to="/student/lessons" className="text-sm text-slate-500 hover:underline">
        ← {t('back')}
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">{ml(lesson.title)}</h1>
      <p className="text-sm text-slate-500 mb-4">
        {lesson.section} · {t('level')} {lesson.level}
      </p>

      {rows.map((row, idx) => (
        <div key={idx} style={rowStyle}>
          {row.items.map(({ block, widthPct }) => (
            <ContentBlock key={block._id || block.order} block={block} widthPct={widthPct} />
          ))}
        </div>
      ))}
    </article>
  );
}

```

---

## src/pages/student/Results.jsx

```jsx
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function StudentResults() {
  const { user } = useAuth();
  const { t, ml } = useLang();
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/exam-results/student/${user._id}`).then((r) => setResults(r.data));
  }, [user?._id]);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('myResults')}</h1>
      {results.length === 0 && <div className="card text-slate-500">—</div>}
      <div className="space-y-2">
        {results.map((r) => (
          <div key={r._id} className="card flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: r.passed ? '#16a34a' : '#dc2626' }}
            >
              {r.percentage}%
            </div>
            <div className="flex-1">
              <p className="font-medium">{r.exam ? ml(r.exam.title) : '—'}</p>
              <p className="text-xs text-slate-500">
                {new Date(r.submittedAt).toLocaleString()} · {r.totalScore}/{r.maxScore}
              </p>
            </div>
            <span className={'text-sm ' + (r.passed ? 'text-green-600' : 'text-red-600')}>
              {r.passed ? t('examPassed') : t('examFailed')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

```

---

## src/pages/teacher/Calendar.jsx

```jsx
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';

export default function TeacherCalendar() {
  const { t, ml } = useLang();
  const dialog = useDialog();
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    startTime: '', endTime: '', notes: '',
  });
  const [err, setErr] = useState('');

  const load = async () => {
    const { data } = await api.get('/calendar');
    setEntries(data);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Teachers can only post their own availability — the server enforces
  // `kind: 'availability'` and self-ownership regardless of what we send.
  const onPostAvailability = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post('/calendar', { ...form, kind: 'availability' });
      setForm((f) => ({ ...f, startTime: '', endTime: '', notes: '' }));
      load();
    } catch (e) { setErr(e.response?.data?.message || t('error')); }
  };

  const onDelete = async (id) => {
    const ok = await dialog.confirm({ title: t('confirmDelete'), danger: true });
    if (!ok) return;
    try { await api.delete(`/calendar/${id}`); load(); }
    catch (e) { setErr(e.response?.data?.message || t('error')); }
  };

  // Split entries: things admin assigned to me vs my own availability posts.
  const assignments = entries.filter((e) => e.kind === 'assignment');
  const availability = entries.filter((e) => e.kind === 'availability');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('calendar')}</h1>

      {/* Post availability */}
      <form onSubmit={onPostAvailability} className="card grid grid-cols-1 md:grid-cols-4 gap-3">
        <h2 className="md:col-span-4 font-semibold">Post my availability</h2>
        <label className="block">
          <span className="block text-sm mb-1">Date</span>
          <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">From</span>
          <input type="time" className="input" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">To</span>
          <input type="time" className="input" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Notes</span>
          <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
        {err && <p className="text-sm text-red-600 md:col-span-4">{err}</p>}
        <div className="md:col-span-4">
          <button className="btn btn-primary">{t('add')}</button>
        </div>
      </form>

      {/* Assignments to me */}
      <section>
        <h2 className="font-semibold mb-2">Assignments</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="text-start px-3 py-2">{t('tableDate')}</th>
                <th className="text-start px-3 py-2">{t('tableTime')}</th>
                <th className="text-start px-3 py-2">{t('lessons')}</th>
                <th className="text-start px-3 py-2">{t('tableTitle')}</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">—</td></tr>}
              {assignments.map((e) => (
                <tr key={e._id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{e.startTime || '—'} – {e.endTime || '—'}</td>
                  <td className="px-3 py-2">
                    {(e.lessons || []).map((l) => ml(l.title) || l.section).filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2">{e.title || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* My availability */}
      <section>
        <h2 className="font-semibold mb-2">My availability</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="text-start px-3 py-2">{t('tableDate')}</th>
                <th className="text-start px-3 py-2">{t('tableTime')}</th>
                <th className="text-start px-3 py-2">{t('notes')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {availability.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">—</td></tr>}
              {availability.map((e) => (
                <tr key={e._id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{e.startTime || '—'} – {e.endTime || '—'}</td>
                  <td className="px-3 py-2">{e.notes || '—'}</td>
                  <td className="px-3 py-2 text-end">
                    <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(e._id)}>{t('delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

```

---

## src/pages/teacher/Dashboard.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [counts, setCounts] = useState({ lessons: 0, exams: 0 });

  useEffect(() => {
    Promise.all([api.get('/lessons'), api.get('/exams')])
      .then(([l, e]) => setCounts({ lessons: l.data.length, exams: e.data.length }))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('welcomeBack')}, {user?.firstName}</h1>
        <p className="text-slate-500">{t('teacher')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/teacher/lessons" className="card hover:shadow-md">
          <div className="text-sm text-slate-500">{t('myLessons')}</div>
          <div className="text-3xl font-semibold">{counts.lessons}</div>
        </Link>
        <Link to="/teacher/exams" className="card hover:shadow-md">
          <div className="text-sm text-slate-500">{t('myExams')}</div>
          <div className="text-3xl font-semibold">{counts.exams}</div>
        </Link>
        <Link to="/teacher/calendar" className="card hover:shadow-md">
          <div className="text-sm text-slate-500">{t('calendar')}</div>
          <div className="text-3xl font-semibold">→</div>
        </Link>
      </div>
    </div>
  );
}

```

---

## src/pages/teacher/ExamResultDetail.jsx

```jsx
import ExamResultDetail from '../../components/ExamResultDetail';

export default function TeacherExamResultDetail() {
  return <ExamResultDetail backTo="/teacher/exam-results" />;
}

```

---

## src/pages/teacher/ExamResults.jsx

```jsx
import ExamResultsBrowser from '../../components/ExamResultsBrowser';
import { useLang } from '../../context/LanguageContext';

export default function TeacherExamResults() {
  const { t } = useLang();
  return <ExamResultsBrowser title={t('myResults')} detailPathPrefix="/teacher/exam-results" />;
}

```

---

## src/pages/teacher/Exams.jsx

```jsx
import CrudTable from '../../components/CrudTable';
import ExamForm from '../../components/ExamForm';
import { useLang } from '../../context/LanguageContext';

const empty = {
  title: { en: '', ar: '', nl: '' },
  section: 'Arabic',
  level: 'A',
  type: 'lessons',
  passingGrade: 50,
  questions: [],
};

export default function TeacherExams() {
  const { t, ml } = useLang();
  return (
    <CrudTable
      title={t('myExams')}
      endpoint="/exams"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('section'), render: (it) => it.section },
        { label: t('level'), render: (it) => it.level },
        { label: t('tableQ'), render: (it) => (it.questions || []).length },
      ]}
      Form={ExamForm}
    />
  );
}

```

---

## src/pages/teacher/Homeworks.jsx

```jsx
import { useNavigate } from 'react-router-dom';
import CrudTable from '../../components/CrudTable';
import HomeworkForm from '../../components/HomeworkForm';
import { useLang } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const empty = {
  kind: 'writing',
  title: { en: '', ar: '', nl: '' },
  instructions: { en: '', ar: '', nl: '' },
  level: 'A',
  dueDate: '',
  prompts: [],
};

export default function TeacherHomeworks() {
  const { t, ml } = useLang();
  const { user } = useAuth();
  const nav = useNavigate();

  const kindLabel = (k) =>
    k === 'writing' ? t('writing')
    : k === 'recordedReading' ? t('recordedReading')
    : k === 'bookReading' ? t('bookReading')
    : k;

  // Teachers can edit / delete only homeworks they created themselves.
  // The server enforces this regardless; hiding the buttons keeps the UI
  // honest so other teachers' rows just look read-only.
  const canModify = (it) => {
    const teacherId = it.teacher?._id || it.teacher;
    return String(teacherId) === String(user?._id);
  };

  return (
    <CrudTable
      title={t('homeworks')}
      endpoint="/homeworks"
      emptyForm={empty}
      canModify={canModify}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('kind'),       render: (it) => kindLabel(it.kind) },
        { label: t('level'),      render: (it) => it.level },
        { label: t('teacher'),    render: (it) =>
            it.teacher
              ? `${it.teacher.firstName || ''} ${it.teacher.lastName || ''}`.trim() || '—'
              : '—' },
        { label: t('dueDate'),    render: (it) => it.dueDate ? new Date(it.dueDate).toLocaleDateString() : '—' },
      ]}
      Form={HomeworkForm}
      extraRowActions={(it) => (
        <button
          className="btn btn-primary text-xs"
          onClick={() => nav(`/teacher/homeworks/${it._id}/submissions`)}
          title={t('submissions')}
        >
          {t('submissions')}
        </button>
      )}
    />
  );
}

```

---

## src/pages/teacher/HomeworkSubmissions.jsx

```jsx
import HomeworkSubmissionsView from '../../components/HomeworkSubmissionsView';
import { useLang } from '../../context/LanguageContext';

export default function TeacherHomeworkSubmissions() {
  const { t } = useLang();
  return <HomeworkSubmissionsView backTo="/teacher/homeworks" backLabel={t('homeworks')} />;
}

```

---

## src/pages/teacher/Lessons.jsx

```jsx
import CrudTable from '../../components/CrudTable';
import LessonForm from '../../components/LessonForm';
import { useLang } from '../../context/LanguageContext';

const empty = {
  title: { en: '', ar: '', nl: '' },
  unitName: { en: '', ar: '', nl: '' },
  section: 'Arabic',
  level: 'A',
  order: 0,
  blocks: [],
};

export default function TeacherLessons() {
  const { t, ml } = useLang();
  return (
    <CrudTable
      title={t('myLessons')}
      endpoint="/lessons"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('section'), render: (it) => it.section },
        { label: t('level'), render: (it) => it.level },
        { label: t('tableBlocks'), render: (it) => (it.blocks || []).length },
      ]}
      Form={LessonForm}
    />
  );
}

```

---

## src/pages/teacher/StudentNotes.jsx

```jsx
import StudentNotesView from '../../components/StudentNotesView';
import { useLang } from '../../context/LanguageContext';

export default function TeacherStudentNotes() {
  const { t } = useLang();
  return <StudentNotesView backTo="/teacher/students" backLabel={t('students')} />;
}

```

---

## src/pages/teacher/Students.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Avatar from '../../components/Avatar';
import UserFilterBar from '../../components/UserFilterBar';
import { useLang } from '../../context/LanguageContext';

/**
 * Teachers use this page to find a student and open their notes / progress
 * view. Read-only — teachers don't create or delete students.
 */
export default function TeacherStudents() {
  const { t } = useLang();
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ q: '', gender: '' });
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.gender) params.gender = filters.gender;
      const { data } = await api.get('/students', { params });
      setStudents(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters)]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('students')}</h1>

      <UserFilterBar value={filters} onChange={setFilters} withGender />

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2">{t('photo')}</th>
              <th className="text-start px-3 py-2">{t('firstName')}</th>
              <th className="text-start px-3 py-2">{t('lastName')}</th>
              <th className="text-start px-3 py-2">{t('email')}</th>
              <th className="text-start px-3 py-2">{t('level')}</th>
              <th className="text-start px-3 py-2">{t('tableGender')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">—</td></tr>}
            {students.map((s) => (
              <tr
                key={s._id}
                className={
                  'border-t border-slate-200 dark:border-slate-800 ' +
                  (s.gender === 'female'
                    ? 'bg-pink-50 dark:bg-pink-950/30'
                    : 'bg-blue-50 dark:bg-blue-950/30')
                }
              >
                <td className="px-3 py-2"><Avatar user={s} size={36} /></td>
                <td className="px-3 py-2">{s.firstName}</td>
                <td className="px-3 py-2">{s.lastName}</td>
                <td className="px-3 py-2">{s.email}</td>
                <td className="px-3 py-2">{s.level}</td>
                <td className="px-3 py-2">
                  <span className={
                    'text-xs px-2 py-0.5 rounded ' +
                    (s.gender === 'female'
                      ? 'bg-pink-200 text-pink-900 dark:bg-pink-900/50 dark:text-pink-200'
                      : 'bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200')
                  }>
                    {s.gender || 'male'}
                  </span>
                </td>
                <td className="px-3 py-2 text-end">
                  <Link to={`/teacher/students/${s._id}/notes`} className="btn btn-primary text-xs">
                    {t('notes')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

```

---

## src/pages/_NewsShared.jsx

```jsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import ContentBlock from '../components/ContentBlock';
import { groupBlocksIntoRows } from '../components/blockLayout';

export function NewsList() {
  const { t, ml } = useLang();
  const [news, setNews] = useState([]);
  useEffect(() => { api.get('/news').then((r) => setNews(r.data)); }, []);

  if (news.length === 0) return <p className="text-slate-500">{t('noNews')}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {news.map((n) => (
        <Link key={n._id} to={`/news/${n._id}`} className="card hover:shadow-md">
          {n.coverImage && (
            <img src={n.coverImage} alt="" className="w-full h-32 object-cover rounded mb-2" />
          )}
          <h3 className="font-semibold">{ml(n.title)}</h3>
          <p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</p>
        </Link>
      ))}
    </div>
  );
}

export function NewsDetail() {
  const { id } = useParams();
  const { ml } = useLang();
  const [item, setItem] = useState(null);

  useEffect(() => { api.get(`/news/${id}`).then((r) => setItem(r.data)); }, [id]);
  if (!item) return null;

  const blocks = (item.blocks || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const rows = groupBlocksIntoRows(blocks);

  const rowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    width: '100%',
  };

  return (
    <article className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{ml(item.title)}</h1>
      <p className="text-sm text-slate-500 mb-4">{new Date(item.createdAt).toLocaleDateString()}</p>
      {rows.map((row, idx) => (
        <div key={idx} style={rowStyle}>
          {row.items.map(({ block, widthPct }) => (
            <ContentBlock key={block._id || block.order} block={block} widthPct={widthPct} />
          ))}
        </div>
      ))}
    </article>
  );
}

export default NewsList;

```

---

## src/utils/validate.js

```javascript
import { isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validation helpers. Each function returns:
 *   - '' if the value is valid
 *   - a translation key (e.g. 'errEmailFormat') if invalid
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Unicode-aware: allows letters from any script, plus spaces, hyphens,
// apostrophes, dots. 1-60 characters. Matches Arabic, Dutch with diacritics,
// hyphenated names, etc.
const NAME_RE = /^[\p{L}][\p{L}\s'’\-\.]{0,59}$/u;

export function validateEmail(value, { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'errRequired' : '';
  if (!EMAIL_RE.test(v)) return 'errEmailFormat';
  return '';
}

export function validateName(value, { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'errRequired' : '';
  if (!NAME_RE.test(v)) return 'errNameFormat';
  return '';
}

/**
 * Phone validator. Expects an E.164-style number (e.g. "+32498123456").
 * Uses libphonenumber-js for proper per-country validation — knows the
 * length and prefix rules for every country.
 *
 *   ''     valid
 *   key    error translation key
 *
 * If `required` is false, an empty value passes.
 */
export function validatePhone(value, { required = false } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'errRequired' : '';
  // Accept either a full E.164 number, or a "+CC ..." form. The library
  // will refuse anything that doesn't start with + as missing country.
  if (!v.startsWith('+')) return 'errPhoneNeedsCountry';
  try {
    if (!isValidPhoneNumber(v)) return 'errPhoneFormat';
  } catch {
    return 'errPhoneFormat';
  }
  return '';
}

/**
 * Run a set of validators and return a { fieldName: errKey } map. Fields
 * with no error are omitted.
 */
export function runValidators(validators) {
  const errors = {};
  for (const [field, fn] of Object.entries(validators)) {
    const err = fn();
    if (err) errors[field] = err;
  }
  return errors;
}

```

---

## src/App.jsx

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';

import StudentDashboard from './pages/student/Dashboard';
import StudentLessons from './pages/student/Lessons';
import LessonView from './pages/student/LessonView';
import StudentExams from './pages/student/Exams';
import ExamTaker from './pages/student/ExamTaker';
import StudentResults from './pages/student/Results';
import StudentHomeworks from './pages/student/Homeworks';
import StudentHomeworkDo from './pages/student/HomeworkDo';

import AdminDashboard from './pages/admin/Dashboard';
import AdminTeachers from './pages/admin/Teachers';
import AdminParents from './pages/admin/Parents';
import AdminStudents from './pages/admin/Students';
import AdminStudentNotes from './pages/admin/StudentNotes';
import AdminLessons from './pages/admin/Lessons';
import AdminExams from './pages/admin/Exams';
import AdminExamResults from './pages/admin/ExamResults';
import AdminExamResultDetail from './pages/admin/ExamResultDetail';
import AdminNews from './pages/admin/News';
import AdminPayments from './pages/admin/Payments';
import AdminCalendar from './pages/admin/Calendar';
import AdminAttendance from './pages/admin/Attendance';
import AdminTeacherAttendance from './pages/admin/TeacherAttendance';
import AdminHomeworks from './pages/admin/Homeworks';
import AdminHomeworkSubmissions from './pages/admin/HomeworkSubmissions';
import AdminRegistrations from './pages/admin/Registrations';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherLessons from './pages/teacher/Lessons';
import TeacherExams from './pages/teacher/Exams';
import TeacherExamResults from './pages/teacher/ExamResults';
import TeacherExamResultDetail from './pages/teacher/ExamResultDetail';
import TeacherStudents from './pages/teacher/Students';
import TeacherStudentNotes from './pages/teacher/StudentNotes';
import TeacherCalendar from './pages/teacher/Calendar';
import TeacherHomeworks from './pages/teacher/Homeworks';
import TeacherHomeworkSubmissions from './pages/teacher/HomeworkSubmissions';

import ParentDashboard from './pages/parent/Dashboard';
import ParentChildren from './pages/parent/Children';
import ParentChildDetail from './pages/parent/ChildDetail';
import ParentExams from './pages/parent/Exams';
import ParentExamResults from './pages/parent/ExamResults';
import ParentExamResultDetail from './pages/parent/ExamResultDetail';
import ParentHomeworks from './pages/parent/Homeworks';

function HomeRedirect() {
  // Logged-in users land on their role dashboard; others see the public landing.
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Landing />;
  return <Navigate to={`/${role}`} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/news" element={<NewsList />} />
          <Route path="/news/:id" element={<NewsDetail />} />

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/lessons" element={<ProtectedRoute roles={['student']}><StudentLessons /></ProtectedRoute>} />
          <Route path="/student/lessons/:id" element={<ProtectedRoute roles={['student']}><LessonView /></ProtectedRoute>} />
          <Route path="/student/exams" element={<ProtectedRoute roles={['student']}><StudentExams /></ProtectedRoute>} />
          <Route path="/student/exams/:id" element={<ProtectedRoute roles={['student']}><ExamTaker /></ProtectedRoute>} />
          <Route path="/student/results" element={<ProtectedRoute roles={['student']}><StudentResults /></ProtectedRoute>} />
          <Route path="/student/homeworks" element={<ProtectedRoute roles={['student']}><StudentHomeworks /></ProtectedRoute>} />
          <Route path="/student/homeworks/:id" element={<ProtectedRoute roles={['student']}><StudentHomeworkDo /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute roles={['admin']}><AdminTeachers /></ProtectedRoute>} />
          <Route path="/admin/parents" element={<ProtectedRoute roles={['admin']}><AdminParents /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/students/:id/notes" element={<ProtectedRoute roles={['admin']}><AdminStudentNotes /></ProtectedRoute>} />
          <Route path="/admin/lessons" element={<ProtectedRoute roles={['admin']}><AdminLessons /></ProtectedRoute>} />
          <Route path="/admin/exams" element={<ProtectedRoute roles={['admin']}><AdminExams /></ProtectedRoute>} />
          <Route path="/admin/exam-results" element={<ProtectedRoute roles={['admin']}><AdminExamResults /></ProtectedRoute>} />
          <Route path="/admin/exam-results/:id" element={<ProtectedRoute roles={['admin']}><AdminExamResultDetail /></ProtectedRoute>} />
          <Route path="/admin/news" element={<ProtectedRoute roles={['admin']}><AdminNews /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute roles={['admin']}><AdminPayments /></ProtectedRoute>} />
          <Route path="/admin/calendar" element={<ProtectedRoute roles={['admin']}><AdminCalendar /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute roles={['admin']}><AdminAttendance /></ProtectedRoute>} />
          <Route path="/admin/teacher-attendance" element={<ProtectedRoute roles={['admin']}><AdminTeacherAttendance /></ProtectedRoute>} />
          <Route path="/admin/homeworks" element={<ProtectedRoute roles={['admin']}><AdminHomeworks /></ProtectedRoute>} />
          <Route path="/admin/homeworks/:id/submissions" element={<ProtectedRoute roles={['admin']}><AdminHomeworkSubmissions /></ProtectedRoute>} />
          <Route path="/admin/registrations" element={<ProtectedRoute roles={['admin']}><AdminRegistrations /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/lessons" element={<ProtectedRoute roles={['teacher']}><TeacherLessons /></ProtectedRoute>} />
          <Route path="/teacher/exams" element={<ProtectedRoute roles={['teacher']}><TeacherExams /></ProtectedRoute>} />
          <Route path="/teacher/exam-results" element={<ProtectedRoute roles={['teacher']}><TeacherExamResults /></ProtectedRoute>} />
          <Route path="/teacher/exam-results/:id" element={<ProtectedRoute roles={['teacher']}><TeacherExamResultDetail /></ProtectedRoute>} />
          <Route path="/teacher/students" element={<ProtectedRoute roles={['teacher']}><TeacherStudents /></ProtectedRoute>} />
          <Route path="/teacher/students/:id/notes" element={<ProtectedRoute roles={['teacher']}><TeacherStudentNotes /></ProtectedRoute>} />
          <Route path="/teacher/homeworks" element={<ProtectedRoute roles={['teacher']}><TeacherHomeworks /></ProtectedRoute>} />
          <Route path="/teacher/homeworks/:id/submissions" element={<ProtectedRoute roles={['teacher']}><TeacherHomeworkSubmissions /></ProtectedRoute>} />
          <Route path="/teacher/calendar" element={<ProtectedRoute roles={['teacher']}><TeacherCalendar /></ProtectedRoute>} />

          {/* Parent */}
          <Route path="/parent" element={<ProtectedRoute roles={['parent']}><ParentDashboard /></ProtectedRoute>} />
          <Route path="/parent/children" element={<ProtectedRoute roles={['parent']}><ParentChildren /></ProtectedRoute>} />
          <Route path="/parent/children/:id" element={<ProtectedRoute roles={['parent']}><ParentChildDetail /></ProtectedRoute>} />
          <Route path="/parent/exams" element={<ProtectedRoute roles={['parent']}><ParentExams /></ProtectedRoute>} />
          <Route path="/parent/exam-results" element={<ProtectedRoute roles={['parent']}><ParentExamResults /></ProtectedRoute>} />
          <Route path="/parent/exam-results/:id" element={<ProtectedRoute roles={['parent']}><ParentExamResultDetail /></ProtectedRoute>} />
          <Route path="/parent/homeworks" element={<ProtectedRoute roles={['parent']}><ParentHomeworks /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

```

---

## src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/*
  CSS variables drive the accent colour. The default is the school blue.
  When a *student* logs in, the AuthContext sets these to either blue (male)
  or pink (female) based on the student's `gender` field — fulfilling the
  gender-themed UI requirement.
*/
:root {
  --accent: 30 64 175;          /* blue-800 */
  --accent-soft: 219 234 254;   /* blue-100 */
  --accent-fg: 255 255 255;
}
.dark {
  --accent-soft: 30 58 138;     /* blue-900 */
}

/* Female accent (pink) */
.theme-female {
  --accent: 190 24 93;          /* pink-700 */
  --accent-soft: 252 231 243;   /* pink-100 */
}
.dark.theme-female {
  --accent-soft: 131 24 67;     /* pink-900 */
}

/* RTL toggle (Arabic) */
html[dir="rtl"] body {
  direction: rtl;
  text-align: right;
}

/* Utility shortcuts */
.btn {
  @apply inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition;
}
.btn-primary {
  background-color: rgb(var(--accent));
  color: rgb(var(--accent-fg));
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-soft {
  background-color: rgb(var(--accent-soft));
  color: rgb(var(--accent));
}
.btn-ghost {
  @apply text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800;
}
.input {
  @apply w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2;
}
.input:focus { box-shadow: 0 0 0 2px rgb(var(--accent) / 0.4); }
.card {
  @apply bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4;
}

body {
  @apply bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen;
}

/*
  Kid-friendly landing page animations and helpers.
  All scoped under `.kid-` so nothing else in the app picks them up by accident.

  We respect prefers-reduced-motion: any animation/transform here is gated by
  the media query so people who've asked for less motion get a still page.
*/
@keyframes kid-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}
@keyframes kid-bob {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50%      { transform: translateY(-6px) rotate(2deg); }
}
@keyframes kid-pop {
  0%   { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes kid-wiggle {
  0%, 100% { transform: rotate(-3deg); }
  50%      { transform: rotate(3deg); }
}
@keyframes kid-spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes kid-blob {
  0%, 100% { border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; }
  50%      { border-radius: 40% 60% 60% 40% / 60% 40% 60% 40%; }
}
@keyframes kid-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: no-preference) {
  .kid-float       { animation: kid-float 4s ease-in-out infinite; }
  .kid-bob         { animation: kid-bob 3s ease-in-out infinite; }
  .kid-wiggle      { animation: kid-wiggle 2.5s ease-in-out infinite; }
  .kid-spin-slow   { animation: kid-spin-slow 24s linear infinite; }
  .kid-blob        { animation: kid-blob 12s ease-in-out infinite; }
  .kid-pop         { animation: kid-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
  .kid-fade-up     { animation: kid-fade-up 0.7s ease-out both; }
  /* delay variants so cards stagger in */
  .kid-d1 { animation-delay: 0.10s; }
  .kid-d2 { animation-delay: 0.25s; }
  .kid-d3 { animation-delay: 0.40s; }
  .kid-d4 { animation-delay: 0.55s; }

  .kid-tile {
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
  }
  .kid-tile:hover {
    transform: translateY(-6px) scale(1.03);
    box-shadow: 0 18px 40px -10px rgba(99, 102, 241, 0.35);
  }

  .kid-cta {
    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
  }
  .kid-cta:hover {
    transform: translateY(-3px) scale(1.04);
  }
  .kid-cta:active { transform: translateY(0) scale(0.98); }
}

/*
  Kid-friendly surfaces with light/dark variants.

  Light mode keeps the bright pastel palette (yellow → sky → lavender → pink).
  Dark mode swaps to a deeper, richer take on the same hues — saturated indigo,
  violet and teal so the page still feels playful but reads comfortably with
  light text. Each `.kid-bg-*` class applies a gradient; matching `.kid-text-*`
  utilities keep contrast acceptable in both modes.
*/

/* Hero background */
.kid-bg-hero {
  background: linear-gradient(135deg, #FEF3C7 0%, #BAE6FD 35%, #C4B5FD 70%, #FBCFE8 100%);
}
.dark .kid-bg-hero {
  background: linear-gradient(135deg, #1E1B4B 0%, #1E3A8A 35%, #4C1D95 70%, #831843 100%);
}

/* Footer background */
.kid-bg-footer {
  background: linear-gradient(135deg, #312E81 0%, #1E40AF 50%, #0E7490 100%);
}
.dark .kid-bg-footer {
  background: linear-gradient(135deg, #1E1B4B 0%, #0C1A4A 50%, #083344 100%);
}

/* About card */
.kid-bg-about {
  background: linear-gradient(135deg, #FFFFFF 0%, #FEF9C3 100%);
  border: 3px solid #FDE68A;
}
.dark .kid-bg-about {
  background: linear-gradient(135deg, #1F1B30 0%, #3F2D0E 100%);
  border-color: #92400E;
}

/* News aside card */
.kid-bg-news {
  background: linear-gradient(135deg, #FFFFFF 0%, #DBEAFE 100%);
  border: 3px solid #BFDBFE;
}
.dark .kid-bg-news {
  background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%);
  border-color: #2563EB;
}

/* Inner mini-cards inside the news aside */
.kid-news-item {
  background: white;
  border: 2px solid #DBEAFE;
}
.dark .kid-news-item {
  background: #1E293B;          /* slate-800 */
  border-color: #1E3A8A;        /* indigo-900 */
}

/* Body copy and headline colours that need to flip in dark mode. We can't
   put dark: on inline `style` so these classes do it. */
.kid-text-strong { color: #0F172A; }            /* slate-900 */
.dark .kid-text-strong { color: #F1F5F9; }      /* slate-100 */
.kid-text-body   { color: #334155; }            /* slate-700 */
.dark .kid-text-body   { color: #CBD5E1; }      /* slate-300 */
.kid-text-muted  { color: #64748B; }            /* slate-500 */
.dark .kid-text-muted  { color: #94A3B8; }      /* slate-400 */

/* Wave at the bottom of the hero — fills with the page background colour */
.kid-wave-fill { fill: #F8FAFC; }                /* slate-50 (page bg) */
.dark .kid-wave-fill { fill: #020617; }          /* slate-950 */

/*
  The four feature tiles. Each variant uses a soft pastel in light mode and
  a tinted dark surface in dark mode. Keeping the per-tile accent colour
  (--ring) stable across modes preserves the brand identity of each tile.
*/
.kid-tile-yellow { background: #FEF3C7; --ring: #F59E0B; }
.dark .kid-tile-yellow { background: #422006; }
.kid-tile-blue   { background: #DBEAFE; --ring: #2563EB; }
.dark .kid-tile-blue   { background: #172554; }
.kid-tile-pink   { background: #FCE7F3; --ring: #DB2777; }
.dark .kid-tile-pink   { background: #500724; }
.kid-tile-mint   { background: #D1FAE5; --ring: #059669; }
.dark .kid-tile-mint   { background: #052E2B; }

/* Tile inner badge — white in light, slate-900 in dark to keep the icon
   floating on a contrasting surface. The coloured drop-shadow (--ring)
   stays the same in both modes so the brand colour reads through. */
.kid-tile-badge {
  background: white;
  box-shadow: 0 6px 0 0 var(--ring);
}
.dark .kid-tile-badge {
  background: #0F172A;
}

```

---

## src/main.jsx

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { DialogProvider } from './components/Dialog.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <DialogProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </DialogProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);

```

---

## index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Salah al-Din</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

---

## package.json

```json
{
  "name": "salah-al-din-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "libphonenumber-js": "^1.11.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "vite": "^5.2.11"
  }
}

```

---

## vite.config.js

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});

```

---

## tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Site primary blends — accent injected via CSS variables (theme-aware).
      },
    },
  },
  plugins: [],
};

```

---

## postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

```

---

