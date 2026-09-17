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
