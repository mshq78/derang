import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { AudioStoryDef } from '../types';
import { formatDuration } from '../utils/helpers';

interface AudioPlayerProps {
  story: AudioStoryDef;
  volume: number;
}

// Module-level listener to ensure only one audio plays at a time across the app
type StopListener = (activeKey: string) => void;
const stopListeners = new Set<StopListener>();

const notifyPlay = (activeKey: string) => {
  stopListeners.forEach((listener) => listener(activeKey));
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ story, volume }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(story.seconds || 240);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleStopOther = (activeKey: string) => {
      if (activeKey !== story.key && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    stopListeners.add(handleStopOther);
    return () => {
      stopListeners.delete(handleStopOther);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [story.key]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  const handleTogglePlay = () => {
    if (!story.audioUrl || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      notifyPlay(story.key);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setLoadError(false);
        })
        .catch((err: unknown) => {
          setIsPlaying(false);
          // NotAllowedError only means the browser blocked autoplay; anything else is a load failure.
          if (!(err instanceof DOMException && err.name === 'NotAllowedError')) setLoadError(true);
        });
    }
  };

  const handleReset = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all">
      {/* Hidden real audio element if URL exists */}
      {story.audioUrl && (
        <audio
          ref={audioRef}
          src={story.audioUrl}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => {
            setIsPlaying(false);
            setLoadError(true);
          }}
        />
      )}

      {/* Top Meta */}
      <div className="flex items-start justify-between gap-3 text-right">
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
            <Volume2 className="h-4 w-4" />
            <span>روایت صوتی</span>
            <span>·</span>
            <span>مدت {story.dur}</span>
          </div>
          <h4 className="mt-0.5 text-base font-bold text-ink">
            {story.title}
          </h4>
          <p className="text-sm text-ink-3 mt-0.5">
            {story.subtitle}
          </p>
        </div>
      </div>

      <p className="mt-2 text-sm text-ink-2 leading-relaxed text-right">
        {story.desc}
      </p>

      {/* Player Controller Controls */}
      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-surface-2 p-3 border border-line">
        {story.audioUrl ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-surface shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
              aria-label={isPlaying ? 'توقف پخش' : 'شروع پخش'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            <button
              onClick={handleReset}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-line transition-colors"
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
                max={audioDuration || story.seconds || 240}
                value={currentTime}
                onChange={handleSeek}
                className="h-2 w-full cursor-pointer accent-primary"
                aria-label="نوار زمان صوت"
              />
              <div className="flex justify-between text-[13px] font-medium text-ink-3 tabular-nums">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(audioDuration || story.seconds || 240)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1 px-1">
            <button
              disabled
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-line text-ink-3 cursor-not-allowed opacity-60"
              aria-label="فایل صوتی موجود نیست"
            >
              <Play className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-ink-3">
              فایل صوتی به‌زودی اضافه می‌شود
            </span>
          </div>
        )}
        {story.audioUrl && loadError && (
          <p className="text-[13px] font-medium text-danger-ink" role="alert">
            فایل صوتی باز نشد. لطفاً کمی بعد دوباره امتحان کنید.
          </p>
        )}
      </div>

      {/* Key Takeaway */}
      <div className="mt-3 rounded-xl bg-primary-soft p-3 text-right border border-primary/20">
        <span className="text-[13px] font-bold text-primary-ink block mb-0.5">
          درس کلیدی برای تصمیم شما:
        </span>
        <p className="text-sm text-primary-ink leading-relaxed font-medium">
          {story.takeaway}
        </p>
      </div>

      {/* Transcript Accordion */}
      <div className="mt-2 text-right">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex w-full items-center justify-between py-2 text-xs font-bold text-ink-2 hover:text-ink transition-colors"
          aria-expanded={showTranscript}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>متن کامل و تحلیل روایت</span>
          </span>
          {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showTranscript && (
          <div className="mt-1 rounded-xl bg-surface-2 p-3 text-sm text-ink-2 leading-relaxed border border-line animate-fadeIn">
            {story.transcript}
          </div>
        )}
      </div>
    </div>
  );
};
