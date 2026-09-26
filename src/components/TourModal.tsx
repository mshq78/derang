import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Compass, CheckSquare, HelpCircle, Layers, BookOpen } from 'lucide-react';
import { toPersianDigits } from '../utils/helpers';

interface TourModalProps {
  onClose: () => void;
}

export const TourModal: React.FC<TourModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: 'میز کار و شروع ارزیابی تصمیم',
      desc: 'درنگ همراه همیشگی شما در بزنگاه‌های حیاتی است. با انتخاب «بررسی تصمیم جدید»، صورت مسئله را شفاف کنید و گام به گام آن را به بوته نقد بگذارید.',
      icon: CheckSquare,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      title: 'پنج ایستگاه و بیست پرسش طلایی',
      desc: 'سؤالات چک‌لیست از تعریف مسئله تا مدیریت ریسک و تعهد اجرایی طراحی شده‌اند. پاسخ «خیر» یا «نامشخص» شکست نیست، بلکه چراغ راهی برای کشف خلأهای پنهان است.',
      icon: Compass,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      title: 'راهنما و تمرین ۶۰ ثانیه‌ای در هر سؤال',
      desc: 'هر زمان در تفسیر یک سؤال مردد شدید، دکمه‌های «این سؤال یعنی چه؟» و «تمرین ۶۰ ثانیه‌ای» به کمک شما می‌آیند تا ابهام را برطرف کنند.',
      icon: HelpCircle,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      title: 'مسیر یادگیری و مدل PERIMETERS',
      desc: 'با ۱۰ دام شناختی، ۷ شایستگی رهبری هوشیار، و ابزارهای مکث راهبردی SONIC آشنا شوید؛ هر بخش کوتاه و مرحله‌به‌مرحله است.',
      icon: Layers,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
    },
    {
      title: 'کتابخانه جامع و پرونده‌های آفلاین',
      desc: 'روایت‌های صوتی، خلاصه‌های کتاب Tune In و چالش‌های تعاملی را در کتابخانه مرور کنید. تمام داده‌ها در مرورگر شما به صورت امن و خصوصی باقی می‌مانند.',
      icon: BookOpen,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40',
    },
  ];

  const current = slides[step];
  const Icon = current.icon;
  const isLast = step === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tourTitle"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-slideUp">
        {/* Drag handle for mobile */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              راهنمای تعاملی درنگ
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">
              گام {toPersianDigits(step + 1)} از {toPersianDigits(slides.length)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            aria-label="بستن راهنما"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-right flex flex-col items-center sm:items-start">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${current.color} mb-4 shadow-sm`}>
            <Icon className="h-8 w-8" />
          </div>

          <h3 id="tourTitle" className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
            {current.title}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {current.desc}
          </p>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 mt-6 mb-2">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === step
                    ? 'w-6 bg-blue-600'
                    : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 disabled:opacity-30 disabled:pointer-events-none hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-2 px-3 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
            <span>قبلی</span>
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            <span>{isLast ? 'ورود به درنگ' : 'گام بعدی'}</span>
            {isLast ? <Check className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
