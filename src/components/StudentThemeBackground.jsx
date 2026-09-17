import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * StudentThemeBackground.jsx
 *
 * Applies a per-student gradient to document.body and sets animation
 * variables and a body class so CSS can animate UI elements according
 * to the student's level. Injects a small CSS utility block that
 * respects prefers-reduced-motion.
 *
 * Usage:
 *  - Add class "student-animated" to elements you want animated.
 *  - Use modifiers: "student-animated--pulse", "student-animated--float".
 *  - Keep animations subtle and apply to a limited set of elements.
 */

/* Theme colors (unchanged) with added `anim` profile per level/gender */
const THEMES = {
  // Level A — youngest, playful
  'A-male': {
    c1: 'rgba(147, 197, 253, 0.55)',
    c2: 'rgba(125, 211, 252, 0.45)',
    anim: { type: 'pulse', scale: 1.06, translateY: 6, duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)' }
  },
  'A-female': {
    c1: 'rgba(249, 168, 212, 0.55)',
    c2: 'rgba(253, 186, 116, 0.45)',
    anim: { type: 'pulse', scale: 1.06, translateY: 6, duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)' }
  },

  // Level B — teens, cleaner
  'B-male': {
    c1: 'rgba(165, 180, 252, 0.45)',
    c2: 'rgba(148, 163, 184, 0.30)',
    anim: { type: 'float', scale: 1.03, translateY: 4, duration: 360, easing: 'cubic-bezier(.22,.8,.3,1)' }
  },
  'B-female': {
    c1: 'rgba(253, 164, 175, 0.45)',
    c2: 'rgba(254, 215, 170, 0.30)',
    anim: { type: 'float', scale: 1.03, translateY: 4, duration: 360, easing: 'cubic-bezier(.22,.8,.3,1)' }
  },

  // Level C — warm, gentle
  'C-male': {
    c1: 'rgba(110, 231, 183, 0.50)',
    c2: 'rgba(252, 211, 77, 0.45)',
    anim: { type: 'fade', scale: 1.02, translateY: 2, duration: 420, easing: 'cubic-bezier(.25,.8,.25,1)' }
  },
  'C-female': {
    c1: 'rgba(244, 114, 182, 0.45)',
    c2: 'rgba(252, 211, 77, 0.45)',
    anim: { type: 'fade', scale: 1.02, translateY: 2, duration: 420, easing: 'cubic-bezier(.25,.8,.25,1)' }
  },

  // Level D — restrained, dignified
  'D-male': {
    c1: 'rgba(100, 116, 139, 0.40)',
    c2: 'rgba(252, 211, 77, 0.40)',
    anim: { type: 'none', scale: 1.0, translateY: 0, duration: 300, easing: 'linear' }
  },
  'D-female': {
    c1: 'rgba(225, 132, 142, 0.40)',
    c2: 'rgba(252, 211, 77, 0.40)',
    anim: { type: 'none', scale: 1.0, translateY: 0, duration: 300, easing: 'linear' }
  },
};

function gradientFor(theme) {
  return (
    `radial-gradient(60vw 60vh at 100% 0%, ${theme.c1}, transparent 65%), ` +
    `radial-gradient(60vw 60vh at 0% 100%, ${theme.c2}, transparent 65%)`
  );
}

/* Small unique id for injected style tag so we don't duplicate it */
const STYLE_ID = 'student-theme-animations-style';

export default function StudentThemeBackground() {
  const { user, role } = useAuth();

  useEffect(() => {
    // Inject CSS utilities once
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
/* Student animation utilities injected by StudentThemeBackground */
@media (prefers-reduced-motion: reduce) {
  .student-animated { transition: none !important; animation: none !important; transform: none !important; }
}

/* Base animated utility: uses CSS variables set on body */
.student-animated {
  will-change: transform, opacity;
  transition: transform var(--student-anim-duration, 360ms) var(--student-anim-ease, ease), opacity var(--student-anim-duration, 360ms) var(--student-anim-ease, ease);
  transform-origin: center;
}

/* Pulse on hover/focus for playful levels */
.student-animated--pulse:hover,
.student-animated--pulse:focus {
  transform: scale(var(--student-anim-scale, 1.04)) translateY(var(--student-anim-translateY, 0));
}

/* Float subtle entrance or idle motion (use sparingly) */
.student-animated--float {
  animation: student-float var(--student-anim-duration, 360ms) var(--student-anim-ease, ease) infinite alternate;
  opacity: 0.98;
}
@keyframes student-float {
  from { transform: translateY(0) scale(1); }
  to   { transform: translateY(calc(var(--student-anim-translateY, 4px) * -1)) scale(var(--student-anim-scale, 1.02)); }
}

/* Fade-in utility for gentle reveals */
.student-animated--fade-in {
  opacity: 0;
  transform: translateY(6px) scale(0.998);
  animation: student-fade-in var(--student-anim-duration, 360ms) var(--student-anim-ease, ease) forwards;
}
@keyframes student-fade-in {
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Minimal helper to opt-out when body-level animations are disabled */
.has-student-animations-disabled .student-animated { transition: none; animation: none; transform: none; }
      `;
      document.head.appendChild(style);
    }

    // Only students get a personal backdrop and animation variables
    if (role !== 'student') {
      // Clear gradient and animation variables
      document.body.style.backgroundImage = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.removeProperty('--student-anim-scale');
      document.body.style.removeProperty('--student-anim-translateY');
      document.body.style.removeProperty('--student-anim-duration');
      document.body.style.removeProperty('--student-anim-ease');
      document.body.classList.remove('has-student-animations');
      document.body.classList.remove('has-student-animations-disabled');
      return;
    }

    // Build theme key and pick theme
    const key = `${user?.level || 'A'}-${user?.gender || 'male'}`;
    const theme = THEMES[key] || THEMES['A-male'];

    // Apply gradient and keep it fixed
    document.body.style.backgroundImage = gradientFor(theme);
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.transition = 'background 600ms ease';

    // Apply animation variables on body for CSS to consume
    const anim = theme.anim || { scale: 1, translateY: 0, duration: 360, easing: 'ease', type: 'none' };
    document.body.style.setProperty('--student-anim-scale', String(anim.scale));
    document.body.style.setProperty('--student-anim-translateY', `${anim.translateY}px`);
    document.body.style.setProperty('--student-anim-duration', `${anim.duration}ms`);
    document.body.style.setProperty('--student-anim-ease', anim.easing);

    // Add a body class to indicate animations are active
    document.body.classList.add('has-student-animations');

    // If the profile requests no motion, add a disabling class
    if (anim.type === 'none') {
      document.body.classList.add('has-student-animations-disabled');
    } else {
      document.body.classList.remove('has-student-animations-disabled');
    }

    // Cleanup on unmount or before next run
    return () => {
      // Keep transition but clear gradient and variables
      document.body.style.backgroundImage = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.removeProperty('--student-anim-scale');
      document.body.style.removeProperty('--student-anim-translateY');
      document.body.style.removeProperty('--student-anim-duration');
      document.body.style.removeProperty('--student-anim-ease');
      document.body.classList.remove('has-student-animations');
      document.body.classList.remove('has-student-animations-disabled');
    };
  }, [role, user?.level, user?.gender]);

  // Pure side-effect component — nothing to render.
  return null;
}
