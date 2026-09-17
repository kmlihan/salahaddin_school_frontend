import { useState } from 'react';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import { extractYouTubeId, isUploadedUrl } from '../utils/media';

/**
 * Two-mode media input for content blocks.
 *
 *   Tab 1: Upload — picks a file, POSTs to /api/upload, stores the
 *          returned URL.
 *   Tab 2: URL    — paste any external URL (image / video / YouTube /
 *          audio). For YouTube links, the preview embeds the player.
 *
 * Both modes produce the same shape: a string URL stored on the parent's
 * state via `onChange(url)`. The caller doesn't care which mode was used.
 *
 * Props:
 *   label    — optional label
 *   value    — current URL string
 *   onChange — (url: string) => void
 *   accept   — file picker MIME filter (e.g. 'image/*')
 *   kind     — 'image' | 'audio' | 'video' — controls the preview. If
 *              omitted, inferred from `accept` ('image/*' → 'image' etc.).
 */
export default function MediaField({ label, value, onChange, accept, kind }) {
  // Default to whichever tab matches the existing value: external (or
  // YouTube) URLs land on the URL tab; uploads stay on the Upload tab.
  const [mode, setMode] = useState(() => {
    if (!value) return 'upload';
    if (isUploadedUrl(value)) return 'upload';
    if (/^https?:\/\//i.test(value)) return 'url';
    return 'upload';
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { t } = useLang();

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload', fd);
      onChange(data.url);
    } catch (ex) {
      setErr(ex.response?.data?.message || (t('error') || 'Upload failed'));
    } finally { setBusy(false); }
  };

  // Infer preview kind when not explicitly set.
  const previewKind = kind || (
    accept?.startsWith('image') ? 'image' :
    accept?.startsWith('audio') ? 'audio' :
    accept?.startsWith('video') ? 'video' : null
  );

  const tabBtn = (m, txt) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={
        'px-3 py-1 rounded-t text-xs font-medium transition ' +
        (mode === m
          ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')
      }
    >
      {txt}
    </button>
  );

  return (
    <div>
      {label && <span className="block text-xs mb-1">{label}</span>}

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabBtn('upload', t('upload') || 'Upload')}
        {tabBtn('url',    t('pasteUrl') || 'Paste URL')}
      </div>

      <div className="mt-2">
        {mode === 'upload' ? (
          <div>
            <input
              type="file"
              accept={accept}
              onChange={upload}
              className="text-sm block w-full"
            />
          </div>
        ) : (
          <input
            type="url"
            placeholder="https://… (or YouTube link)"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="input text-sm"
          />
        )}
      </div>

      {busy && <p className="text-xs text-slate-500 mt-1">…</p>}
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}

      {value && previewKind && <Preview value={value} kind={previewKind} />}
    </div>
  );
}

/**
 * Inline preview. YouTube links always embed (regardless of `kind`).
 * Otherwise the kind dictates: <img> / <audio> / <video>.
 */
function Preview({ value, kind }) {
  const yt = extractYouTubeId(value);
  if (yt) {
    return (
      <div
        className="mt-2 rounded overflow-hidden bg-black"
        style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube preview"
        />
      </div>
    );
  }
  if (kind === 'image') {
    return <img src={value} alt="" className="mt-2 max-h-32 rounded" onError={brokenLink} />;
  }
  if (kind === 'audio') {
    return <audio src={value} controls className="mt-2 w-full" />;
  }
  if (kind === 'video') {
    return <video src={value} controls className="mt-2 max-h-48 w-full" />;
  }
  return <p className="mt-1 text-xs text-slate-500 truncate">{value}</p>;
}

function brokenLink(e) {
  e.currentTarget.style.display = 'none';
}
