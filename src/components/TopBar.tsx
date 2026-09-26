import React from 'react';
import { HelpCircle, Settings, LogOut } from 'lucide-react';
import { Screen } from '../types';

interface TopBarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
}

const SCREEN_TITLES: Record<string, string> = {
  home: 'میز کار',
  learning: 'مسیر یادگیری',
  library: 'کتابخانه',
  decisions: 'پرونده‌ها',
  newDecision: 'تصمیم جدید',
  question: 'چک‌لیست ارزیابی',
  report: 'شناسنامه تصمیم',
  why: 'چرا درنگ؟',
  perimeters: 'مدل PERIMETERS',
  skills: 'رهبری هوشیار',
  sonic: 'ابزارهای SONIC',
  people: 'پنج الگوی تصمیم',
  stories: 'روایت‌ها و تجارب',
  challenge: 'چالش کشف',
  book: 'پرسش‌های کتاب Tune In',
  farewell: 'بدرود',
};

export const TopBar: React.FC<TopBarProps> = ({
  currentScreen,
  onNavigate,
  onOpenHelp,
  onOpenSettings,
  onExit,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 transition-colors">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Zone 1: Single text element wordmark with subtle subtitle */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-right transition-opacity hover:opacity-80 focus-visible:rounded-lg"
          aria-label="رفتن به صفحه اصلی درنگ"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg shadow-sm shadow-blue-500/20">
            د
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              دِرانْـگ
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              پردیس نوآوری گِرا
            </span>
          </div>
        </button>

        {/* Zone 2: Clean unboxed metadata / screen title */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>سامانه تصمیم‌گیری هوشیار</span>
          <span aria-hidden="true">·</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {SCREEN_TITLES[currentScreen] || 'درنگ'}
          </span>
        </div>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenHelp}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            aria-label="راهنمای این صفحه"
            title="راهنما"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            aria-label="تنظیمات"
            title="تنظیمات"
          >
            <Settings className="h-5 w-5" />
          </button>

          <button
            onClick={onExit}
            className="flex h-10 items-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
            aria-label="خروج از درنگ"
            title="خروج"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xs:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
