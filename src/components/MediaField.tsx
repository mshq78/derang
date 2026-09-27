import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { adminUploadMedia } from '../lib/api';
import { compressImage } from '../utils/compressImage';
import { toPersianDigits } from '../utils/helpers';

type Kind = 'image' | 'audio' | 'video';

interface MediaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: Kind;
  isSandbox?: boolean;
  placeholder?: string;
  /** Applied to typed/pasted text, e.g. to turn an Aparat embed code into a link. */
  normalize?: (value: string) => string;
  hint?: React.ReactNode;
}

const ACCEPT: Record<Kind, string> = {
  image: 'image/jpeg,image/png,image/webp',
  audio: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.m4a,.ogg',
  video: 'video/mp4,video/webm',
};

const UPLOAD_LABEL: Record<Kind, string> = {
  image: 'آپلود تصویر',
  audio: 'آپلود صوت',
  video: 'آپلود ویدئو',
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  return `${toPersianDigits(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
}

/** A URL field with upload-from-computer, progress, preview and automatic image compression. */
export const MediaField: React.FC<MediaFieldProps> = ({
  label,
  value,
  onChange,
  kind,
  isSandbox = false,
  placeholder = 'https://... یا آپلود از روی سیستم',
  normalize,
  hint,
}) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const picked = input.files?.[0];
    if (!picked) return;
    setError(null);
    setStatus(null);
    setProgress(0);
    try {
      let file = picked;
      let note: string | null = null;
      if (kind === 'image') {
        setStatus('در حال کم‌حجم کردن تصویر...');
        const result = await compressImage(picked);
        file = result.file;
        note = result.compressed
          ? `تصویر کم‌حجم شد: ${formatSize(result.originalSize)} ← ${formatSize(file.size)}`
          : null;
      }
      setStatus('در حال آپلود...');
      const res = await adminUploadMedia(file, kind, (p) => setProgress(p), isSandbox);
      setPreviewFailed(false);
      onChange(res.url);
      setStatus(note ?? `آپلود شد (${formatSize(file.size)}). برای ثبت، «ذخیره» را بزنید.`);
    } catch (err: unknown) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری فایل');
    } finally {
      setProgress(null);
      input.value = '';
    }
  };

  const busy = progress !== null;

  return (
    <div>
      <label className="block text-xs font-bold text-ink-2 mb-1">{label}</label>
      <div className="flex gap-2">
        {kind === 'image' && value && !previewFailed && (
          <img
            src={value}
            alt=""
            className="h-9 w-9 flex-shrink-0 rounded-lg border border-line bg-surface-2 object-contain"
            onError={() => setPreviewFailed(true)}
          />
        )}
        <input
          type="text"
          dir="ltr"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setPreviewFailed(false);
            onChange(normalize ? normalize(e.target.value) : e.target.value);
          }}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
        />
        <label
          className={`flex flex-shrink-0 items-center gap-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink transition-colors ${
            busy ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-surface'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{UPLOAD_LABEL[kind]}</span>
          <input type="file" accept={ACCEPT[kind]} onChange={handleFile} disabled={busy} className="hidden" />
        </label>
      </div>

      {busy && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      )}
      {status && <p className="mt-1 text-[12px] font-medium text-ink-3">{status}</p>}
      {error && (
        <p className="mt-1 text-[12px] font-medium text-danger-ink" role="alert">
          {error}
        </p>
      )}
      {kind === 'audio' && value && !busy && (
        <audio controls preload="none" src={value} className="mt-2 h-9 w-full" />
      )}
      {hint}
    </div>
  );
};
