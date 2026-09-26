import React from 'react';
import { X, Lightbulb, Compass } from 'lucide-react';
import { HELP_CONTENT } from '../data/dorangData';
import { Screen } from '../types';

interface HelpModalProps {
  screen: Screen;
  onClose: () => void;
  onOpenTour: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ screen, onClose, onOpenTour }) => {
  const content = HELP_CONTENT[screen] || HELP_CONTENT.home;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="helpTitle"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-slideUp">
        {/* Mobile drag handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold text-xs">
              ؟
            </span>
            <h3 id="helpTitle" className="text-base font-extrabold text-slate-900 dark:text-white">
              {content.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            aria-label="بستن راهنما"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-right space-y-4">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {content.body}
          </p>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
              <Lightbulb className="h-4 w-4" />
              <span>اصل درنگ:</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
              {content.tip}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <button
            onClick={() => {
              onClose();
              onOpenTour();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
          >
            <Compass className="h-4 w-4" />
            <span>تور آموزشی استفاده از درنگ</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 transition-colors"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
};
