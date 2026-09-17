import { useEffect, useRef, useState } from 'react';

/**
 * One-shot scroll-reveal hook. Returns `[ref, isVisible]`.
 *
 * Once the observed element scrolls into view (default: 10% threshold,
 * with a 50px bottom rootMargin so the reveal fires slightly before the
 * element fully enters the viewport), `isVisible` flips to true and stays
 * true. The observer disconnects after the first intersection so there's
 * no flicker when scrolling back up.
 *
 * Pair with the `reveal-up` (or `reveal-scale`) CSS classes from
 * index.css. Apply the base class always; the hook adds `is-visible`
 * when it should reveal.
 *
 *   const [ref, visible] = useScrollReveal();
 *   <div
 *     ref={ref}
 *     className={`reveal-up ${visible ? 'is-visible' : ''}`}
 *   >…</div>
 *
 * Respects the OS-level "Reduce motion" preference: when set, the
 * observer is skipped and the element is marked visible immediately,
 * which (combined with the CSS reduced-motion block) means the content
 * appears in place with no transition.
 */
export function useScrollReveal({
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
} = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return undefined;

    // Honour reduced-motion preference: show everything immediately.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVisible(true);
      return undefined;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return [ref, visible];
}

/**
 * Tiny wrapper component that hides the ref-passing boilerplate.
 *
 *   <Reveal as="section" className="my-section">…</Reveal>
 *
 * Defaults to a <div>. Pass any extra className you need; `reveal-up` and
 * `is-visible` are merged in automatically. Use `delay` (1–6) to apply
 * one of the .reveal-d* stagger classes.
 */
export function Reveal({
  as: Tag = 'div',
  className = '',
  delay = 0,
  variant = 'up', // 'up' | 'scale'
  children,
  ...rest
}) {
  const [ref, visible] = useScrollReveal();
  const base = variant === 'scale' ? 'reveal-scale' : 'reveal-up';
  const delayClass = delay >= 1 && delay <= 6 ? `reveal-d${delay}` : '';
  return (
    <Tag
      ref={ref}
      className={`${base} ${delayClass} ${visible ? 'is-visible' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
