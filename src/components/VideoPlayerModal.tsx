import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, AlertOctagon } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

interface VideoPlayerModalProps {
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 95; // 1:35 in seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, duration]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="videoTitle"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-slideUp">
        {/* Mobile drag handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="text-right">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              ویدئوی تحلیلی و طنز انتقادی
            </span>
            <h3 id="videoTitle" className="text-base font-extrabold text-slate-900 dark:text-white">
              شاه سلطان حسین؛ هزینه گزاف تعلل
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            aria-label="بستن پنجره"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Canvas Presentation Area */}
        <div className="relative aspect-video w-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />

          {/* Graphical Stage Simulation */}
          <div className="z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3 shadow-lg">
              <span className="text-3xl font-black">👑</span>
            </div>
            <p className="text-sm font-bold text-slate-200 max-w-xs leading-relaxed">
              «هر چه تقدیر باشد همان خواهد شد!»
            </p>
            <span className="text-[11px] text-slate-400 mt-1">
              کالبدشکافی طنزآمیز و تلخ فرار از مسئولیت تصمیم‌گیری در تاریخ ایران
            </span>
          </div>

          {/* Video bottom scrub bar */}
          <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between text-[11px] text-slate-300 font-mono">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        {/* Controls and Reflection */}
        <div className="flex-1 overflow-y-auto p-5 text-right space-y-4">
          <div className="flex items-center gap-3 justify-center border-b border-slate-100 pb-3 dark:border-slate-800">
            <button
              onClick={togglePlay}
              className="flex h-11 items-center gap-2 rounded-xl bg-amber-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>توقف</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>ادامه تماشا</span>
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>از ابتدا</span>
            </button>
          </div>

          {/* Lesson prompt */}
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs mb-1">
              <AlertOctagon className="h-4 w-4" />
              <span>پرسش تامل‌برانگیز برای تصمیم شما:</span>
            </div>
            <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
              اگر این تصمیمی که امروز پیش‌روی شماست، یک ماه دیگر هم به بهانه «صبر کنیم ببینیم چه می‌شود» به تعویق بیفتد، دقیقاً چه فرصت یا سرمایه‌ای ممکن است برای همیشه نابود شود؟
            </p>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="block text-slate-800 dark:text-slate-200 mb-1">
              چرا این ویدئو مهم است؟
            </strong>
            شاه سلطان حسین نماد بارز «تعلل خوش‌خیالانه» است. او خردمندانه سکوت نمی‌کرد، بلکه از سر ناتوانی در تحمل رنج تصمیم‌گیری به عافیت‌طلبی پناه برده بود. درنگ به شما یادآوری می‌کند که تصمیم نگرفتن، خود یک تصمیم بسیار پرریسک است.
          </div>
        </div>
      </div>
    </div>
  );
};
