import React, { useEffect, useState } from 'react';
import { fetchDashboard, listAudit, type AdminIdentity, type AuditEntry, type DashboardData } from '../api';
import { Badge, Card, ErrorNote, PageHeader, Spinner, errorText, formatDate } from '../ui';
import { toPersianDigits } from '../../utils/helpers';
import type { Section } from '../AdminConsole';

const Stat: React.FC<{ label: string; value: number; hint?: string }> = ({ label, value, hint }) => (
  <Card className="p-4">
    <p className="text-xs font-bold text-ink-3">{label}</p>
    <p className="mt-1 text-2xl font-extrabold text-ink">{toPersianDigits(value)}</p>
    {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
  </Card>
);

export const DashboardPage: React.FC<{
  me: AdminIdentity;
  go: (section: Section) => void;
  collectionLabel: (id: string) => string;
}> = ({ me, go, collectionLabel }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recent, setRecent] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canAudit = me.permissions.includes('audit.read');
  const canUsers = me.permissions.includes('users.read');

  useEffect(() => {
    fetchDashboard().then(setData).catch((err) => setError(errorText(err)));
    if (canAudit) listAudit(8).then(setRecent).catch(() => undefined);
  }, [canAudit]);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner />;

  const unpublished = data.content.reduce((n, c) => n + (c.total - c.published), 0);
  const accessLabel = data.access.openAccess
    ? { tone: 'warning' as const, text: 'بازدید آزاد: همه بدون ورود وارد می‌شوند' }
    : data.access.passwordLogin || data.access.smsLogin
      ? { tone: 'success' as const, text: 'ورود اجباری است' }
      : { tone: 'neutral' as const, text: 'فقط پرسیدن نام (بدون حساب)' };

  return (
    <div>
      <PageHeader title={`سلام ${me.displayName}`} subtitle="خلاصه‌ی وضعیت سامانه" />

      <Card className="mb-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-3">نحوه‌ی ورود به سایت:</span>
          <Badge tone={accessLabel.tone}>{accessLabel.text}</Badge>
        </div>
        {me.permissions.includes('settings.write') && (
          <button type="button" onClick={() => go('settings')} className="text-xs font-bold text-primary hover:underline">تغییر در تنظیمات</button>
        )}
      </Card>

      {canUsers && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="کاربران" value={data.members.total} hint={`${toPersianDigits(data.members.withPassword)} با رمز عبور`} />
          <Stat label="فعال در ۲۴ ساعت" value={data.members.activeDay} />
          <Stat label="فعال در هفته" value={data.members.activeWeek} />
          <Stat label="هنوز وارد نشده‌اند" value={Math.max(0, data.members.total - data.members.everLoggedIn)} hint={data.members.disabled ? `${toPersianDigits(data.members.disabled)} غیرفعال` : undefined} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-extrabold text-ink">محتوا</h2>
            {unpublished > 0 && <Badge tone="warning">{toPersianDigits(unpublished)} پیش‌نویس</Badge>}
          </div>
          <ul className="divide-y divide-line">
            {data.content.filter((c) => c.total > 0).map((c) => (
              <li key={c.collection}>
                <button type="button" onClick={() => go(`content:${c.collection}` as Section)} className="flex w-full items-center justify-between px-4 py-2.5 text-right hover:bg-surface-2/50">
                  <span className="text-sm text-ink">{collectionLabel(c.collection)}</span>
                  <span className="text-xs text-ink-3">{toPersianDigits(c.published)} منتشر از {toPersianDigits(c.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {canAudit && (
          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-extrabold text-ink">آخرین فعالیت‌ها</h2>
              <button type="button" onClick={() => go('audit')} className="text-xs font-bold text-primary hover:underline">همه</button>
            </div>
            {recent.length === 0 ? (
              <p className="p-4 text-[13px] text-ink-3">هنوز فعالیتی ثبت نشده است.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((e) => (
                  <li key={e.id} className="px-4 py-2.5">
                    <p className="text-[13px] text-ink"><span className="font-bold">{e.actor}</span> · {e.action}</p>
                    <p className="text-xs text-ink-3">{formatDate(e.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
