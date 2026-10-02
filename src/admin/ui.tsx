import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useBackLayer } from '../hooks/useBackLayer';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export const inputClass =
  'w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-3">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('rounded-2xl border border-line bg-surface shadow-sm', className)}>{children}</div>
);

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';
const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  primary: 'bg-primary-soft text-primary',
};
export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'neutral', children }) => (
  <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold', toneClass[tone])}>
    {children}
  </span>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    busy?: boolean;
    icon?: React.ReactNode;
  }
> = ({ variant = 'secondary', busy, icon, children, className, disabled, ...rest }) => (
  <button
    type="button"
    {...rest}
    disabled={disabled || busy}
    className={cx(
      'inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:pointer-events-none disabled:opacity-60',
      variant === 'primary' && 'bg-primary text-surface shadow-sm hover:bg-primary-hover',
      variant === 'secondary' && 'border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink',
      variant === 'danger' && 'border border-danger/30 bg-danger-soft text-danger-ink hover:bg-danger hover:text-surface',
      variant === 'ghost' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      className
    )}
  >
    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
    {children}
  </button>
);

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-bold text-ink-2">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
  </label>
);

export const ErrorNote: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-[13px] font-bold text-danger-ink">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  ) : null;

export const EmptyState: React.FC<{ title: string; hint?: string; action?: React.ReactNode }> = ({ title, hint, action }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
    <p className="text-sm font-bold text-ink">{title}</p>
    {hint && <p className="max-w-sm text-[13px] text-ink-3">{hint}</p>}
    {action}
  </div>
);

export const Spinner: React.FC<{ label?: string }> = ({ label = 'در حال بارگذاری...' }) => (
  <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-3">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>{label}</span>
  </div>
);

/** A centered dialog; Escape and the backdrop close it. */
export const Dialog: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, footer, wide }) => {
  useBackLayer(true, onClose);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-xl sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-extrabold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="بستن" className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

export const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : `${d.toLocaleDateString('fa-IR')} ${d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
};

export const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'خطای ناشناخته');
