import React from 'react';
import { HelpCircle, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { Screen } from '../types';

interface TopBarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
  onOpenAdmin?: () => void;
  brandName?: string;
  orgName?: string;
  tagline?: string;
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
  admin: 'مدیریت محتوا',
};

export const TopBar: React.FC<TopBarProps> = ({
  currentScreen,
  onNavigate,
  onOpenHelp,
  onOpenSettings,
  onExit,
  onOpenAdmin,
  brandName = 'دِرانْـگ',
  orgName = 'پردیس نوآوری گِرا',
  tagline = 'سامانه تصمیم‌گیری هوشیار',
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-surface/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Zone 1: Single text element wordmark with subtle subtitle */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-right transition-opacity hover:opacity-80 focus-visible:rounded-lg"
          aria-label={`رفتن به صفحه اصلی ${brandName}`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-surface font-extrabold text-lg shadow-sm">
            {brandName.charAt(0) || 'د'}
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-ink leading-tight">
              {brandName}
            </span>
            <span className="text-[13px] font-medium text-ink-3">
              {orgName}
            </span>
          </div>
        </button>

        {/* Zone 2: Clean unboxed metadata / screen title */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-ink-3">
          <span>{tagline}</span>
          <span aria-hidden="true">·</span>
          <span className="text-primary font-bold">
            {SCREEN_TITLES[currentScreen] || brandName}
          </span>
        </div>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5">
          {onOpenAdmin && currentScreen !== 'admin' && (
            <button
              onClick={onOpenAdmin}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-primary transition-colors"
              aria-label="پنل مدیریت محتوا"
              title="پنل مدیریت محتوا"
            >
              <ShieldCheck className="h-5 w-5" />
            </button>
          )}

          <button
            onClick={onOpenHelp}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
            aria-label="راهنمای این صفحه"
            title="راهنما"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
            aria-label="تنظیمات"
            title="تنظیمات"
          >
            <Settings className="h-5 w-5" />
          </button>

          <button
            onClick={onExit}
            className="flex h-10 items-center gap-1.5 px-2.5 rounded-xl text-xs font-bold text-danger hover:bg-danger-soft transition-colors"
            aria-label="خروج از برنامه"
            title="خروج"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
