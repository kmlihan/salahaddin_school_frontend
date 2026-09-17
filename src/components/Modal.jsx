import { useEffect, useRef } from 'react';

/**
 * Base modal. Shows an overlay + centered card. Closes on ESC or click on
 * the overlay (when `dismissible` is true). The first focusable child gets
 * focus on open; focus returns to the element that had it before opening
 * (the browser handles this automatically because we don't move focus into
 * a portal — the modal lives in the same React tree).
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
  width = 'max-w-md',
}) {
  const panelRef = useRef(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  // Auto-focus the first input/button inside the panel
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelector(
      'input, textarea, select, button:not([data-dialog-close])'
    );
    focusable?.focus();
  }, [open]);

  if (!open) return null;

  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget && dismissible) onClose?.();
  };

  return (
    <div
      onClick={onOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        ref={panelRef}
        className={`card w-full ${width}`}
        style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="text-lg font-semibold mb-3">{title}</h2>
        )}
        <div>{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}
