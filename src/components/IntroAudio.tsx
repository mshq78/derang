import React, { useEffect, useRef, useState } from 'react';
import { Headphones, Pause, Play } from 'lucide-react';
import { formatDuration } from '../utils/helpers';
import { notifyPlay, onOtherPlayback } from './AudioPlayer';

interface IntroAudioProps {
  url: string;
  title: string;
  volume: number;
}

const PLAYER_KEY = 'intro-audio';

/** Compact player for the short intro audio in the home page hero. */
export const IntroAudio: React.FC<IntroAudioProps> = ({ url, title, volume }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  // Pause when another audio on the page starts, so only one plays at a time.
  useEffect(
    () =>
      onOtherPlayback((activeKey) => {
        if (activeKey !== PLAYER_KEY && audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }),
    []
  );

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    notifyPlay(PLAYER_KEY);
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setFailed(false);
      })
      .catch((err: unknown) => {
        setIsPlaying(false);
        if (!(err instanceof DOMException && err.name === 'NotAllowedError')) setFailed(true);
      });
  };

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrent(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setFailed(true);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-surface shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
        aria-label={isPlaying ? `توقف ${title}` : `پخش ${title}`}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Headphones className="h-4 w-4 flex-shrink-0 text-primary" />
          <span className="truncate">{title}</span>
        </span>
        <div
          className="mt-2 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-line"
          role="slider"
          aria-label="نوار زمان معرفی صوتی"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onClick={(e) => {
            const audio = audioRef.current;
            if (!audio || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            // RTL: the bar fills from the right.
            const ratio = (rect.right - e.clientX) / rect.width;
            audio.currentTime = Math.max(0, Math.min(duration, ratio * duration));
          }}
          onKeyDown={(e) => {
            const audio = audioRef.current;
            if (!audio || !duration) return;
            if (e.key === 'ArrowLeft') audio.currentTime = Math.min(duration, audio.currentTime + 5);
            if (e.key === 'ArrowRight') audio.currentTime = Math.max(0, audio.currentTime - 5);
          }}
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[12px] font-medium tabular-nums text-ink-3">
          <span>{duration > 0 ? formatDuration(current) : 'پیش از شروع گوش دهید'}</span>
          {duration > 0 && <span>{formatDuration(duration)}</span>}
        </div>
        {failed && (
          <p className="mt-1.5 text-[13px] font-medium text-danger-ink" role="alert">
            فایل صوتی باز نشد. لطفاً کمی بعد دوباره امتحان کنید.
          </p>
        )}
      </div>
    </div>
  );
};
