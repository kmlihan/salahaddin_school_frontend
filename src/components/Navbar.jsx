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
      { to: '/admin/culture', label: t('cultureQuiz') },
      { to: '/admin/news', label: t('news') },
   
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
      { to: '/teacher/attendance', label: t('attendance') },
    ];
    if (role === 'parent') return [
      { to: '/parent', label: t('dashboard') },
      { to: '/parent/children', label: t('myChildren') },
      { to: '/parent/exams', label: t('exams') },
      { to: '/parent/exam-results', label: t('myResults') },
      { to: '/parent/homeworks', label: t('homeworks') },
      { to: '/parent/culture-quiz', label: t('cultureQuiz') },
      { to: '/parent/calendar', label: t('calendar') },
      { to: '/parent/attendance', label: t('attendance') },
    ];
    if (role === 'student') return [
      { to: '/student', label: t('dashboard') },
      { to: '/student/lessons', label: t('myLessons') },
      { to: '/student/exams', label: t('myExams') },
      { to: '/student/results', label: t('myResults') },
      { to: '/student/homeworks', label: t('myHomework') },
      { to: '/student/culture-quiz', label: t('cultureQuiz') },
      { to: '/student/calendar', label: t('calendar') },
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
          <Logo size={65} showTagline={false} />
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
           
            <Link to="/login" className="btn btn-primary text-sm">{t('login')}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
