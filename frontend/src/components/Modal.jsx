import { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, message, icon, iconType, children, showClose = true, closeOnOverlay = true }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && ref.current && showClose) {
      const first = ref.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      first?.focus();
    }
  }, [open, showClose]);

  if (!open) return null;

  return (
    <div
      className="hg-modal-overlay"
      onClick={closeOnOverlay ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="hg-modal" ref={ref} onClick={(e) => e.stopPropagation()}>
        {icon && (
          <div className={`hg-modal-icon ${iconType || ''}`}>
            {icon}
          </div>
        )}
        {title && <div className="hg-modal-title">{title}</div>}
        {message && <div className="hg-modal-message">{message}</div>}
        {children}
        {showClose && (
          <div className="hg-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
