import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw } from 'lucide-react';
import { toPersianDigits } from '../utils/helpers';
import { getSavedBlob } from '../lib/offline';

/** The address to play: the copy saved on this phone when there is one, otherwise the online file. */
function useSavedSrc(src: string): { src: string; saved: boolean } {
  const [state, setState] = useState<{ src: string; saved: boolean }>({ src, saved: false });
  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    setState({ src, saved: false });
    getSavedBlob(src).then((blob) => {
      if (!blob || cancelled) return;
      revoke = URL.createObjectURL(blob);
      setState({ src: revoke, saved: true });
    });
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src]);
  return state;
}

let current: HTMLAudioElement | null = null;

const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return toPersianDigits(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
};

/**
 * Plays an audio file without a seek bar or speed control: skipping ahead is
 * undone, and the part is reported finished once (nearly) all of it was played.
 */
export const TrackedAudio: React.FC<{
  src: string;
  title: string;
  done: boolean;
  onFinished: () => void;
}> = ({ src, title, done, onFinished }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const source = useSavedSrc(src);
  const reached = useRef(0); // furthest second heard without skipping
  const reported = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    reported.current = done;
  }, [done]);

  const finish = () => {
    if (reported.current) return;
    reported.current = true;
    onFinished();
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => {
      if (el.seeking) return;
      if (el.currentTime > reached.current + 2) {
        el.currentTime = reached.current; // jumped ahead: go back to where they had listened
        return;
      }
      reached.current = Math.max(reached.current, el.currentTime);
      setTime(el.currentTime);
      if (el.duration && reached.current >= el.duration * 0.95) finish();
    };
    const onSeeking = () => {
      if (el.currentTime > reached.current + 2) el.currentTime = reached.current;
    };
    const onRate = () => {
      if (el.playbackRate !== 1) el.playbackRate = 1;
    };
    const onEnd = () => {
      setPlaying(false);
      finish();
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('seeking', onSeeking);
    el.addEventListener('ratechange', onRate);
    el.addEventListener('ended', onEnd);
    el.addEventListener('pause', () => setPlaying(false));
    el.addEventListener('play', () => setPlaying(true));
    el.addEventListener('loadedmetadata', () => setDuration(el.duration || 0));
    el.addEventListener('error', () => setFailed(true));
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('seeking', onSeeking);
      el.removeEventListener('ratechange', onRate);
      el.removeEventListener('ended', onEnd);
      if (current === el) current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      if (current && current !== el) current.pause();
      current = el;
      setFailed(false);
      void el.play().catch(() => setFailed(true));
    } else {
      el.pause();
    }
  };

  const progress = duration ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <audio ref={ref} src={source.src} preload="metadata" playsInline />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'توقف' : 'پخش'}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-surface shadow-sm active:scale-95"
        >
          {failed ? <RotateCcw className="h-5 w-5" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{title}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-3">
            {failed ? 'اتصال قطع شد؛ دوباره دکمه‌ی پخش را بزنید.' : duration ? `${clock(time)} از ${clock(duration)}` : 'آماده‌ی پخش'}{source.saved && !failed ? ' · ذخیره‌شده روی گوشی' : ''}
          </p>
        </div>
        {done && <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-success" aria-label="انجام شد" />}
      </div>
    </div>
  );
};
