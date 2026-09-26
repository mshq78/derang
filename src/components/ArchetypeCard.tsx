import React, { useState } from 'react';
import { RefreshCw, ExternalLink, Sparkles, AlertTriangle } from 'lucide-react';
import { ArchetypeDef } from '../types';

interface ArchetypeCardProps {
  archetype: ArchetypeDef;
  onExploreTest?: () => void;
}

// Stylized, resilient SVG portraits for each archetype
const ArchetypePortrait: React.FC<{ id: string; name: string }> = ({ id, name }) => {
  const getColors = () => {
    switch (id) {
      case 'davinci':
        return { bg: '#fffbeb', primary: '#b45309', accent: '#d97706', initial: 'داوینچی' };
      case 'lincoln':
        return { bg: '#eff6ff', primary: '#1d4ed8', accent: '#3b82f6', initial: 'لینکلن' };
      case 'edison':
        return { bg: '#f0fdf4', primary: '#047857', accent: '#10b981', initial: 'ادیسون' };
      case 'churchill':
        return { bg: '#fff1f2', primary: '#be123c', accent: '#f43f5e', initial: 'چرچیل' };
      case 'einstein':
      default:
        return { bg: '#faf5ff', primary: '#7e22ce', accent: '#a855f7', initial: 'اینشتین' };
    }
  };

  const c = getColors();

  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner"
      style={{ backgroundColor: c.bg }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
      <div className="flex flex-col items-center justify-center p-6 text-center z-10">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-md border-2 border-white/80"
          style={{ backgroundColor: c.primary, color: '#ffffff' }}
        >
          <span className="text-2xl font-black">{name.slice(0, 1)}</span>
        </div>
        <span
          className="mt-3 text-base font-black tracking-tight"
          style={{ color: c.primary }}
        >
          {name}
        </span>
      </div>
    </div>
  );
};

export const ArchetypeCard: React.FC<ArchetypeCardProps> = ({ archetype }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Front / Back Toggle Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          {/* Portrait frame */}
          <div className="w-36 sm:w-44 flex-shrink-0">
            <ArchetypePortrait id={archetype.id} name={archetype.name} />
          </div>

          {/* Details body */}
          <div className="flex-1 text-right w-full">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {archetype.title}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {archetype.name}
                </h3>
              </div>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                aria-label="مشاهده روی دیگر کارت"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isFlipped ? 'روی کارت (قوت)' : 'پشت کارت (سایه)'}</span>
              </button>
            </div>

            {!isFlipped ? (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span>نقطه قوت بارز تصمیم‌گیری:</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {archetype.strength}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs italic text-slate-600 dark:text-slate-300 leading-relaxed text-right">
                    {archetype.quote}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>روی دیگر نقطه قوت (خطر افراط / سایه):</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {archetype.shadow}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50/80 p-3.5 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block mb-1">
                    پرسش درنگ برای تصمیم شما:
                  </span>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 leading-relaxed">
                    {archetype.reflectionQuestion}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* External Gera test callout */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="text-right">
          <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
            هنوز الگوی تصمیم‌گیری خود را نمی‌دانید؟
          </span>
          <span className="text-[11px] text-blue-700 dark:text-blue-400">
            می‌توانید آزمون پنج شخصیت را در وب‌سایت پردیس نوآوری گِرا انجام دهید.
          </span>
        </div>
        <a
          href="https://test.igera.ir/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-colors whitespace-nowrap"
        >
          <span>شروع آزمون گِرا</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};
