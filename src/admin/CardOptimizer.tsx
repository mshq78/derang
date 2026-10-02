import React, { useState } from 'react';
import { ImageDown } from 'lucide-react';
import { adminGetContent, adminUpdateItem, adminUploadMedia } from '../lib/api';
import { compressImage } from '../utils/compressImage';
import { Badge, Button, Card, cx, errorText } from './ui';
import { toPersianDigits } from '../utils/helpers';

const MAX_SIDE = 1800; // card posters carry text; this stays sharp on high-density phone screens
const QUALITY = 0.86;
const SKIP_BELOW = 250 * 1024; // already small enough

interface Line {
  key: string;
  label: string;
  state: 'waiting' | 'working' | 'done' | 'skipped' | 'failed';
  note: string;
}

const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${toPersianDigits((bytes / 1024 / 1024).toFixed(1))} مگابایت` : `${toPersianDigits(Math.round(bytes / 1024))} کیلوبایت`);

/** Shrinks the card images (front and back) stored on the site: same look, far smaller files. */
export const CardOptimizer: React.FC = () => {
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ before: number; after: number } | null>(null);

  const patch = (key: string, change: Partial<Line>) =>
    setLines((all) => all.map((l) => (l.key === key ? { ...l, ...change } : l)));

  const run = async () => {
    setRunning(true);
    setError(null);
    setSaved(null);
    let before = 0;
    let after = 0;
    try {
      const bundle = await adminGetContent(false);
      const jobs = bundle.people.flatMap((p) =>
        (['imageUrl', 'backImageUrl'] as const)
          .filter((field) => !!p[field])
          .map((field) => ({ person: p, field, key: `${p.id}:${field}`, label: `${p.name} · ${field === 'imageUrl' ? 'روی کارت' : 'پشت کارت'}` }))
      );
      setLines(jobs.map((j) => ({ key: j.key, label: j.label, state: 'waiting', note: '' })));

      for (const job of jobs) {
        patch(job.key, { state: 'working', note: 'در حال دریافت...' });
        try {
          const url = job.person[job.field] as string;
          const res = await fetch(url, { credentials: 'omit' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          if (blob.size < SKIP_BELOW && /webp|jpeg/.test(blob.type)) {
            patch(job.key, { state: 'skipped', note: `از قبل کم‌حجم است (${size(blob.size)})` });
            continue;
          }
          const original = new File([blob], `${job.person.id}-${job.field === 'imageUrl' ? 'front' : 'back'}`, { type: blob.type });
          const result = await compressImage(original, { maxSide: MAX_SIDE, quality: QUALITY });
          if (!result.compressed || result.file.size >= blob.size * 0.9) {
            patch(job.key, { state: 'skipped', note: `تغییری لازم نبود (${size(blob.size)})` });
            continue;
          }
          patch(job.key, { note: 'در حال آپلود...' });
          const uploaded = await adminUploadMedia(result.file, 'image');
          // The card now points to the smaller file only after it was uploaded successfully.
          await adminUpdateItem('people', job.person.id, { ...job.person, [job.field]: uploaded.url });
          before += blob.size;
          after += result.file.size;
          patch(job.key, { state: 'done', note: `${size(blob.size)} ← ${size(result.file.size)}` });
        } catch (err) {
          patch(job.key, { state: 'failed', note: errorText(err) });
        }
      }
      setSaved({ before, after });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setRunning(false);
    }
  };

  const failed = lines.filter((l) => l.state === 'failed').length;
  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-ink"><ImageDown className="h-4 w-4 text-primary" /> کم‌حجم کردن تصویر کارت‌ها</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
            تصویر روی و پشت کارت‌ها دوباره فشرده می‌شود (بیشینه ۱۸۰۰ پیکسل، فرمت WebP، کیفیت بالا). تا آپلود فایل جدید موفق نشود، کارت به فایل قبلی وصل می‌ماند؛ فایل‌های قدیمی پاک نمی‌شوند.
          </p>
        </div>
        <Button variant="primary" busy={running} onClick={run}>{lines.length ? 'اجرای دوباره' : 'شروع'}</Button>
      </div>
      {error && <p role="alert" className="mt-3 text-[13px] font-bold text-danger-ink">{error}</p>}
      {lines.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-[13px]">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 truncate text-ink">{l.label}</span>
              <span className="flex flex-shrink-0 items-center gap-2 text-xs">
                <span className={cx(l.state === 'failed' ? 'text-danger-ink' : 'text-ink-3')}>{l.note}</span>
                {l.state === 'done' && <Badge tone="success">کم‌حجم شد</Badge>}
                {l.state === 'failed' && <Badge tone="danger">نشد</Badge>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {saved && saved.before > 0 && (
        <p className="mt-3 text-[13px] font-bold text-success-ink">جمعاً {size(saved.before)} به {size(saved.after)} رسید.</p>
      )}
      {failed > 0 && !running && (
        <p className="mt-2 text-xs leading-relaxed text-ink-3">
          برای موارد «نشد»: احتمالاً سرور فایل اجازه‌ی خواندن به مرورگر نمی‌دهد. در این صورت همان تصویر را با دکمه‌ی آپلود خود پنل (که هنگام آپلود فشرده می‌کند) دوباره بارگذاری کنید.
        </p>
      )}
    </Card>
  );
};
