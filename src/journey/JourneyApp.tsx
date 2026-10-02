import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, Lock, LogOut, Trophy, WifiOff } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { BADGES, STAGES } from '../data/journey';
import { bodyTaskId, fetchTripState, flushOutbox, loadOutbox, type TripState } from '../lib/trip';
import { OfflineCard, type OfflineItem } from './OfflineCard';
import type { AuthUser } from '../lib/userAuth';
import { toPersianDigits } from '../utils/helpers';
import { cx } from '../admin/ui';
import { BrandMark } from '../components/BrandMark';
import { useBackLayer } from '../hooks/useBackLayer';
import { RouteMap } from './RouteMap';
import { StageView } from './StageView';

const POLL_MS = 12_000;

export const JourneyApp: React.FC<{
  user: AuthUser;
  onLogout: (name: string) => Promise<void>;
}> = ({ user, onLogout }) => {
  const { content } = useContent();
  const cacheKey = `derang_trip_state:${user.id}`;
  const boardedKey = `derang_trip_boarded:${user.id}`;
  const seenKey = `derang_trip_seen_open:${user.id}`;

  const [state, setState] = useState<TripState | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) || 'null');
    } catch {
      return null;
    }
  });
  const [offline, setOffline] = useState(false);
  const [boarded, setBoarded] = useState(() => {
    try {
      return localStorage.getItem(boardedKey) === '1';
    } catch {
      return false;
    }
  });
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const prevPoints = useRef<number | null>(null);
  const [gain, setGain] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      await flushOutbox(user.id);
      const next = await fetchTripState();
      // Parts finished with no connection that are still waiting to be sent stay shown as done.
      for (const waiting of loadOutbox(user.id)) {
        next.done = { ...(next.done ?? {}), [bodyTaskId(waiting)]: { at: Date.now() } };
      }
      setState(next);
      setOffline(false);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // cache is optional
      }
    } catch {
      setOffline(true);
    }
  }, [cacheKey, user.id]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [refresh]);

  const openedCount = state?.opened ? Object.keys(state.opened).length : 0;

  // Announce a stage the organiser just opened.
  useEffect(() => {
    if (!state || !boarded) return;
    let seen = 0;
    try {
      seen = Number(localStorage.getItem(seenKey) || 0);
    } catch {
      // ignore
    }
    if (openedCount > seen) {
      if (seen > 0 || openedCount > 1) setBanner(`مرحله‌ی ${toPersianDigits(openedCount)} باز شد: ${STAGES[openedCount - 1]?.title ?? ''}`);
      try {
        localStorage.setItem(seenKey, String(openedCount));
      } catch {
        // ignore
      }
    }
  }, [openedCount, boarded, state, seenKey]);

  // Show "+N" when points go up.
  useEffect(() => {
    const points = state?.me?.points;
    if (points === undefined) return;
    if (prevPoints.current !== null && points > prevPoints.current) {
      setGain(points - prevPoints.current);
      const t = setTimeout(() => setGain(null), 2800);
      prevPoints.current = points;
      return () => clearTimeout(t);
    }
    prevPoints.current = points;
  }, [state?.me?.points]);

  const stageStatus = (id: string): 'locked' | 'todo' | 'done' => {
    if (!state?.opened?.[id]) return 'locked';
    return state.me?.stages[id]?.complete ? 'done' : 'todo';
  };

  const current = STAGES.find((s) => stageStatus(s.id) === 'todo') ?? null;
  const allDone = STAGES.every((s) => stageStatus(s.id) === 'done');
  const openStops = STAGES.map((s, i) => (state?.opened?.[s.id] ? i + 1 : 0)).filter(Boolean);
  const doneStops = STAGES.map((s, i) => (stageStatus(s.id) === 'done' ? i + 1 : 0)).filter(Boolean);
  const lastOpen = openStops.length ? Math.max(...openStops) : 0;
  const position = !boarded ? 0 : allDone ? STAGES.length + 1 : lastOpen;

  const board = () => {
    setBoarded(true);
    try {
      localStorage.setItem(boardedKey, '1');
    } catch {
      // ignore
    }
  };

  const contentSlice = useMemo(
    () => ({ site: content.site, audioStories: content.audioStories, videos: content.videos, people: content.people, tour: content.tour }),
    [content]
  );

  const markDone = useCallback(
    (task: string) => setState((s) => (s ? { ...s, done: { ...(s.done ?? {}), [task]: { at: Date.now() } } } : s)),
    []
  );

  const offlineItems = useMemo<OfflineItem[]>(() => {
    const list: OfflineItem[] = [];
    if (content.site.introAudioUrl) list.push({ url: content.site.introAudioUrl, title: content.site.introAudioTitle || 'معرفی صوتی درنگ' });
    for (const stage of STAGES) {
      for (const group of stage.groups) {
        for (const item of group.items) {
          if (item.key !== 'audio' || item.ref.source !== 'story') continue;
          const story = content.audioStories.find((s) => s.id === (item.ref as { id: string }).id);
          if (story?.audioUrl && !list.some((l) => l.url === story.audioUrl)) list.push({ url: story.audioUrl, title: story.title });
        }
      }
    }
    return list;
  }, [content]);

  const stageDef = openStage ? STAGES.find((s) => s.id === openStage) : null;
  useBackLayer(!!stageDef, () => setOpenStage(null));

  // A stage opens at its top, not at the scroll position of the list it came from.
  useEffect(() => {
    if (!openStage) return;
    window.scrollTo(0, 0);
    const t = setTimeout(() => window.scrollTo(0, 0), 60);
    return () => clearTimeout(t);
  }, [openStage]);

  const logout = async () => {
    setLeaving(true);
    try {
      await onLogout(user.firstName);
    } catch {
      setLeaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-right">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <div>
              <p className="text-sm font-extrabold text-ink">درنگ؛ سفر اصفهان تا بابلسر</p>
              <p className="text-xs text-ink-3">{user.firstName} {user.lastName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state?.me && (
              <span className="relative flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-extrabold text-primary" aria-label="امتیاز شما">
                <Trophy className="h-3.5 w-3.5" /> {toPersianDigits(state.me.points)}
                {gain !== null && (
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 animate-slideUp rounded-full bg-success px-2 py-0.5 text-xs font-bold text-surface">
                    <bdi dir="ltr">+{toPersianDigits(gain)}</bdi>
                  </span>
                )}
              </span>
            )}
            <button type="button" onClick={logout} disabled={leaving} aria-label="خروج" className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-50">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {offline && (
          <div role="status" className="flex items-center justify-center gap-1.5 bg-warning-soft px-3 py-1 text-xs font-bold text-warning-ink">
            <WifiOff className="h-3.5 w-3.5" /> اتصال ضعیف است؛ آخرین وضعیت نمایش داده می‌شود.
          </div>
        )}
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {banner && (
          <button type="button" onClick={() => setBanner(null)} className="w-full animate-slideUp rounded-2xl bg-success px-4 py-3 text-right text-sm font-extrabold text-surface shadow-md">
            🎉 {banner}
          </button>
        )}

        {!state ? (
          <div className="py-16 text-center text-sm text-ink-3">در حال بارگذاری...</div>
        ) : !state.group ? (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-ink-2">برای حساب شما سفری تعریف نشده است.</div>
        ) : stageDef ? (
          <StageView
            stage={stageDef}
            state={state}
            content={contentSlice}
            userId={user.id}
            onBack={() => setOpenStage(null)}
            refresh={() => void refresh()}
            markDone={markDone}
          />
        ) : (
          <>
            <section className="overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-sm">
              <RouteMap stages={STAGES.length} position={position} openStops={openStops} doneStops={doneStops} />
              {!boarded ? (
                <div className="mt-2 space-y-3 text-center">
                  <p className="text-base font-extrabold text-ink">به سفر درنگ خوش آمدید</p>
                  <p className="text-[13px] leading-relaxed text-ink-3">
                    در این مسیر، هر مرحله که باز شود یک کار کوتاه دارد. هرچه کارها را انجام دهید امتیاز می‌گیرید.
                  </p>
                  <button type="button" onClick={board} className="w-full rounded-2xl bg-primary py-3 text-sm font-extrabold text-surface shadow-md active:scale-[0.98]">
                    سوار شدم؛ شروع سفر
                  </button>
                </div>
              ) : !state.started ? (
                <p className="mt-2 text-center text-[13px] font-bold text-ink-2">منتظر اعلام شروع سفر باشید؛ همین صفحه را باز نگه دارید.</p>
              ) : allDone ? (
                <p className="mt-2 text-center text-sm font-extrabold text-success-ink">همه‌ی مرحله‌های باز شده را انجام دادید. آفرین!</p>
              ) : null}
            </section>

            <OfflineCard items={offlineItems} />

            {boarded && state.started && (
              <>
                {current ? (
                  <button
                    type="button"
                    onClick={() => setOpenStage(current.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-3xl bg-primary p-5 text-right text-surface shadow-md active:scale-[0.99]"
                  >
                    <span>
                      <span className="block text-xs font-bold opacity-80">کار حالا</span>
                      <span className="mt-0.5 block text-lg font-extrabold">{current.title}</span>
                      <span className="mt-1 block text-[13px] opacity-90">{current.subtitle}</span>
                    </span>
                    <ChevronLeft className="h-6 w-6 flex-shrink-0" />
                  </button>
                ) : !allDone ? (
                  <div className="rounded-3xl border border-line bg-surface p-5 text-center text-sm font-bold text-ink-2">
                    همه‌ی مرحله‌های باز شده را انجام دادید؛ منتظر مرحله‌ی بعدی باشید.
                  </div>
                ) : null}

                <section aria-label="مرحله‌ها" className="space-y-2">
                  {STAGES.map((s, i) => {
                    const status = stageStatus(s.id);
                    const stageScore = state.me?.stages[s.id];
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={status === 'locked'}
                        onClick={() => setOpenStage(s.id)}
                        className={cx(
                          'flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition-colors',
                          status === 'locked' ? 'border-line bg-surface-2/60 opacity-70' : 'border-line bg-surface hover:bg-surface-2'
                        )}
                      >
                        <span className={cx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold',
                          status === 'done' ? 'bg-success text-surface' : status === 'todo' ? 'bg-primary text-surface' : 'bg-surface-2 text-ink-3')}>
                          {status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : status === 'locked' ? <Lock className="h-4 w-4" /> : toPersianDigits(i + 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">{s.title}</span>
                          <span className="block truncate text-xs text-ink-3">
                            {status === 'locked' ? 'هنوز باز نشده' : status === 'done' ? `انجام شد · ${toPersianDigits(stageScore?.points ?? 0)} امتیاز` : 'باز است'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </section>

                <section className="rounded-2xl border border-line bg-surface p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-ink"><Trophy className="h-4 w-4 text-primary" /> جدول امتیاز</h3>
                  <ol className="space-y-1.5">
                    {(state.top ?? []).map((t) => (
                      <li key={t.rank} className={cx('flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[13px]', t.me && 'bg-primary-soft')}>
                        <span className="min-w-0 truncate font-bold text-ink">{toPersianDigits(t.rank)}. {t.name}</span>
                        <span className="flex-shrink-0 text-ink-3">
                          {t.badges > 0 && <span className="ml-2">🏅 {toPersianDigits(t.badges)}</span>}
                          {toPersianDigits(t.points)} امتیاز
                        </span>
                      </li>
                    ))}
                  </ol>
                  {state.me && (
                    <p className="mt-3 rounded-xl bg-primary-soft px-3 py-2 text-[13px] font-bold text-primary">
                      جایگاه شما: {toPersianDigits(state.me.rank ?? '-')} از {toPersianDigits(state.me.of)} · {toPersianDigits(state.me.points)} امتیاز
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-line bg-surface p-4">
                  <h3 className="mb-2 text-sm font-extrabold text-ink">نشان‌های شما</h3>
                  {(state.me?.badges ?? []).length === 0 ? (
                    <p className="text-[13px] text-ink-3">هنوز نشانی نگرفته‌اید؛ با کامل کردن مرحله‌ها و جواب درست به سؤال‌ها نشان می‌گیرید.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {(state.me?.badges ?? []).map((b) => (
                        <li key={b} title={BADGES[b]?.desc} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                          🏅 {BADGES[b]?.label ?? b}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};
