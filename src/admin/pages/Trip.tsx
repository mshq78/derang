import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Lock, Play, Undo2 } from 'lucide-react';
import { adjustTripPoints, fetchTrip, listPointAdjustments, openNextTripStage, undoTripStage, type PointAdjustment, type TripAdmin } from '../api';
import { Badge, Button, Card, Dialog, ErrorNote, Field, PageHeader, Spinner, cx, errorText, formatDate, inputClass } from '../ui';
import { toPersianDigits } from '../../utils/helpers';

const POLL_MS = 8000;

const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

export const TripPage: React.FC<{ notify: (message: string) => void }> = ({ notify }) => {
  const [group, setGroup] = useState('1');
  const [data, setData] = useState<TripAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'open' | 'undo' | null>(null);
  const [adjusting, setAdjusting] = useState<TripAdmin['members'][number] | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchTrip(group));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, [group]);

  useEffect(() => {
    setData(null);
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const run = async (action: 'open' | 'undo') => {
    setBusy(true);
    try {
      setData(action === 'open' ? await openNextTripStage(group) : await undoTripStage(group));
      notify(action === 'open' ? 'مرحله باز شد؛ گوشی‌ها تا چند ثانیه‌ی دیگر مطلع می‌شوند.' : 'آخرین بازشدن برگردانده شد.');
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const nextIndex = data ? data.stages.findIndex((s) => s.openedAt === null) : -1;
  const next = data && nextIndex >= 0 ? data.stages[nextIndex] : null;
  const loggedIn = data ? data.members.filter((m) => m.everLoggedIn).length : 0;

  return (
    <div>
      <PageHeader
        title="کنترل سفر"
        subtitle="مرحله‌ها را به ترتیب و هر وقت خواستید باز کنید. هر مرحله‌ای که باز شود تا آخر سفر باز می‌ماند. گوشی‌ها هر چند ثانیه وضعیت را می‌گیرند."
        actions={
          <div className="flex rounded-xl border border-line bg-surface p-0.5" role="tablist" aria-label="گروه">
            {['1', '2'].map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                onClick={() => setGroup(g)}
                className={cx('whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-bold', group === g ? 'bg-primary text-surface' : 'text-ink-2 hover:bg-surface-2')}
              >
                گروه {toPersianDigits(g)}
              </button>
            ))}
          </div>
        }
      />
      <ErrorNote message={error} />
      {!data ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            {next ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-ink-3">{nextIndex === 0 ? 'سفر هنوز شروع نشده' : 'مرحله‌ی بعدی'}</p>
                  <p className="text-lg font-extrabold text-ink">{nextIndex === 0 ? 'شروع سفر: باز کردن مرحله‌ی ۱' : `مرحله‌ی ${toPersianDigits(nextIndex + 1)}: ${next.title}`}</p>
                  <p className="text-[13px] text-ink-3">{next.subtitle}</p>
                </div>
                <Button variant="primary" className="px-6 py-3 text-sm" busy={busy} onClick={() => setConfirm('open')} icon={<Play className="h-4 w-4" />}>
                  {nextIndex === 0 ? 'شروع سفر' : `باز کردن مرحله‌ی ${toPersianDigits(nextIndex + 1)}`}
                </Button>
              </div>
            ) : (
              <p className="text-sm font-bold text-success-ink">همه‌ی مرحله‌ها باز شده‌اند.</p>
            )}
            <p className="mt-3 text-xs text-ink-3">
              {toPersianDigits(loggedIn)} نفر از {toPersianDigits(data.total)} نفر تا حالا وارد شده‌اند.
              {data.total === 0 && ' (هنوز کسی در این گروه نیست؛ از «کاربران سایت» گروه را تعیین کنید.)'}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-extrabold text-ink">مرحله‌ها</h2>
              <Button variant="ghost" disabled={busy || !data.stages.some((s) => s.openedAt !== null)} onClick={() => setConfirm('undo')} icon={<Undo2 className="h-3.5 w-3.5" />}>
                برگرداندن آخرین باز شدن
              </Button>
            </div>
            <ul className="divide-y divide-line">
              {data.stages.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold', s.openedAt ? 'bg-primary text-surface' : 'bg-surface-2 text-ink-3')}>
                    {s.openedAt ? toPersianDigits(i + 1) : <Lock className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{s.title}</p>
                    <p className="text-xs text-ink-3">{s.openedAt ? `باز شده ساعت ${clockTime(s.openedAt)}` : 'هنوز باز نشده'}</p>
                  </div>
                  {s.openedAt && (
                    <Badge tone={s.done === data.total && data.total > 0 ? 'success' : 'neutral'}>
                      {toPersianDigits(s.done)} از {toPersianDigits(data.total)} انجام داده‌اند
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-extrabold text-ink">جدول کامل</h2>
            </div>
            {data.members.length === 0 ? (
              <p className="p-4 text-[13px] text-ink-3">کسی در این گروه نیست.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-6 text-xs font-bold text-ink-3">{toPersianDigits(m.rank)}</span>
                      <span className="truncate font-bold text-ink">{m.name}</span>
                      {!m.everLoggedIn && <Badge tone="warning">وارد نشده</Badge>}
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-3 text-xs text-ink-3">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{toPersianDigits(m.stagesDone)}</span>
                      <span>{toPersianDigits(m.badges)} نشان</span>
                      <span className="font-extrabold text-ink">{toPersianDigits(m.points)}</span>
                      <Button variant="ghost" className="px-2 py-1" onClick={() => setAdjusting(m)}>امتیاز ±</Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {adjusting && (
        <AdjustDialog
          group={group}
          member={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={(updated) => {
            setData(updated);
            setAdjusting(null);
            notify('امتیاز تغییر کرد.');
          }}
        />
      )}
      {confirm === 'open' && next && (
        <Dialog
          title={nextIndex === 0 ? 'شروع سفر؟' : `باز کردن مرحله‌ی ${toPersianDigits(nextIndex + 1)}؟`}
          onClose={() => setConfirm(null)}
          footer={<><Button onClick={() => setConfirm(null)}>انصراف</Button><Button variant="primary" busy={busy} onClick={() => run('open')}>بله، باز شود</Button></>}
        >
          <p className="text-sm leading-relaxed text-ink">
            «{next.title}» برای همه‌ی اعضای گروه {toPersianDigits(group)} باز می‌شود و تا آخر سفر باز می‌ماند.
          </p>
        </Dialog>
      )}
      {confirm === 'undo' && (
        <Dialog
          title="برگرداندن آخرین باز شدن؟"
          onClose={() => setConfirm(null)}
          footer={<><Button onClick={() => setConfirm(null)}>انصراف</Button><Button variant="danger" busy={busy} onClick={() => run('undo')}>برگردان</Button></>}
        >
          <p className="text-sm leading-relaxed text-ink">آخرین مرحله‌ی بازشده دوباره بسته می‌شود. فقط برای اشتباه است؛ امتیازهایی که گرفته شده می‌ماند.</p>
        </Dialog>
      )}
    </div>
  );
};

const QUICK = [-50, -10, 10, 50];

const AdjustDialog: React.FC<{
  group: string;
  member: TripAdmin['members'][number];
  onClose: () => void;
  onDone: (data: TripAdmin) => void;
}> = ({ group, member, onClose, onDone }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PointAdjustment[] | null>(null);

  useEffect(() => {
    listPointAdjustments(group, member.id).then(setHistory).catch(() => setHistory([]));
  }, [group, member.id]);

  const value = Number(amount.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
  const valid = amount.trim() !== '' && Number.isInteger(value) && value !== 0 && Math.abs(value) <= 10000;
  const after = Math.max(0, member.points + (valid ? value : 0));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onDone(await adjustTripPoints(group, member.id, value, reason));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={`امتیاز ${member.name}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" busy={busy} disabled={!valid} onClick={save}>
            {valid ? (value > 0 ? `اضافه کردن ${toPersianDigits(value)}` : `کم کردن ${toPersianDigits(Math.abs(value))}`) : 'ثبت'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink">
        امتیاز فعلی: <span className="font-extrabold">{toPersianDigits(member.points)}</span>
        {valid && <span className="text-ink-3"> ← بعد از ثبت: <span className="font-extrabold text-ink">{toPersianDigits(after)}</span></span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <Button key={q} onClick={() => setAmount(String(q))} className={cx(q < 0 && 'text-danger-ink')}>
            <bdi dir="ltr">{q > 0 ? `+${toPersianDigits(q)}` : `-${toPersianDigits(Math.abs(q))}`}</bdi>
          </Button>
        ))}
      </div>
      <Field label="مقدار (عدد مثبت برای اضافه، منفی برای کم)" hint="امتیاز هیچ‌وقت کمتر از صفر نمی‌شود.">
        <input className={`${inputClass} text-left`} dir="ltr" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثلاً 25 یا -15" autoFocus />
      </Field>
      <Field label="دلیل (اختیاری، در گزارش فعالیت ثبت می‌شود)">
        <input className={inputClass} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <ErrorNote message={error} />
      {history && history.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold text-ink-2">تغییرهای قبلی</p>
          <ul className="max-h-40 divide-y divide-line overflow-y-auto rounded-xl border border-line text-xs">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0 truncate text-ink-2">{h.reason || '—'} · {h.actor}</span>
                <span className="flex-shrink-0">
                  <bdi dir="ltr" className={cx('font-extrabold', h.delta > 0 ? 'text-success-ink' : 'text-danger-ink')}>{h.delta > 0 ? '+' : '-'}{toPersianDigits(Math.abs(h.delta))}</bdi>
                  <span className="mr-2 text-ink-3">{formatDate(h.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
};
