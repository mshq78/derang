import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useBackLayer } from '../hooks/useBackLayer';

interface ModalProps {
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'max-w-md',
  ariaLabel,
  ariaLabelledBy,
  showCloseButton = true,
}) => {
  useBackLayer(true, onClose);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus to first focusable element
    const focusableSelectors =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const modalEl = modalRef.current;
    if (modalEl) {
      const focusables = modalEl.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        modalEl.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalEl) {
        const focusables = Array.from(
          modalEl.querySelectorAll<HTMLElement>(focusableSelectors)
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(40,36,30,0.35)] backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-surface border border-line shadow-[0_1px_2px_rgba(60,50,30,0.06),0_4px_16px_rgba(60,50,30,0.05)] animate-slideUp outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1.5 bg-line-strong rounded-full mx-auto my-3 sm:hidden" />

        {/* Header if title or close button exists */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2 text-right">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div>
                {subtitle && (
                  <span className="text-[13px] font-bold text-primary block leading-none mb-1">
                    {subtitle}
                  </span>
                )}
                {title && (
                  <h3
                    id={ariaLabelledBy}
                    className="text-base font-bold text-ink leading-tight"
                  >
                    {title}
                  </h3>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-surface-2 hover:text-ink transition-colors"
                aria-label="بستن پنجره"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 text-right space-y-4">
          {children}
        </div>

        {/* Footer if present */}
        {footer && (
          <div className="border-t border-line bg-surface-2 px-5 py-3.5 flex items-center justify-between">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
