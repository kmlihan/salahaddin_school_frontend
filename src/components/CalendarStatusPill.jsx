import { useLang } from '../context/LanguageContext';

export default function CalendarStatusPill({ status }) {
  const { t } = useLang();
  const map = {
    pending:  { label: t('pending'),  bg: '#64748B' },
    approved: { label: t('approved'), bg: '#16a34a' },
    declined: { label: t('declined'), bg: '#dc2626' },
  };
  const it = map[status] || map.pending;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ backgroundColor: it.bg, color: 'white' }}
    >
      {it.label}
    </span>
  );
}
