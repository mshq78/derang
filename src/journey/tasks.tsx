import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { CHARACTERS, type QuizQuestion } from '../data/journey';
import type { Person } from '../types/content';
import { CardViewer } from '../components/CardViewer';
import { answerTripQuestion, submitTripTest, type TripTaskDone } from '../lib/trip';
import { cx } from '../admin/ui';
import { toPersianDigits } from '../utils/helpers';

export const TestTask: React.FC<{
  url: string;
  done?: TripTaskDone;
  onSaved: () => void;
}> = ({ url, done, onSaved }) => {
  const [choice, setChoice] = useState<string>(done?.character ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!choice) return;
    setBusy(true);
    setError(null);
    try {
      await submitTripTest(choice);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت نشد؛ دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink">تست شخصیت تصمیم‌گیری</p>
        {done && <CheckCircle2 className="h-6 w-6 text-success" aria-label="انجام شد" />}
      </div>
      <p className="text-[13px] leading-relaxed text-ink-3">
        ۱) تست را انجام دهید. ۲) برگردید و شخصیتی را که نتیجه‌ی تست شما بود انتخاب کنید.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 py-2.5 text-sm font-bold text-ink hover:bg-surface"
      >
        <ExternalLink className="h-4 w-4" /> رفتن به تست
      </a>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChoice(c.id)}
            aria-pressed={choice === c.id}
            className={cx(
              'rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors',
              choice === c.id ? 'border-primary bg-primary text-surface' : 'border-line bg-surface-2 text-ink hover:bg-surface'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-[13px] font-bold text-danger-ink">{error}</p>}
      <button
        type="button"
        disabled={!choice || busy || choice === done?.character}
        onClick={save}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-surface disabled:opacity-50"
      >
        {done ? (choice === done.character ? 'ثبت شد' : 'تغییر نتیجه') : 'ثبت نتیجه‌ی من'}
      </button>
    </div>
  );
};

type Side = 'front' | 'back';

/** All five cards must be opened, front and back (back only where the card has one). */
export const CardsTask: React.FC<{
  people: Person[];
  userId: string;
  done: boolean;
  onFinished: () => void;
}> = ({ people, userId, done, onFinished }) => {
  const storeKey = `derang_cards_seen:${userId}`;
  const [seen, setSeen] = useState<Record<string, Side[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storeKey) || '{}');
    } catch {
      return {};
    }
  });
  const [open, setOpen] = useState<Person | null>(null);

  const complete = (state: Record<string, Side[]>) =>
    people.length > 0 &&
    people.every((p) => {
      const sides = state[p.id] ?? [];
      return sides.includes('front') && (!p.backImageUrl || sides.includes('back'));
    });

  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(seen));
    } catch {
      // storage unavailable: progress is simply kept in memory
    }
    if (!done && complete(seen)) onFinished();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);

  const mark = (id: string, side: Side) =>
    setSeen((prev) => ((prev[id] ?? []).includes(side) ? prev : { ...prev, [id]: [...(prev[id] ?? []), side] }));

  const count = people.filter((p) => (seen[p.id] ?? []).includes('front') && (!p.backImageUrl || (seen[p.id] ?? []).includes('back'))).length;

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink">پنج شخصیت؛ روی کارت‌ها و پشت آن‌ها</p>
        {done ? <CheckCircle2 className="h-6 w-6 text-success" aria-label="انجام شد" /> : <span className="text-xs font-bold text-ink-3">{toPersianDigits(count)} از {toPersianDigits(people.length)}</span>}
      </div>
      <p className="text-[13px] leading-relaxed text-ink-3">هر کارت را باز کنید، بخوانید و با دکمه‌ی «چرخاندن کارت» پشتش را هم ببینید.</p>
      <div className="grid grid-cols-5 gap-2">
        {people.map((p) => {
          const complete1 = (seen[p.id] ?? []).includes('front') && (!p.backImageUrl || (seen[p.id] ?? []).includes('back'));
          return (
            <button key={p.id} type="button" onClick={() => setOpen(p)} className="relative" aria-label={`کارت ${p.name}`}>
              <div className={cx('aspect-[2/3] overflow-hidden rounded-lg border bg-surface-2', complete1 ? 'border-success' : 'border-line')}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center p-1 text-[10px] font-bold text-ink-2">{p.name}</span>
                )}
              </div>
              {complete1 && <CheckCircle2 className="absolute -bottom-1.5 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-surface text-success" />}
            </button>
          );
        })}
      </div>
      {open && open.imageUrl && (
        <CardViewer
          name={open.name}
          frontUrl={open.imageUrl}
          backUrl={open.backImageUrl}
          onSideShown={(side) => mark(open.id, side)}
          onClose={() => setOpen(null)}
        />
      )}
      {open && !open.imageUrl && (
        <CardFallback person={open} onSeen={() => { mark(open.id, 'front'); if (open.backImageUrl) mark(open.id, 'back'); }} onClose={() => setOpen(null)} />
      )}
    </div>
  );
};

/** When a card has no image, its text is shown instead and counts as seen. */
const CardFallback: React.FC<{ person: Person; onSeen: () => void; onClose: () => void }> = ({ person, onSeen, onClose }) => {
  useEffect(onSeen, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div className="max-w-sm space-y-2 rounded-3xl bg-surface p-5 text-right" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-ink">{person.name}</h3>
        <p className="text-sm font-bold text-primary">{person.title}</p>
        <p className="text-[13px] leading-relaxed text-ink-2">{person.strength}</p>
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-xl bg-primary py-2 text-sm font-bold text-surface">بستن</button>
      </div>
    </div>
  );
};

export const Quiz: React.FC<{
  stageId: string;
  questions: QuizQuestion[];
  done: Record<string, TripTaskDone>;
  onAnswered: () => void;
}> = ({ stageId, questions, done, onAnswered }) => {
  const [local, setLocal] = useState<Record<string, { choice: number; correct: boolean; correctIndex: number }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (questions.length === 0) return null;

  const answer = async (q: QuizQuestion, choice: number) => {
    setBusy(q.id);
    setError(null);
    try {
      const res = await answerTripQuestion(stageId, q.id, choice);
      setLocal((l) => ({ ...l, [q.id]: res }));
      onAnswered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت نشد؛ دوباره تلاش کنید.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-bold text-ink">سؤال‌های امتیازی <span className="text-xs font-normal text-ink-3">(هر پاسخ درست ۱۰ امتیاز؛ پاسخ اول ثبت می‌شود)</span></p>
      {questions.map((q, qi) => {
        const server = done[`${stageId}:q:${q.id}`];
        const res = local[q.id];
        const chosen = res?.choice ?? server?.choice;
        const answered = chosen !== undefined;
        return (
          <div key={q.id} className="space-y-2">
            <p className="text-[13px] font-bold leading-relaxed text-ink">{toPersianDigits(qi + 1)}. {q.text}</p>
            <div className="grid gap-1.5">
              {q.options.map((opt, oi) => {
                const isChosen = chosen === oi;
                const isCorrect = res ? res.correctIndex === oi : false;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={answered || busy === q.id}
                    onClick={() => answer(q, oi)}
                    className={cx(
                      'rounded-xl border px-3 py-2 text-right text-[13px] transition-colors',
                      !answered && 'border-line bg-surface-2 text-ink hover:bg-surface',
                      answered && isCorrect && 'border-success bg-success-soft font-bold text-success-ink',
                      answered && isChosen && !isCorrect && res && 'border-danger bg-danger-soft text-danger-ink',
                      answered && isChosen && !res && (server?.correct ? 'border-success bg-success-soft font-bold text-success-ink' : 'border-danger bg-danger-soft text-danger-ink'),
                      answered && !isChosen && !isCorrect && 'border-line bg-surface-2 text-ink-3'
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {error && <p role="alert" className="text-[13px] font-bold text-danger-ink">{error}</p>}
    </div>
  );
};
