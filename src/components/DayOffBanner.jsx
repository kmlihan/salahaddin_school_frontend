import { useLang } from '../context/LanguageContext';

/**
 * Renders a free / holiday / vacation day as a full-width banner.
 *
 * Colour-coded per kind:
 *   holiday  — amber
 *   vacation — sky blue
 *   free     — green
 *
 * Date display: the banner shows its own date by default. The admin
 * calendar groups items by date with a section heading, so it passes
 * `hideDate` to avoid duplicating the label. Teacher/parent/student
 * pages render a flat list and need the date inline.
 */
export default function DayOffBanner({ entry, showActions, onEdit, onDelete, hideDate }) {
  const { t, ml } = useLang();

  const palette = {
    holiday:  { bg: '#FEF3C7', fg: '#92400E', border: '#F59E0B' },
    vacation: { bg: '#DBEAFE', fg: '#1E40AF', border: '#3B82F6' },
    free:     { bg: '#DCFCE7', fg: '#166534', border: '#22C55E' },
  };
  const p = palette[entry.dayOffKind] || palette.free;

  const kindLabel =
    entry.dayOffKind === 'holiday' ? t('holiday')
    : entry.dayOffKind === 'vacation' ? t('vacation')
    : t('freeDay');

  // The stored date is UTC midnight; format it in UTC so the displayed
  // weekday/date matches what the admin picked.
  const dateLabel = entry.date
    ? new Date(entry.date).toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'UTC',
      })
    : '';

  return (
    <div
      className="rounded-lg p-3 flex items-start gap-3"
      style={{
        backgroundColor: p.bg,
        color: p.fg,
        borderInlineStart: `4px solid ${p.border}`,
      }}
    >
      <span className="text-2xl leading-none">🏖️</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">
          {kindLabel} · {t('schoolClosed')}
        </p>
        {!hideDate && dateLabel && (
          <p className="text-sm mt-0.5 font-medium">📅 {dateLabel}</p>
        )}
        {ml(entry.label) && <p className="text-sm mt-0.5">{ml(entry.label)}</p>}
        {(entry.levels || []).length > 0 && (
          <p className="text-xs mt-1 opacity-80">
            {t('levels')}: {(entry.levels || []).join(', ')}
          </p>
        )}
      </div>
      {showActions && (
        <div className="flex gap-1">
          <button className="btn btn-ghost text-xs" onClick={onEdit}>{t('edit')}</button>
          <button className="btn btn-ghost text-xs text-red-600" onClick={onDelete}>{t('delete')}</button>
        </div>
      )}
    </div>
  );
}
