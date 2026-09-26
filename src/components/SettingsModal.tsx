import React, { useRef, useState } from 'react';
import {
  Volume2,
  User,
  Sliders,
  Download,
  Upload,
  Trash2,
  Compass,
  Moon,
  Sun,
  Eye,
  Activity,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings, UserProfile } from '../types';
import { Modal } from './Modal';

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
  onNavigateToAdmin?: () => void;
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
  onNavigateToAdmin,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline edit name form state
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState(profile.first);
  const [lastNameInput, setLastNameInput] = useState(profile.last);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleFontChange = (delta: number) => {
    const next = Math.max(0.85, Math.min(1.25, +(settings.font + delta).toFixed(2)));
    onUpdateSettings({ font: next });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRestore(file);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstNameInput.trim()) {
      setNameError('نام نمی‌تواند خالی باشد');
      return;
    }
    onUpdateProfile({
      first: firstNameInput.trim(),
      last: lastNameInput.trim(),
    });
    setNameError(null);
    setIsEditingName(false);
  };

  return (
    <Modal
      onClose={onClose}
      title="تنظیمات و دسترسی‌پذیری"
      icon={<Sliders className="h-5 w-5 text-primary" />}
      maxWidth="max-w-lg"
      ariaLabelledBy="settingsModalTitle"
    >
      <div className="space-y-5 text-right">
        {/* User Profile Info & Inline Edit Form */}
        <div className="border-b border-line pb-4">
          {!isEditingName ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-ink block">
                  کاربر گرامی
                </span>
                <span className="text-sm text-ink-2 font-medium">
                  {profile.first ? `${profile.first} ${profile.last}`.trim() : 'دوست همراه'}
                </span>
              </div>
              <button
                onClick={() => {
                  setFirstNameInput(profile.first);
                  setLastNameInput(profile.last);
                  setNameError(null);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-2 transition-colors"
                aria-label="ویرایش نام و نام خانوادگی"
              >
                <User className="h-3.5 w-3.5" />
                <span>ویرایش نام</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveName} className="space-y-3 p-3 bg-surface-2 rounded-2xl border border-line animate-fadeIn">
              <span className="text-xs font-bold text-ink block">
                ویرایش مشخصات شما
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="editFirstName" className="block text-[13px] font-bold text-ink-2 mb-1">
                    نام (الزامی)
                  </label>
                  <input
                    id="editFirstName"
                    type="text"
                    required
                    maxLength={40}
                    value={firstNameInput}
                    onChange={(e) => {
                      setFirstNameInput(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="نام"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  />
                </div>
                <div>
                  <label htmlFor="editLastName" className="block text-[13px] font-bold text-ink-2 mb-1">
                    نام خانوادگی
                  </label>
                  <input
                    id="editLastName"
                    type="text"
                    maxLength={50}
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    placeholder="نام خانوادگی"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  />
                </div>
              </div>

              {nameError && (
                <p className="text-xs font-bold text-danger">{nameError}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-bold text-ink-2 hover:bg-surface"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>ذخیره نام</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Font Size Scaling */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold text-ink block">
              اندازه قلم متون
            </span>
            <span className="text-[13px] text-ink-3">
              برای خوانایی آسان‌تر روی گوشی و تبلت
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFontChange(-0.05)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-2 font-bold text-ink hover:bg-line"
              aria-label="کاهش اندازه قلم"
            >
              −
            </button>
            <span className="min-w-[40px] text-center text-xs font-bold tabular-nums text-ink">
              {Math.round(settings.font * 100)}٪
            </span>
            <button
              onClick={() => handleFontChange(0.05)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-2 font-bold text-ink hover:bg-line"
              aria-label="افزایش اندازه قلم"
            >
              +
            </button>
          </div>
        </div>

        {/* High Contrast Mode */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold text-ink block">
              حالت کنتراست تقویت‌شده
            </span>
            <span className="text-[13px] text-ink-3">
              مرزهای تیره و تفکیک حداکثری رنگ‌ها در محیط‌های پرنور
            </span>
          </div>
          <button
            onClick={() => onUpdateSettings({ highContrast: !settings.highContrast })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.highContrast ? 'bg-primary' : 'bg-line-strong'
            }`}
            role="switch"
            aria-checked={settings.highContrast}
            aria-label="فعال‌سازی حالت کنتراست تقویت‌شده"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                settings.highContrast ? '-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Night Mode Toggle */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold text-ink block">
              حالت شب (Night Mode)
            </span>
            <span className="text-[13px] text-ink-3">
              رنگ‌های تیره و ملایم برای استفاده در شب
            </span>
          </div>
          <button
            onClick={() =>
              onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
            }
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.theme === 'dark' ? 'bg-primary' : 'bg-line-strong'
            }`}
            role="switch"
            aria-checked={settings.theme === 'dark'}
            aria-label="فعال‌سازی حالت شب"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                settings.theme === 'dark' ? '-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Reduce Motion Toggle */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold text-ink block">
              کاهش حرکت و انیمیشن
            </span>
            <span className="text-[13px] text-ink-3">
              توقف جلوه‌های حرکتی و انیمیشن‌ها برای تجربه آرام‌تر
            </span>
          </div>
          <button
            onClick={() => onUpdateSettings({ motion: !settings.motion })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              !settings.motion ? 'bg-primary' : 'bg-line-strong'
            }`}
            role="switch"
            aria-checked={!settings.motion}
            aria-label="کاهش حرکت و انیمیشن"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                !settings.motion ? '-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Audio Effects Toggle & Sliders */}
        <div className="flex flex-col gap-3 border-b border-line pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink block">
                افکت‌های صوتی کلیدها
              </span>
              <span className="text-[13px] text-ink-3">
                صدای تیک ثبت گزینه‌ها، چالش‌ها و بازخوردها
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ sound: !settings.sound })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.sound ? 'bg-primary' : 'bg-line-strong'
              }`}
              role="switch"
              aria-checked={settings.sound}
              aria-label="فعال‌سازی افکت‌های صوتی"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                  settings.sound ? '-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.sound && (
            <div className="flex items-center gap-3 pr-2">
              <span className="text-[13px] text-ink-3 min-w-[70px]">بلندی افکت:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(settings.fxVolume * 100)}
                onChange={(e) => onUpdateSettings({ fxVolume: Number(e.target.value) / 100 })}
                className="h-1.5 w-full cursor-pointer accent-primary"
                aria-label="بلندی افکت صوتی"
              />
              <span className="text-[13px] tabular-nums text-ink-3 w-8 text-left">
                {Math.round(settings.fxVolume * 100)}٪
              </span>
            </div>
          )}
        </div>

        {/* Narrative Audio Volume Slider */}
        <div className="flex flex-col gap-2 border-b border-line pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink block">
                بلندی صدای روایت‌ها
              </span>
              <span className="text-[13px] text-ink-3">
                تنظیم حجم صدای پخش‌کننده فایل‌های صوتی
              </span>
            </div>
            <span className="text-[13px] tabular-nums text-ink-3">
              {Math.round(settings.volume * 100)}٪
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.volume * 100)}
            onChange={(e) => onUpdateSettings({ volume: Number(e.target.value) / 100 })}
            className="h-1.5 w-full cursor-pointer accent-primary"
            aria-label="بلندی صدای روایت‌ها"
          />
        </div>

        {/* Tour & Guides */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold text-ink block">
              تور معرفی تصویری درنگ
            </span>
            <span className="text-[13px] text-ink-3">
              مشاهده دوباره اسلایدهای معرفی امکانات
            </span>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenTour();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink hover:bg-line transition-colors"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>مشاهده تور</span>
          </button>
        </div>

        {/* Data Backup & Restore */}
        <div className="space-y-2 border-b border-line pb-4">
          <span className="text-xs font-bold text-ink block">
            پشتیبان‌گیری از پرونده‌ها
          </span>
          <span className="text-[13px] text-ink-3 block mb-2">
            خروجی پرونده‌ها و پیشرفت شما در یک فایل JSON امن ذخیره می‌شود.
          </span>
          <div className="flex gap-2">
            <button
              onClick={onBackup}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2 text-xs font-bold text-ink hover:bg-surface-2 shadow-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>دریافت پشتیبان (JSON)</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2 text-xs font-bold text-ink hover:bg-surface-2 shadow-sm transition-colors"
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
              aria-label="انتخاب فایل پشتیبان جهت بازیابی"
            />
          </div>
        </div>

        {/* Admin Panel Link */}
        {onNavigateToAdmin && (
          <div className="rounded-2xl border border-line bg-surface-2 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink block">
                مدیریت محتوای سامانه
              </span>
              <span className="text-[12px] text-ink-3">
                ویرایش ایستگاه‌ها، سوالات، متون و تنظیمات برند
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onNavigateToAdmin();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>پنل مدیریت</span>
            </button>
          </div>
        )}

        {/* Danger zone: Reset */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-bold text-danger block">
              پاک‌سازی کامل اطلاعات
            </span>
            <span className="text-[13px] text-ink-3">
              حذف پرونده‌ها، امتیازات و تنظیمات از این مرورگر
            </span>
          </div>
          <button
            onClick={onClearData}
            className="flex items-center gap-1 rounded-xl bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>پاک‌سازی</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
