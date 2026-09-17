import { useState, useRef } from 'react';
import { useLang } from '../context/LanguageContext';
import { extractYouTubeId } from '../utils/media';

/**
 * Sizing
 * ------
 * The wrapper width is set via inline style, never via class, so it cannot
 * be defeated by CSS state.
 *
 * Width source of truth (in priority order):
 *   1. `widthPct` prop from the parent — used when the parent is grouping
 *      blocks into rows of N (where width = 100/N %).
 *   2. `block.size` ('25' / '50' / '75' / '100') — legacy, still works for
 *      data created before the `perRow` field existed.
 *
 * Padding lives on an INNER div, not the wrapper, so the wrapper percentage
 * is exact and four 25% wrappers always total 100% of the row.
 */
const SIZE_PCT = { '25': '25%', '50': '50%', '75': '75%', '100': '100%' };

function wrapperStyle(widthPct, size) {
  const pct = widthPct || SIZE_PCT[String(size)] || '100%';
  return {
    flex: `0 0 ${pct}`,
    width: pct,
    maxWidth: pct,
    minWidth: 0,
    boxSizing: 'border-box',
  };
}

const innerStyle = { padding: '0 4px', boxSizing: 'border-box' };

export default function ContentBlock({ block, widthPct }) {
  const { ml } = useLang();
  const wrap = wrapperStyle(widthPct, block.size);

  if (block.type === 'text') {
    const bg = block.backgroundColor || '';
    const cellStyle = bg
      ? {
          backgroundColor: bg,
          padding: '12px 14px',
          borderRadius: 10,
          margin: '8px 0',
        }
      : null;
    return (
      <div style={wrap}>
        <div style={innerStyle}>
          <div
            style={cellStyle || undefined}
            className="prose dark:prose-invert max-w-none whitespace-pre-wrap my-2"
          >
            {ml(block.content)}
          </div>
        </div>
      </div>
    );
  }

  // textAudio: a coloured tile with text and an optional tap-to-play sound.
  // Designed for grids of words like the Arabic textbook reference (use
  // perRow=3 or 4 to lay them out on the same line).
  if (block.type === 'textAudio') {
    return <TextAudio block={block} wrap={wrap} ml={ml} />;
  }

  if (block.type === 'image') {
    const caption = ml(block.caption);
    return (
      <div style={wrap}>
        <div style={innerStyle} className="my-2">
          <img src={block.url} alt={caption || ''} className="rounded-md w-full block" />
          {caption && <p className="text-sm text-slate-500 mt-1">{caption}</p>}
        </div>
      </div>
    );
  }

  if (block.type === 'video') {
    const caption = ml(block.caption);
    // YouTube URLs render as embedded iframe players. Anything else
    // (a direct .mp4 URL, an /uploads/… file) goes through the native
    // <video> element with controls. The 56.25% padding-bottom trick
    // gives a 16:9 aspect-ratio container that scales with width.
    const yt = extractYouTubeId(block.url);
    return (
      <div style={wrap}>
        <div style={innerStyle} className="my-2">
          {yt ? (
            <div
              className="rounded-md overflow-hidden bg-black"
              style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${yt}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
              />
            </div>
          ) : (
            <video src={block.url} controls className="rounded-md w-full block" />
          )}
          {caption && <p className="text-sm text-slate-500 mt-1">{caption}</p>}
        </div>
      </div>
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

/**
 * Coloured text tile with an optional audio. Tapping the tile plays the
 * audio (and pauses if you tap again). When the tile has no audio it just
 * shows the text on the coloured background — same visual as a `text` block
 * with backgroundColor, but kept as its own type so the data model is
 * explicit about there being a sound to play.
 */
function TextAudio({ block, wrap, ml }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const bg = block.backgroundColor || '#FEF9C3';

  const onTap = () => {
    const a = audioRef.current;
    if (!a || !block.audioUrl) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  return (
    <div style={wrap}>
      <div style={innerStyle} className="my-2">
        <div
          onClick={onTap}
          role={block.audioUrl ? 'button' : undefined}
          tabIndex={block.audioUrl ? 0 : undefined}
          onKeyDown={block.audioUrl ? (e) => { if (e.key === 'Enter' || e.key === ' ') onTap(); } : undefined}
          className={
            'rounded-xl text-center font-semibold transition select-none ' +
            (block.audioUrl ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : '')
          }
          style={{
            backgroundColor: bg,
            padding: '20px 14px',
            // A subtle border that picks up the bg colour at higher saturation
            // — enough to give the tile structure on white pages.
            border: '2px solid rgba(0,0,0,0.08)',
            fontSize: 22,
            color: '#0F172A',
            position: 'relative',
            minHeight: 60,
          }}
        >
          <span dir="auto">{ml(block.content)}</span>
          {block.audioUrl && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 6,
                insetInlineEnd: 8,
                fontSize: 14,
                opacity: 0.7,
              }}
            >
              {playing ? '⏸' : '🔊'}
            </span>
          )}
        </div>
        {block.audioUrl && (
          <audio
            ref={audioRef}
            src={block.audioUrl}
            onEnded={() => setPlaying(false)}
            preload="none"
          />
        )}
      </div>
    </div>
  );
}

function ImageAudio({ block, wrap, caption }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  return (
    <div style={wrap}>
      <div style={innerStyle} className="my-2">
        <button type="button" onClick={toggle} className="block w-full relative group focus:outline-none" aria-label="Play audio">
          <img src={block.url} alt={caption || ''} className="rounded-md w-full block" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="bg-black/50 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl group-hover:bg-black/70 transition">
              {playing ? '⏸' : '▶'}
            </span>
          </span>
        </button>
        <audio ref={audioRef} src={block.audioUrl} onEnded={() => setPlaying(false)} preload="none" />
        {caption && <p className="text-sm text-slate-500 mt-1">{caption}</p>}
      </div>
    </div>
  );
}

const ICON_EMOJI = { boy: '🧒', girl: '👧', man: '🧔' };
const ICON_ORDER = { boy: 0, girl: 1, man: 2 };

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

  const icons = (block.icons || []).slice().sort(
    (a, b) => (ICON_ORDER[a.kind] ?? 99) - (ICON_ORDER[b.kind] ?? 99)
  );
  const caption = ml(block.caption);

  return (
    <div style={wrap}>
      <div style={innerStyle} className="my-2">
        {block.url && <img src={block.url} alt={caption || ''} className="rounded-md w-full block" />}

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
                <span className="text-3xl leading-none">{ICON_EMOJI[icon.kind]}</span>
                <span className="text-xs capitalize">
                  {ml(icon.label) || icon.kind}
                </span>
                <span className="text-xs">{active ? '⏸' : '▶'}</span>
              </button>
            );
          })}
        </div>

        <audio ref={audioRef} onEnded={() => setPlayingKind(null)} preload="none" />

        {caption && <p className="text-sm text-slate-500 mt-1">{caption}</p>}
      </div>
    </div>
  );
}
