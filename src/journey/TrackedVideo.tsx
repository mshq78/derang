import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Play } from 'lucide-react';
import { videoEmbedUrl } from '../utils/videoEmbed';
import { toPersianDigits } from '../utils/helpers';

const HONOR_SECONDS = 90;

/**
 * A direct video file is tracked like the audio (no skipping ahead). An Aparat/YouTube
 * embed cannot be observed, so the "watched" button only unlocks 90 seconds after starting it.
 */
export const TrackedVideo: React.FC<{
  src: string;
  poster?: string;
  title: string;
  done: boolean;
  onFinished: () => void;
}> = ({ src, poster, title, done, onFinished }) => {
  const embed = videoEmbedUrl(src);
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(HONOR_SECONDS);
  const fileRef = useRef<HTMLVideoElement>(null);
  const reached = useRef(0);
  const reported = useRef(done);

  useEffect(() => {
    reported.current = done;
  }, [done]);

  useEffect(() => {
    if (!embed || !started || done) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [embed, started, done]);

  useEffect(() => {
    const el = fileRef.current;
    if (!el || embed) return;
    const report = () => {
      if (reported.current) return;
      reported.current = true;
      onFinished();
    };
    const onTime = () => {
      if (el.seeking) return;
      if (el.currentTime > reached.current + 2) {
        el.currentTime = reached.current;
        return;
      }
      reached.current = Math.max(reached.current, el.currentTime);
      if (el.duration && reached.current >= el.duration * 0.95) report();
    };
    const onSeeking = () => {
      if (el.currentTime > reached.current + 2) el.currentTime = reached.current;
    };
    const onRate = () => {
      if (el.playbackRate !== 1) el.playbackRate = 1;
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('seeking', onSeeking);
    el.addEventListener('ratechange', onRate);
    el.addEventListener('ended', report);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('seeking', onSeeking);
      el.removeEventListener('ratechange', onRate);
      el.removeEventListener('ended', report);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embed]);

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">{title}</p>
        {done && <CheckCircle2 className="h-6 w-6 text-success" aria-label="انجام شد" />}
      </div>
      {embed ? (
        started ? (
          <div className="aspect-video overflow-hidden rounded-xl bg-ink">
            <iframe src={embed} title={title} allowFullScreen className="h-full w-full" />
          </div>
        ) : (
          <button type="button" onClick={() => setStarted(true)} className="flex aspect-video w-full items-center justify-center rounded-xl bg-ink/90 text-surface">
            <span className="flex items-center gap-2 text-sm font-bold">
              <Play className="h-5 w-5" /> پخش ویدیو
            </span>
          </button>
        )
      ) : (
        <video
          ref={fileRef}
          src={src}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          className="aspect-video w-full rounded-xl bg-ink"
        />
      )}
      {embed && started && !done && (
        <button
          type="button"
          disabled={left > 0}
          onClick={onFinished}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-surface disabled:opacity-50"
        >
          {left > 0 ? `بعد از دیدن ویدیو (${toPersianDigits(left)} ثانیه‌ی دیگر)` : 'ویدیو را دیدم'}
        </button>
      )}
    </div>
  );
};
