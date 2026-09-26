import React, { useRef } from 'react';
import {
  X,
  Volume2,
  Type,
  User,
  Sliders,
  Sparkles,
  Download,
  Upload,
  Trash2,
  Compass,
} from 'lucide-react';
import { AppSettings, UserProfile } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  profile: UserProfile;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateProfile: (newProfile: UserProfile) => void;
  onClose: () => void;
  onOpenTour: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
  onClearData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  profile,
  onUpdateSettings,
  onUpdateProfile,
  onClose,
  onOpenTour,
  onBackup,
  onRestore,
  onClearData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFontChange = (delta: number) => {
    const next = Math.max(0.85, Math.min(1.25, +(settings.font + delta).toFixed(2)));
    onUpdateSettings({ font: next });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRestore(file);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settingsTitle"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-slideUp">
        {/* Mobile drag handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 id="settingsTitle" className="text-base font-extrabold text-slate-900 dark:text-white">
              تنظیمات و دسترسی‌پذیری
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            aria-label="بستن تنظیمات"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 text-right space-y-5">
          {/* User Profile Info */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                کاربر گرامی
              </span>
              <span className="text-[11px] text-slate-500">
                {profile.first ? `${profile.first} ${profile.last}` : 'دوست همراه'}
              </span>
            </div>
            <button
              onClick={() => {
                const f = prompt('نام کوچک خود را وارد کنید:', profile.first);
                if (f !== null) {
                  const l = prompt('نام خانوادگی خود را وارد کنید:', profile.last);
                  if (l !== null) {
                    onUpdateProfile({ first: f.trim(), last: l.trim() });
                  }
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              <span>ویرایش نام</span>
            </button>
          </div>

          {/* Font Size Scaling */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                اندازه قلم متون
              </span>
              <span className="text-[11px] text-slate-500">
                برای خوانایی آسان‌تر روی گوشی و تبلت
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFontChange(-0.05)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                aria-label="کاهش قلم"
              >
                −
              </button>
              <span className="min-w-[40px] text-center text-xs font-semibold tabular-nums">
                {Math.round(settings.font * 100)}٪
              </span>
              <button
                onClick={() => handleFontChange(0.05)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                aria-label="افزایش قلم"
              >
                +
              </button>
            </div>
          </div>

          {/* Audio Effects Toggle & Sliders */}
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  افکت‌های صوتی کلیدها
                </span>
                <span className="text-[11px] text-slate-500">
                  صدای تیک ثبت گزینه‌ها، چالش‌ها و بازخوردها
                </span>
              </div>
              <button
                onClick={() => onUpdateSettings({ sound: !settings.sound })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.sound ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={settings.sound}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.sound ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.sound && (
              <div className="flex items-center gap-3 pr-2">
                <span className="text-[11px] text-slate-500 min-w-[70px]">بلندی افکت:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(settings.fxVolume * 100)}
                  onChange={(e) => onUpdateSettings({ fxVolume: Number(e.target.value) / 100 })}
                  className="h-1.5 w-full cursor-pointer accent-blue-600"
                  aria-label="بلندی افکت صوتی"
                />
                <span className="text-[11px] tabular-nums text-slate-500 w-8 text-left">
                  {Math.round(settings.fxVolume * 100)}٪
                </span>
              </div>
            )}
          </div>

          {/* High Contrast Mode */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                حالت کنتراست تقویت‌شده
              </span>
              <span className="text-[11px] text-slate-500">
                مرزهای تیره و تفکیک حداکثری رنگ‌ها در محیط‌های پرنور
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ highContrast: !settings.highContrast })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.highContrast ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={settings.highContrast}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.highContrast ? '-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tour & Guides */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                تور معرفی تصویری درنگ
              </span>
              <span className="text-[11px] text-slate-500">
                مشاهده دوباره اسلایدهای معرفی امکانات
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenTour();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>مشاهده تور</span>
            </button>
          </div>

          {/* Data Backup & Restore */}
          <div className="space-y-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              پشتیبان‌گیری از پرونده‌ها
            </span>
            <span className="text-[11px] text-slate-500 block mb-2">
              خروجی پرونده‌ها و پیشرفت شما در یک فایل JSON امن ذخیره می‌شود.
            </span>
            <div className="flex gap-2">
              <button
                onClick={onBackup}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>دریافت پشتیبان (JSON)</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
              >
                <Upload className="h-4 w-4" />
                <span>بازیابی فایل</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Danger zone: Reset */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                پاک‌سازی کامل اطلاعات
              </span>
              <span className="text-[11px] text-slate-500">
                حذف پرونده‌ها و تنظیمات از این مرورگر
              </span>
            </div>
            <button
              onClick={onClearData}
              className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>پاک‌سازی</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
