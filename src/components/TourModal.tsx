import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Compass,
  CheckSquare,
  HelpCircle,
  Layers,
  BookOpen,
  Sparkles,
  Award,
} from 'lucide-react';
import { toPersianDigits } from '../utils/helpers';
import { TourSlide } from '../types/content';
import { Modal } from './Modal';

interface TourModalProps {
  onClose: () => void;
  tourSlides?: TourSlide[];
}

const ICON_MAP = {
  CheckSquare,
  Compass,
  HelpCircle,
  Layers,
  BookOpen,
  Sparkles,
  Award,
};

const TONE_MAP = {
  primary: 'text-primary bg-primary-soft',
  success: 'text-success bg-success-soft',
  warning: 'text-warning bg-warning-soft',
  accent: 'text-accent bg-accent-soft',
};

const DEFAULT_SLIDES = [
  {
    title: 'میز کار و شروع ارزیابی تصمیم',
    desc: 'درنگ همراه همیشگی شما در بزنگاه‌های حیاتی است. با انتخاب «بررسی تصمیم جدید»، صورت مسئله را شفاف کنید و گام به گام آن را به بوته نقد بگذارید.',
    icon: CheckSquare,
    color: 'text-primary bg-primary-soft',
  },
  {
    title: 'پنج ایستگاه و بیست پرسش طلایی',
    desc: 'سؤالات چک‌لیست از تعریف مسئله تا مدیریت ریسک و تعهد اجرایی طراحی شده‌اند. پاسخ «خیر» یا «نامشخص» شکست نیست، بلکه چراغ راهی برای کشف خلأهای پنهان است.',
    icon: Compass,
    color: 'text-success bg-success-soft',
  },
  {
    title: 'راهنما و تمرین ۶۰ ثانیه‌ای در هر سؤال',
    desc: 'هر زمان در تفسیر یک سؤال مردد شدید، دکمه‌های «این سؤال یعنی چه؟» و «تمرین ۶۰ ثانیه‌ای» به کمک شما می‌آیند تا ابهام را برطرف کنند.',
    icon: HelpCircle,
    color: 'text-warning bg-warning-soft',
  },
  {
    title: 'مسیر یادگیری و مدل PERIMETERS',
    desc: 'با ۱۰ دام شناختی، ۷ شایستگی رهبری هوشیار، و ابزارهای مکث راهبردی SONIC آشنا شوید؛ هر بخش کوتاه و مرحله‌به‌مرحله است.',
    icon: Layers,
    color: 'text-accent bg-accent-soft',
  },
  {
    title: 'کتابخانه جامع و پرونده‌های آفلاین',
    desc: 'روایت‌های صوتی، خلاصه‌های کتاب Tune In و چالش‌های تعاملی را در کتابخانه مرور کنید. تمام داده‌ها در مرورگر شما به صورت امن و خصوصی باقی می‌مانند.',
    icon: BookOpen,
    color: 'text-primary bg-primary-soft',
  },
];

export const TourModal: React.FC<TourModalProps> = ({ onClose, tourSlides }) => {
  const [step, setStep] = useState(0);

  const slides = React.useMemo(() => {
    if (tourSlides && tourSlides.length > 0) {
      const published = tourSlides.filter((s) => s.isPublished);
      if (published.length > 0) {
        return published.map((s) => ({
          title: s.title,
          desc: s.desc,
          icon: ICON_MAP[s.icon] || Compass,
          color: TONE_MAP[s.tone] || 'text-primary bg-primary-soft',
        }));
      }
    }
    return DEFAULT_SLIDES;
  }, [tourSlides]);

  const current = slides[step] || slides[0];
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

  const footer = (
    <>
      <button
        onClick={handlePrev}
        disabled={step === 0}
        className="flex items-center gap-1 text-xs font-bold text-ink-2 disabled:opacity-30 disabled:pointer-events-none hover:text-ink transition-colors py-2 px-3 rounded-lg"
        aria-label="گام قبلی راهنما"
      >
        <ChevronRight className="h-4 w-4" />
        <span>قبلی</span>
      </button>

      <button
        onClick={handleNext}
        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
        aria-label={isLast ? 'ورود به درنگ' : 'گام بعدی راهنما'}
      >
        <span>{isLast ? 'ورود به درنگ' : 'گام بعدی'}</span>
        {isLast ? <Check className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </>
  );

  return (
    <Modal
      onClose={onClose}
      title="راهنمای تعاملی درنگ"
      subtitle={`گام ${toPersianDigits(step + 1)} از ${toPersianDigits(slides.length)}`}
      footer={footer}
      maxWidth="max-w-md"
      ariaLabelledBy="tourModalTitle"
    >
      <div className="flex flex-col items-center sm:items-start text-right">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${current.color} mb-4 shadow-sm border border-line`}>
          <Icon className="h-8 w-8" />
        </div>

        <h3 id="tourModalTitle" className="text-lg font-bold text-ink mb-2">
          {current.title}
        </h3>

        <p className="text-sm text-ink-2 leading-relaxed font-normal">
          {current.desc}
        </p>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mt-6 mb-2">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === step
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-line-strong'
              }`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
};
