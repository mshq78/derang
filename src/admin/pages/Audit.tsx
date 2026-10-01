import React, { useCallback, useEffect, useState } from 'react';
import { listAudit, type AuditEntry } from '../api';
import { Button, Card, EmptyState, ErrorNote, PageHeader, Spinner, errorText, formatDate } from '../ui';

const PAGE = 50;

export const AuditPage: React.FC = () => {
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (offset: number) => {
    try {
      const rows = await listAudit(PAGE, offset);
      setItems((prev) => (offset === 0 ? rows : [...(prev ?? []), ...rows]));
      setMore(rows.length === PAGE);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);
  useEffect(() => {
    void load(0);
  }, [load]);

  return (
    <div>
      <PageHeader title="گزارش فعالیت" subtitle="چه کسی، چه زمانی، چه کاری کرده است؛ ورود به پنل، تغییر محتوا، ساخت و حذف کاربران و تغییر تنظیمات." />
      <ErrorNote message={error} />
      <Card>
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="هنوز فعالیتی ثبت نشده است." />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-ink">
                    <span className="font-bold">{e.actor}</span> · {e.action}
                  </p>
                  {(e.target || e.detail) && (
                    <p className="mt-0.5 truncate text-xs text-ink-3">
                      {e.target && <span className="font-mono" dir="ltr">{e.target}</span>}
                      {e.target && e.detail ? ' · ' : ''}
                      {e.detail}
                    </p>
                  )}
                </div>
                <time className="flex-shrink-0 text-xs text-ink-3" dateTime={e.at}>{formatDate(e.at)}</time>
              </li>
            ))}
          </ul>
        )}
        {more && (
          <div className="border-t border-line p-3 text-center">
            <Button
              busy={loadingMore}
              onClick={async () => {
                setLoadingMore(true);
                await load(items?.length ?? 0);
                setLoadingMore(false);
              }}
            >
              نمایش بیشتر
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
