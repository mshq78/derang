import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, WifiOff } from 'lucide-react';
import { keepAppShell, offlineSupported, requestPersistence, savedUrls, saveForOffline } from '../lib/offline';
import { cx } from '../admin/ui';
import { toPersianDigits } from '../utils/helpers';

export interface OfflineItem {
  url: string;
  title: string;
}

type Status = { state: 'idle' | 'saving' | 'saved' | 'failed'; fraction: number };

/** "Save for the road": downloads each audio file to the phone so it plays with no connection. */
export const OfflineCard: React.FC<{ items: OfflineItem[] }> = ({ items }) => {
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState(false);

  const refreshSaved = useCallback(async () => {
    const saved = new Set(await savedUrls());
    setStatus((prev) => {
      const next: Record<string, Status> = {};
      for (const it of items) next[it.url] = saved.has(it.url) ? { state: 'saved', fraction: 1 } : prev[it.url]?.state === 'saving' ? prev[it.url] : { state: 'idle', fraction: 0 };
      return next;
    });
  }, [items]);

  useEffect(() => {
    void refreshSaved();
    keepAppShell();
  }, [refreshSaved]);

  if (!offlineSupported() || items.length === 0) return null;

  const savedCount = items.filter((i) => status[i.url]?.state === 'saved').length;
  const failed = items.filter((i) => status[i.url]?.state === 'failed').length;
  const allSaved = savedCount === items.length;

  const run = async () => {
    setBusy(true);
    void requestPersistence();
    keepAppShell();
    for (const item of items) {
      if (status[item.url]?.state === 'saved') continue;
      setStatus((s) => ({ ...s, [item.url]: { state: 'saving', fraction: 0 } }));
      try {
        await saveForOffline(item.url, (f) => setStatus((s) => ({ ...s, [item.url]: { state: 'saving', fraction: f } })));
        setStatus((s) => ({ ...s, [item.url]: { state: 'saved', fraction: 1 } }));
      } catch {
        setStatus((s) => ({ ...s, [item.url]: { state: 'failed', fraction: 0 } }));
      }
    }
    setBusy(false);
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-extrabold text-ink">
        <WifiOff className="h-4 w-4 text-primary" /> ذخیره برای مسیر (بدون اینترنت)
      </h3>
      <p className="mb-3 text-[13px] leading-relaxed text-ink-3">
        تا اینترنت دارید، دکمه را بزنید تا صوت‌ها روی همین گوشی ذخیره شوند. بعد از آن بدون اینترنت هم پخش می‌شوند.
        ویدیوها ذخیره نمی‌شوند؛ برای آن‌ها متن را بخوانید.
      </p>
      <ul className="mb-3 space-y-1.5">
        {items.map((it) => {
          const st = status[it.url] ?? { state: 'idle', fraction: 0 };
          return (
            <li key={it.url} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate text-ink">{it.title}</span>
              <span className={cx('flex-shrink-0 text-xs font-bold', st.state === 'saved' ? 'text-success-ink' : st.state === 'failed' ? 'text-danger-ink' : 'text-ink-3')}>
                {st.state === 'saved' && <CheckCircle2 className="inline h-4 w-4" />}
                {st.state === 'saving' && (st.fraction ? `${toPersianDigits(Math.round(st.fraction * 100))}٪` : 'در حال ذخیره...')}
                {st.state === 'failed' && 'ذخیره نشد'}
                {st.state === 'idle' && 'ذخیره نشده'}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={run}
        disabled={busy || allSaved}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-surface disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {allSaved ? 'همه‌ی صوت‌ها ذخیره شده‌اند' : busy ? 'در حال ذخیره...' : failed > 0 ? 'دوباره تلاش کن' : `ذخیره‌ی ${toPersianDigits(items.length - savedCount)} صوت`}
      </button>
      {failed > 0 && !busy && (
        <p className="mt-2 text-xs leading-relaxed text-ink-3">
          بعضی فایل‌ها ذخیره نشد (اینترنت قطع شد یا مرورگر اجازه نداد). همان‌ها را همچنان آنلاین پخش می‌کنید.
        </p>
      )}
    </section>
  );
};
