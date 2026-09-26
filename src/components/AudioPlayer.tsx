import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { AudioStoryDef } from '../types';
import { formatDuration } from '../utils/helpers';

interface AudioPlayerProps {
  story: AudioStoryDef;
  volume: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ story, volume }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const duration = story.seconds || 240;

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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, duration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
  };

  const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
      {/* Top Meta */}
      <div className="flex items-start justify-between gap-3 text-right">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            <Volume2 className="h-3.5 w-3.5" />
            <span>روایت صوتی</span>
            <span>·</span>
            <span>مدت {story.dur}</span>
          </div>
          <h4 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
            {story.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {story.subtitle}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-right">
        {story.desc}
      </p>

      {/* Player Controller Controls */}
      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            aria-label={isPlaying ? 'توقف پخش' : 'شروع پخش'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </button>

          <button
            onClick={handleReset}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            aria-label="بازنشانی پخش به آغاز"
            title="شروع مجدد"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Scrub Bar */}
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="h-2 w-full cursor-pointer accent-blue-600"
              aria-label="نوار زمان صوت"
            />
            <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>

        {/* Ambient indicator bar */}
        {isPlaying && (
          <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 px-1 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
            <span className="flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              در حال پخش روایت...
            </span>
            <span className="font-semibold">{progressPercent}٪</span>
          </div>
        )}
      </div>

      {/* Key Takeaway */}
      <div className="mt-3 rounded-xl bg-blue-50/70 p-3 text-right dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
        <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 block mb-0.5">
          درس کلیدی برای تصمیم شما:
        </span>
        <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
          {story.takeaway}
        </p>
      </div>

      {/* Transcript Accordion */}
      <div className="mt-2 text-right">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex w-full items-center justify-between py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>متن کامل و تحلیل روایت</span>
          </span>
          {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showTranscript && (
          <div className="mt-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-800 animate-fadeIn">
            {story.transcript}
          </div>
        )}
      </div>
    </div>
  );
};
