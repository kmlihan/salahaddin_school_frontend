import CrudTable from '../../components/CrudTable';
import MultiLangInput from '../../components/MultiLangInput';
import { useState } from 'react';
import api from '../../api/client';
import MediaField from '../../components/MediaField';
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

      <MediaField label="Cover image" value={value.coverImage} accept="image/*" kind="image" onChange={(v) => set('coverImage', v)} />

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
              <MediaField value={b.url} accept={b.type + '/*'} onChange={(url) => updateBlock(i, { url })} />
            )}
            {b.type === 'imageAudio' && (
              <>
                <MediaField label="Image" value={b.url} accept="image/*" onChange={(url) => updateBlock(i, { url })} />
                <MediaField label="Audio" value={b.audioUrl} accept="audio/*" onChange={(url) => updateBlock(i, { audioUrl: url })} />
              </>
            )}
            {b.type === 'imageWithIcons' && (
              <div className="space-y-2">
                <MediaField label="Main image (optional)" value={b.url} accept="image/*" onChange={(url) => updateBlock(i, { url })} />
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
                      <MediaField
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


