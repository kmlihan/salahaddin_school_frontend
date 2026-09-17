import { useLang } from '../context/LanguageContext';
import ContentBlock from './ContentBlock';
import { groupBlocksIntoRows } from './blockLayout';

/**
 * Pure-presentation lesson preview.
 *
 * Renders a lesson exactly as a student would see it on /student/lessons/:id —
 * title, section/level subtitle, content blocks grouped into rows by their
 * per-row setting.
 *
 * Used in two places:
 *   1. student/LessonView.jsx — the live student page (the lesson is
 *      fetched from the API and passed in)
 *   2. LessonForm.jsx — the admin/teacher editor's right-side preview
 *      pane, fed straight from the in-progress form state
 *
 * The preview has no editing affordances and no progress-tracking — it's
 * a faithful representation of the final reading experience.
 */
export default function LessonPreview({ lesson }) {
  const { t, ml } = useLang();
  if (!lesson) return null;

  const blocks = (lesson.blocks || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const rows = groupBlocksIntoRows(blocks);

  const title    = ml(lesson.title)    || '';
  const unitName = ml(lesson.unitName) || '';

  // Show levels[] if present (multi-level), fall back to the legacy
  // single-level field for older lessons.
  const levelList = (() => {
    const arr = Array.isArray(lesson.levels) && lesson.levels.length
      ? lesson.levels
      : (lesson.level ? [lesson.level] : []);
    return arr;
  })();

  // The student page wraps each "row" in an inline-styled flex container —
  // mirror that exactly so the preview's layout can't drift from production.
  const rowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    width: '100%',
  };

  const subtitleBits = [
    unitName || null,
    lesson.section || null,
    levelList.length ? `${t('level')} ${levelList.join(', ')}` : null,
  ].filter(Boolean);

  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-4">
        {title ? (
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
        ) : (
          <h1 className="text-2xl md:text-3xl font-bold text-slate-400 italic">
            {t('untitledLesson') || 'Untitled lesson'}
          </h1>
        )}
        {subtitleBits.length > 0 && (
          <p className="text-sm text-slate-500 mt-1">{subtitleBits.join(' · ')}</p>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="text-center text-slate-400 italic py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          {t('previewEmpty') || 'Add content blocks to see the preview.'}
        </div>
      ) : (
        rows.map((row, idx) => (
          <div key={idx} style={rowStyle}>
            {row.items.map(({ block, widthPct }, k) => (
              <ContentBlock
                key={(block._id || block.order || idx) + ':' + k}
                block={block}
                widthPct={widthPct}
              />
            ))}
          </div>
        ))
      )}
    </article>
  );
}
