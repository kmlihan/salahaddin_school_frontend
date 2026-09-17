import { useState } from 'react';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import MultiLangInput from './MultiLangInput';
import MediaField from './MediaField';
import LessonPreview from './LessonPreview';

const ICON_KINDS = ['boy', 'girl', 'man'];
const ICON_EMOJI = { boy: '🧒', girl: '👧', man: '🧔' };
const PER_ROW_OPTIONS = [1, 2, 3, 4, 6];
const LEVELS = ['A', 'B', 'C', 'D'];
const BLOCK_TYPES = ['text', 'textAudio', 'image', 'video', 'imageAudio', 'imageWithIcons'];

// Pastel palette for the textAudio tile backgrounds. Echoes the alternating
// green/cream rows in the Arabic textbook reference.
const COLOR_SWATCHES = [
  '',          // none
  '#FEF9C3',   // cream
  '#DCFCE7',   // mint
  '#DBEAFE',   // sky
  '#FCE7F3',   // pink
  '#E0E7FF',   // lavender
  '#FFE4E6',   // rose
  '#FFEDD5',   // peach
];

export default function LessonForm({ value, onChange, onSubmit, onCancel }) {
  const { t } = useLang();
  const set = (k, v) => onChange({ ...value, [k]: v });
  const blocks = value.blocks || [];

  // Normalise levels: if the doc came in with a single `level` (legacy or
  // freshly created), seed `levels` from it so the checkboxes reflect it.
  const levels = (() => {
    if (Array.isArray(value.levels) && value.levels.length) return value.levels;
    if (value.level) return [value.level];
    return [];
  })();

  const toggleLevel = (lv) => {
    const has = levels.includes(lv);
    const next = has ? levels.filter((x) => x !== lv) : [...levels, lv];
    // Also clear the legacy single-level field so it doesn't shadow `levels`.
    onChange({ ...value, levels: next, level: null });
  };

  const newBlockOf = (type) => {
    const base = {
      type,
      order: blocks.length,
      perRow: 1,
      size: '100',
      url: '',
      audioUrl: '',
      caption: { en: '', ar: '', nl: '' },
    };
    if (type === 'text' || type === 'textAudio') {
      base.content = { en: '', ar: '', nl: '' };
      base.backgroundColor = '';
    }
    if (type === 'imageWithIcons') {
      base.icons = ICON_KINDS.map((kind) => ({
        kind, audioUrl: '', label: { en: '', ar: '', nl: '' },
      }));
    }
    return base;
  };

  const addBlock = (type) => set('blocks', [...blocks, newBlockOf(type)]);

  /* ============================================================
     Bulk-add textAudio words.
     
     Takes a multi-line / comma-separated word list and turns each entry
     into a textAudio block, appended at the end. The optional
     checkerboard pattern lays alternating mint backgrounds in a
     `(row + col) % 2 === 0` staircase — same pattern the Arabic
     textbook page 45 uses, and the same as the earlier seed script.
     ============================================================ */
  const [bulkOpen, setBulkOpen]                   = useState(false);
  const [bulkText, setBulkText]                   = useState('');
  const [bulkLang, setBulkLang]                   = useState('ar');
  const [bulkPerRow, setBulkPerRow]               = useState(4);
  const [bulkCheckerboard, setBulkCheckerboard]   = useState(true);

  // Live-preview pane toggle. When true, the preview is constrained to a
  // ~380px width so the editor can spot-check how the lesson reads on a
  // student's phone. Default: false (desktop width).
  const [previewMobile, setPreviewMobile] = useState(false);

  // Split on any of: newline / comma / semicolon. Trim each entry, drop
  // empties. So both one-per-line paste and comma-separated input work.
  const parseBulkWords = (raw) =>
    String(raw || '').split(/[\n,;]+/).map((w) => w.trim()).filter(Boolean);

  const bulkWords = parseBulkWords(bulkText);

  const appendBulkWords = () => {
    if (bulkWords.length === 0) return;
    const checkerColor = '#DCFCE7'; // mint — matches existing swatch palette
    const newBlocks = bulkWords.map((word, i) => {
      const row = Math.floor(i / bulkPerRow);
      const col = i % bulkPerRow;
      const useColor = bulkCheckerboard && ((row + col) % 2 === 0);
      return {
        type: 'textAudio',
        order: blocks.length + i,
        perRow: bulkPerRow,
        size: '100',
        url: '',
        audioUrl: '',
        caption: { en: '', ar: '', nl: '' },
        content: {
          en: bulkLang === 'en' ? word : '',
          ar: bulkLang === 'ar' ? word : '',
          nl: bulkLang === 'nl' ? word : '',
        },
        backgroundColor: useColor ? checkerColor : '',
      };
    });
    set('blocks', [...blocks, ...newBlocks]);
    setBulkText('');
    setBulkOpen(false);
  };

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

  /**
   * Duplicate a block in-place, just below the original. Strips _id so the
   * server creates fresh ones on save. Useful when the teacher wants 10
   * coloured tiles all with the same layout but different words — make the
   * first, copy it, edit the text.
   */
  const copyBlock = (i) => {
    const src = blocks[i];
    const { _id, ...rest } = src;
    const copy = JSON.parse(JSON.stringify(rest));
    const next = [
      ...blocks.slice(0, i + 1),
      copy,
      ...blocks.slice(i + 1),
    ].map((b, idx) => ({ ...b, order: idx }));
    set('blocks', next);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <div className="space-y-3">
      <div>
        <span className="block text-sm mb-1">{t('tableTitle')}</span>
        <MultiLangInput value={value.title || {}} onChange={(v) => set('title', v)} placeholder="Lesson title" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm mb-1">{t('section')}</span>
          <input className="input" value={value.section || ''} onChange={(e) => set('section', e.target.value)} required />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('order') || 'Order'}</span>
          <input type="number" className="input" value={value.order ?? 0} onChange={(e) => set('order', Number(e.target.value))} />
        </label>
      </div>

      {/* Multi-level checkboxes — replaces the single-level dropdown. A
          lesson can now belong to several levels at once. */}
      <div>
        <span className="block text-sm mb-1">{t('levels') || 'Levels'}</span>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((lv) => {
            const on = levels.includes(lv);
            return (
              <label
                key={lv}
                className={
                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition ' +
                  (on
                    ? 'bg-[rgb(var(--accent))] text-white border-transparent'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800')
                }
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleLevel(lv)} />
                {t('level')} {lv}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <span className="block text-sm mb-1">{t('unit')} label</span>
        <MultiLangInput value={value.unitName || {}} onChange={(v) => set('unitName', v)} placeholder="Unit name" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">Content blocks</h3>
          <div className="flex gap-1 flex-wrap items-center">
            {BLOCK_TYPES.map((type) => (
              <button type="button" key={type} className="btn btn-soft text-xs" onClick={() => addBlock(type)}>
                + {type}
              </button>
            ))}
            <span className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1" aria-hidden="true" />
            <button
              type="button"
              className={'btn text-xs ' + (bulkOpen ? 'btn-primary' : 'btn-soft')}
              onClick={() => setBulkOpen((o) => !o)}
              title="Paste a word list to create many textAudio blocks at once"
            >
              {bulkOpen ? '✕' : '✨'} {t('bulkAddWords') || 'Bulk add words'}
            </button>
          </div>
        </div>

        {bulkOpen && (
          <div className="card border-2 border-indigo-300 dark:border-indigo-700 space-y-3 bg-indigo-50/40 dark:bg-indigo-950/30">
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <span className="text-sm font-semibold">
                  ✨ {t('bulkAddWords') || 'Bulk add words'}
                </span>
                <span className="text-xs text-slate-500">
                  {t('bulkHint') || 'One word per line — commas and semicolons also work'}
                </span>
              </div>
              {/* Direction follows the picked language so Arabic words
                  render right-to-left while you type / paste. */}
              <textarea
                className="input"
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  bulkLang === 'ar'
                    ? 'نَزَلَ\nسَبَقَ\nأَبَقَ\nفَرَضَ'
                    : bulkLang === 'nl'
                    ? 'huis\nschool\nboek\nkind'
                    : 'home\nschool\nbook\nchild'
                }
                dir={bulkLang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-xs mb-1">{t('language') || 'Language'}</span>
                <select
                  className="input"
                  value={bulkLang}
                  onChange={(e) => setBulkLang(e.target.value)}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-xs mb-1">{t('perRow') || 'Per row'}</span>
                <select
                  className="input"
                  value={bulkPerRow}
                  onChange={(e) => setBulkPerRow(Number(e.target.value))}
                >
                  {PER_ROW_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bulkCheckerboard}
                  onChange={(e) => setBulkCheckerboard(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {t('checkerboardPattern') || 'Checkerboard backgrounds'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-indigo-200 dark:border-indigo-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {(t('bulkWillCreate') || 'Will create {n} block(s)').replace('{n}', String(bulkWords.length))}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-soft text-sm"
                  onClick={() => { setBulkText(''); setBulkOpen(false); }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={appendBulkWords}
                  disabled={bulkWords.length === 0}
                >
                  + {t('append') || 'Append'} ({bulkWords.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {blocks.map((b, i) => (
          <div key={i} className="card border border-slate-300 dark:border-slate-700 space-y-2">
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
                  {PER_ROW_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>

              <button type="button" className="btn btn-ghost px-2" onClick={() => moveBlock(i, -1)} title="Move up">↑</button>
              <button type="button" className="btn btn-ghost px-2" onClick={() => moveBlock(i, +1)} title="Move down">↓</button>
              <button type="button" className="btn btn-ghost text-xs" onClick={() => copyBlock(i)} title="Duplicate this block">⧉</button>
              <button type="button" className="btn btn-ghost text-red-600 text-xs" onClick={() => removeBlock(i)}>×</button>
            </div>

            {(b.type === 'text' || b.type === 'textAudio') && (
              <>
                <MultiLangInput value={b.content || {}} onChange={(v) => updateBlock(i, { content: v })} multiline />
                <ColorPicker
                  value={b.backgroundColor || ''}
                  onChange={(color) => updateBlock(i, { backgroundColor: color })}
                />
                {b.type === 'textAudio' && (
                  <MediaField label="Audio (optional)" value={b.audioUrl} accept="audio/*"
                             onChange={(url) => updateBlock(i, { audioUrl: url })} />
                )}
              </>
            )}

            {(b.type === 'image' || b.type === 'video') && (
              <MediaField value={b.url} accept={b.type + '/*'} onChange={(url) => updateBlock(i, { url })} />
            )}

            {b.type === 'imageAudio' && (
              <>
                <MediaField label="Image" value={b.url} accept="image/*" onChange={(url) => updateBlock(i, { url })} />
                <MediaField label="Audio" value={b.audioUrl} accept="audio/*" onChange={(url) => updateBlock(i, { audioUrl: url })} />
              </>
            )}

            {b.type === 'imageWithIcons' && (
              <ImageWithIconsEditor block={b} onPatch={(patch) => updateBlock(i, patch)} />
            )}

            {b.type !== 'text' && b.type !== 'textAudio' && (
              <div>
                <span className="block text-xs mb-1">Caption</span>
                <MultiLangInput value={b.caption || {}} onChange={(v) => updateBlock(i, { caption: v })} />
              </div>
            )}
          </div>
        ))}

        <p className="text-xs text-slate-500">
          Tip: consecutive blocks with the same "per row" value share a row.
          Use textAudio + a perRow of 3 or 4 for a coloured grid like a textbook page.
        </p>
      </div>

      <div className="flex gap-2">
        <button className="btn btn-primary">{t('save')}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      </div>
        </div>

        <aside className="mt-6 lg:mt-0">
          <div className="lg:sticky lg:top-4">
            <div className="card border-2 border-dashed border-indigo-300 dark:border-indigo-800">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span aria-hidden="true">👁</span>
                  {t('previewStudentView') || 'Preview · how students see it'}
                </h3>
                <button
                  type="button"
                  className="btn btn-soft text-xs"
                  onClick={() => setPreviewMobile((m) => !m)}
                  title={previewMobile
                    ? (t('switchToDesktopPreview') || 'Switch to desktop preview')
                    : (t('switchToMobilePreview') || 'Switch to phone-width preview')}
                >
                  {previewMobile
                    ? `🖥️ ${t('desktopView') || 'Desktop'}`
                    : `📱 ${t('mobileView') || 'Mobile'}`}
                </button>
              </div>
              {/* Constraining width simulates a phone — the inner ContentBlock
                  layout reacts the same way it would on a small viewport,
                  so per-row block grids reflow correctly. */}
              <div
                className={
                  'transition-all duration-300 ' +
                  (previewMobile
                    ? 'max-w-[380px] mx-auto border-x-2 border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden p-2'
                    : '')
                }
              >
                <LessonPreview lesson={value} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

/**
 * Simple swatch picker for tile backgrounds. The empty swatch (a striped
 * "no color" indicator) clears the colour. Custom colours can be entered
 * via the hex input alongside.
 */
function ColorPicker({ value, onChange }) {
  return (
    <div>
      <span className="block text-xs mb-1">Background colour</span>
      <div className="flex items-center gap-2 flex-wrap">
        {COLOR_SWATCHES.map((c, i) => {
          const selected = (value || '') === c;
          return (
            <button
              type="button"
              key={i}
              onClick={() => onChange(c)}
              title={c || 'no color'}
              className={
                'w-7 h-7 rounded-full border-2 transition ' +
                (selected ? 'border-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-700')
              }
              style={{
                backgroundColor: c || 'transparent',
                backgroundImage: c ? undefined : 'repeating-linear-gradient(45deg, #cbd5e1 0 4px, transparent 4px 8px)',
              }}
            />
          );
        })}
        <input
          type="text"
          placeholder="#hex"
          className="input"
          style={{ width: 110 }}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function ImageWithIconsEditor({ block, onPatch }) {
  const icons = block.icons && block.icons.length === 3
    ? block.icons
    : ICON_KINDS.map((kind) => ({ kind, audioUrl: '', label: { en: '', ar: '', nl: '' } }));

  const updateIcon = (kind, patch) => {
    onPatch({ icons: icons.map((it) => it.kind === kind ? { ...it, ...patch } : it) });
  };

  return (
    <div className="space-y-3">
      <MediaField label="Main image" value={block.url} accept="image/*" onChange={(url) => onPatch({ url })} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {icons.map((it) => (
          <div key={it.kind} className="border border-slate-200 dark:border-slate-700 rounded p-2 space-y-2">
            <p className="text-xs font-medium capitalize flex items-center gap-2">
              <span className="text-2xl leading-none">{ICON_EMOJI[it.kind]}</span>
              {it.kind}
            </p>
            <MediaField label="Audio" value={it.audioUrl} accept="audio/*" onChange={(url) => updateIcon(it.kind, { audioUrl: url })} />
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

