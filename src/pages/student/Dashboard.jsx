import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import StudentThemeBackground from '../../components/StudentThemeBackground';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import femaleAvatar from '../../assets/female_avatar.png';
import maleAvatar from '../../assets/male_avatar.png';


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
    <>
      {/* Injects the per-student gradient + animation variables on <body> */}
      <StudentThemeBackground />

      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            {/* Welcome header uses a subtle float entrance (apply classes sparingly) */}
            <h1
              className="text-2xl font-semibold student-animated student-animated--fade-in"
              aria-live="polite"
            >
              {t('welcomeBack')}, {user?.firstName}
            </h1>
            <p className="text-slate-500 mt-1">
              {t('level')}: <span className="font-medium">{user?.level}</span>
            </p>
          </div>

          {/* Example avatar / quick info — animated pulse on hover */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 student-animated student-animated--pulse"
              aria-hidden="true"
            >
              {user?.firstName?.[0] ?? 'U'}
            </div>
          </div>
        </header>

        <section aria-label={t('overview')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stat cards: each card uses the animation utilities.
                Use the fade-in class for entrance and pulse for hover affordance. */}
            <Stat
              label={t('myLessons')}
              value={`${unlocked.length}/${lessons.length}`}
              to="/student/lessons"
              variant="pulse"
            />
            <Stat
              label={t('myExams')}
              value={exams.length}
              to="/student/exams"
              variant="pulse"
            />
            <Stat
              label={t('myResults')}
              value={results.length}
              to="/student/results"
              variant="pulse"
            />
          </div>
        </section >
{(user?.gender === 'female') && (
  <div className="flex justify-center my-4">
    {/* 1. Relative wrapper anchors the absolute text position */}
    <div className="relative w-[250px] h-[250px] select-none">
      
      {/* 2. The background image (use the blank version without text) */}
      <img
        src={femaleAvatar} 
        alt="Student Avatar"
        className="w-full h-full object-contain"
      />

      {/* 3. Absolute container perfectly centered over the image's text badge */}
      <div className="absolute bottom-[9%] left-1/2 -translate-x-1/2 w-[70%] text-center flex items-center justify-center">
        <h2 className="text-white font-extrabold text-base tracking-wide uppercase drop-shadow-[0_2px_8px_rgba(255,215,0,0.8)] max-w-full truncate">
        {t('welcome')}, {user?.firstName}
        </h2>
      </div>

    </div>
  </div>
)}

{( user?.gender === 'male' && user?.level === 'A') && (
  <div className="flex justify-center my-4">
    {/* 1. Relative wrapper anchors the absolute text position */}
    <div className="relative w-[250px] h-[250px] select-none">
      
      {/* 2. The background image (use the blank version without text) */}
      <img
        src={maleAvatar} 
        alt="Student Avatar"
        className="w-full h-full object-contain"
      />

      {/* 3. Absolute container perfectly centered over the image's text badge */}
      <div className="absolute bottom-[9%] left-1/2 -translate-x-1/2 w-[70%] text-center flex items-center justify-center">
        <h2 className="text-white font-extrabold text-base tracking-wide uppercase drop-shadow-[0_2px_8px_rgba(255,215,0,0.8)] max-w-full truncate">
        {t('welcome')}, {user?.firstName}
        </h2>
      </div>

    </div>
  </div>
)}

      </div>
    </>
  );
}

/**
 * Stat card
 *
 * - Uses the injected utility classes from StudentThemeBackground.
 * - Keep animations limited to hover/focus and small elements to avoid
 *   performance issues on low-end devices.
 */
function Stat({ label, value, to, variant = 'pulse' }) {
  const baseClasses =
    'card flex flex-col p-4 rounded-lg bg-white/80 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700';
  const animClasses = `student-animated student-animated--${variant} transition`;

  return (
    <Link
      to={to}
      className={`${baseClasses} ${animClasses} hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400`}
      aria-label={`${label} — ${value}`}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </Link>
  );
}
