import { useId } from 'react';
import { useLang } from '../context/LanguageContext';
import logo from '../assets/logo.jpeg'; // Recommending replacing this with a transparent PNG or SVG!

/**
 * Reusable school logo.
 */
export default function Logo({
  variant = 'full',
  size = 80,
  color = 'auto', // 'auto' | 'white' | 'dark'
  className = '',
  showTagline = true,
}) {
  const { t, lang } = useLang();
  const isRtl = lang === 'ar';

  const wordmarkColor =
    color === 'white' ? 'text-white'
    : color === 'dark'  ? 'text-slate-900 dark:text-slate-100'
    : 'text-slate-900 dark:text-slate-100';
    
  const taglineColor =
    color === 'white' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400';

  return (
    <div 
      // Force correct text direction layout depending on the language
      dir={isRtl ? 'rtl' : 'ltr'} 
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <Badge size={size} />
      
      {variant === 'full' && (
        <div className="leading-tight select-none">
          <div
            className={`${wordmarkColor} font-extrabold tracking-tight`}
            style={{
              fontSize: Math.max(14, Math.round(size * 0.32)),
              letterSpacing: isRtl ? 0 : '-0.01em',
            }}
          >
            {t('appName')}
          </div>
          {showTagline && (
            <div
              className={`${taglineColor} font-medium`}
              style={{ fontSize: Math.max(9, Math.round(size * 0.18)) }}
            >
              {t('tagline')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ size }) {
  return (
    <img
      src={logo}
      alt="School Logo"
      // Added 'antialiased' rendering hints to help the browser scale text elements cleanly
      className="flex-shrink-0 rounded-full object-cover select-none dynamic-logo"
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        imageRendering: 'auto',
      }}
    />
  );
}