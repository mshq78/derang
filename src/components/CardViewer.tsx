import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X } from 'lucide-react';
import { useBackLayer } from '../hooks/useBackLayer';

interface CardViewerProps {
  name: string;
  frontUrl: string;
  backUrl?: string;
  initialSide?: 'front' | 'back';
  /** Called whenever a side is shown (including the first), so a caller can tell both were seen. */
  onSideShown?: (side: 'front' | 'back') => void;
  onClose: () => void;
}

// Card posters carry text, so they are shown whole (object-contain) at the
// largest size that fits, and flipped in 3D to reveal the back.
const CARD_WIDTH = 'min(92vw, calc(76vh * 2 / 3))';

const Face: React.FC<{ url: string; alt: string; back?: boolean }> = ({ url, alt, back }) => (
  <div
    className="absolute inset-0 flex items-center justify-center"
    style={{
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      transform: back ? 'rotateY(180deg)' : undefined,
    }}
  >
    <img
      src={url}
      alt={alt}
      decoding="async"
      fetchPriority="high"
      className="max-h-full max-w-full rounded-2xl object-contain"
      style={{ filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.45))' }}
    />
  </div>
);

export const CardViewer: React.FC<CardViewerProps> = ({
  name,
  frontUrl,
  backUrl,
  initialSide = 'front',
  onSideShown,
  onClose,
}) => {
  useBackLayer(true, onClose);
  const [flipped, setFlipped] = useState(initialSide === 'back' && !!backUrl);
  const [sawBack, setSawBack] = useState(initialSide === 'back' && !!backUrl);
  useEffect(() => {
    if (flipped) setSawBack(true);
  }, [flipped]);
  useEffect(() => {
    onSideShown?.(flipped ? 'back' : 'front');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab' && dialogRef.current) {
        // Keep keyboard focus inside the viewer.
        const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button'));
        if (buttons.length === 0) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`کارت ${name}`}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-[rgba(20,18,14,0.84)] p-4 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="animate-cardIn"
        style={{ perspective: '1800px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative"
          style={{
            width: CARD_WIDTH,
            aspectRatio: '2 / 3',
            transformStyle: 'preserve-3d',
            transition: 'transform 750ms cubic-bezier(0.2, 0.75, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'none',
          }}
        >
          <Face url={frontUrl} alt={`روی کارت ${name}`} />
          {backUrl && <Face url={backUrl} alt={`پشت کارت ${name}`} back />}
        </div>
      </div>

      {backUrl && !sawBack && (
        <p className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white" onClick={(e) => e.stopPropagation()}>
          پشت کارت هم مطلب دارد؛ دکمه‌ی «چرخاندن کارت» را بزنید
        </p>
      )}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {backUrl && (
          <button
            ref={firstButtonRef}
            onClick={() => setFlipped((f) => !f)}
            className={`flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-surface shadow-lg hover:bg-primary-hover active:scale-95 transition-all ${sawBack ? '' : 'animate-pulse'}`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>{flipped ? 'نمایش روی کارت' : 'چرخاندن کارت'}</span>
          </button>
        )}
        <button
          ref={backUrl ? undefined : firstButtonRef}
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors"
          aria-label="بستن نمای کارت"
        >
          <X className="h-4 w-4" />
          <span>بستن</span>
        </button>
      </div>
    </div>,
    document.body
  );
};
