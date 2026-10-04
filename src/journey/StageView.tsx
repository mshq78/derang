import React from 'react';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { STAGES, taskId, type MediaItem, type StageDef } from '../data/journey';
import type { AudioStory, Person, TourSlide, VideoItem } from '../types/content';
import type { SiteSettings } from '../types/content';
import { bodyTaskId, completeOrQueue, type CompleteBody, type TripState } from '../lib/trip';
import { TrackedAudio } from './TrackedAudio';
import { TrackedVideo } from './TrackedVideo';
import { JOURNEY_TEXTS } from '../data/journeyTexts';
import { CardsTask, Quiz, TextPanel, TestTask, TourTask } from './tasks';

interface ContentSlice {
  site: SiteSettings;
  audioStories: AudioStory[];
  videos: VideoItem[];
  people: Person[];
  tour: TourSlide[];
}

function resolve(item: MediaItem, content: ContentSlice): { url: string; title: string; poster?: string } | null {
  const ref = item.ref;
  if (ref.source === 'intro') {
    return content.site.introAudioUrl ? { url: content.site.introAudioUrl, title: content.site.introAudioTitle || 'معرفی صوتی درنگ' } : null;
  }
  if (ref.source === 'story') {
    const s = content.audioStories.find((x) => x.id === ref.id);
    return s?.audioUrl ? { url: s.audioUrl, title: s.title } : null;
  }
  const v = content.videos.find((x) => (ref.id ? x.id === ref.id : ref.titleIncludes ? x.title.includes(ref.titleIncludes) : false));
  return v?.videoUrl ? { url: v.videoUrl, title: v.title, poster: v.posterUrl } : null;
}

export const StageView: React.FC<{
  stage: StageDef;
  state: TripState;
  content: ContentSlice;
  userId: string;
  onBack: () => void;
  refresh: () => void;
  markDone: (task: string) => void;
}> = ({ stage, state, content, userId, onBack, refresh, markDone }) => {
  const index = STAGES.findIndex((s) => s.id === stage.id);
  const opened = !!state.opened?.[stage.id];
  const done = state.done ?? {};
  const report = (body: CompleteBody) => () => {
    completeOrQueue(userId, body)
      .then((result) => (result === 'queued' ? markDone(bodyTaskId(body)) : refresh()))
      .catch(() => undefined); // it is retried the next time the part is finished
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-ink-2 hover:text-ink">
        <ArrowRight className="h-3.5 w-3.5" /> بازگشت به مسیر
      </button>
      <div>
        <p className="text-xs font-bold text-primary">مرحله‌ی {String(index + 1).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}</p>
        <h2 className="text-xl font-extrabold text-ink">{stage.title}</h2>
        <p className="mt-1 text-[13px] text-ink-3">{stage.subtitle}</p>
      </div>

      {!opened ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center">
          <Lock className="h-6 w-6 text-ink-3" />
          <p className="text-sm font-bold text-ink">این مرحله هنوز باز نشده است.</p>
          <p className="text-[13px] text-ink-3">وقتی زمانش شد، خودتان خبر می‌دهیم و همین‌جا باز می‌شود.</p>
        </div>
      ) : (
        <>
          {stage.special && <StepsOverview stage={stage} done={done} />}
          {stage.groups.map((group) => {
            const available = group.items
              .map((item) => ({ item, found: resolve(item, content) }))
              .filter((x): x is { item: MediaItem; found: NonNullable<ReturnType<typeof resolve>> } => x.found !== null);
            const groupDone = ['audio', 'video', 'text', 'tour', 'confirm'].some((k) => done[taskId.media(stage.id, group.id, k)]);
            return (
              <div key={group.id} id={`step-${group.id}`} className="scroll-mt-20 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-ink">{group.title}</p>
                  {groupDone && (
                    <span className="flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success-ink">
                      <CheckCircle2 className="h-3.5 w-3.5" /> انجام شد
                    </span>
                  )}
                </div>
                {group.items.length > 1 && (
                  <p className="text-xs text-ink-3">
                    صوت یا ویدیو را ببینید (یا متن را بخوانید)؛ اگر هر دو، صوت و ویدیو را انجام دهید، امتیاز بیشتری می‌گیرید.
                  </p>
                )}
                {available.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-4 text-center text-[13px] text-ink-3">
                    این محتوا هنوز آماده نشده است.
                  </div>
                )}
                {available.map(({ item, found }) =>
                  item.key === 'audio' ? (
                    <TrackedAudio
                      key={item.key}
                      src={found.url}
                      title={`صوت: ${found.title}`}
                      done={!!done[taskId.media(stage.id, group.id, 'audio')]}
                      onFinished={report({ stageId: stage.id, groupId: group.id, key: 'audio' })}
                    />
                  ) : (
                    <TrackedVideo
                      key={item.key}
                      src={found.url}
                      poster={found.poster}
                      title={`ویدیو: ${found.title}`}
                      done={!!done[taskId.media(stage.id, group.id, 'video')]}
                      onFinished={report({ stageId: stage.id, groupId: group.id, key: 'video' })}
                    />
                  )
                )}
                {group.tour && (
                  <TourTask
                    slides={content.tour}
                    done={!!done[taskId.media(stage.id, group.id, 'tour')]}
                    onFinished={report({ stageId: stage.id, groupId: group.id, key: 'tour' })}
                  />
                )}
                {group.text && JOURNEY_TEXTS[group.id] && (
                  <TextPanel
                    text={JOURNEY_TEXTS[group.id]}
                    done={!!done[taskId.media(stage.id, group.id, 'text')]}
                    onFinished={report({ stageId: stage.id, groupId: group.id, key: 'text' })}
                  />
                )}
              </div>
            );
          })}

          {stage.special?.includes('test') && (
            <div id="step-test" className="scroll-mt-20"><TestTask url={content.site.externalTestUrl || 'https://test.igera.ir/'} done={done[taskId.test]} onSaved={refresh} /></div>
          )}
          {stage.special?.includes('cards') && (
            <div id="step-cards" className="scroll-mt-20"><CardsTask people={content.people} userId={userId} done={!!done[taskId.cards]} onFinished={report({ stageId: stage.id, special: 'cards' })} /></div>
          )}
          <Quiz stageId={stage.id} questions={stage.quiz} done={done} counted={!!state.me?.stages[stage.id]?.complete} onAnswered={refresh} />

          <StageConfirm
            stage={stage}
            complete={!!state.me?.stages[stage.id]?.complete}
            done={done}
            send={(body) => completeOrQueue(userId, body)}
            markDone={markDone}
            refresh={refresh}
          />
        </>
      )}
    </div>
  );
};

/** The tasks of the first stage as a short checklist: what is done and what to do now. */
const StepsOverview: React.FC<{ stage: StageDef; done: TripState['done'] }> = ({ stage, done = {} }) => {
  const intro = stage.groups[0];
  const steps = [
    { id: `step-${intro.id}`, label: 'معرفی درنگ؛ صوت را بشنوید یا تور را ببینید', ok: ['audio', 'tour', 'text', 'confirm'].some((k) => done[taskId.media(stage.id, intro.id, k)]) },
    { id: 'step-test', label: 'تست شخصیت؛ بروید، تست را انجام دهید و برگردید نتیجه را ثبت کنید', ok: !!done[taskId.test] },
    { id: 'step-cards', label: 'پنج کارت؛ هر کارت را از روی و پشت بخوانید', ok: !!done[taskId.cards] },
  ];
  const next = steps.findIndex((s) => !s.ok);
  const digits = '۰۱۲۳۴۵۶۷۸۹';
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-extrabold text-ink">این مرحله سه کار دارد</p>
      <ol className="space-y-1.5">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              onClick={() => document.getElementById(st.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-[13px] ${next === i ? 'bg-primary-soft font-extrabold text-primary' : st.ok ? 'text-ink-3' : 'text-ink'}`}
            >
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${st.ok ? 'bg-success text-surface' : next === i ? 'bg-primary text-surface' : 'bg-surface-2 text-ink-3'}`}>
                {st.ok ? <CheckCircle2 className="h-4 w-4" /> : digits[i + 1]}
              </span>
              <span className="flex-1">{st.label}</span>
              {next === i && <span className="flex-shrink-0 text-xs">الان نوبت این است</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};

/** A big button to confirm the whole stage by hand (for when the sound or video would not play). */
const StageConfirm: React.FC<{
  stage: StageDef;
  complete: boolean;
  done: Record<string, unknown>;
  send: (body: CompleteBody) => Promise<'sent' | 'queued'>;
  markDone: (task: string) => void;
  refresh: () => void;
}> = ({ stage, complete, done, send, markDone, refresh }) => {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(t);
  }, [armed]);

  if (complete) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-3xl bg-success-soft p-5 text-base font-extrabold text-success-ink">
        <CheckCircle2 className="h-6 w-6" /> این مرحله را انجام دادید
      </div>
    );
  }

  const confirm = async () => {
    setBusy(true);
    setNote(null);
    const bodies: CompleteBody[] = [];
    for (const group of stage.groups) {
      const finished = ['audio', 'video', 'text', 'tour', 'confirm'].some((k) => done[taskId.media(stage.id, group.id, k)]);
      if (!finished) bodies.push({ stageId: stage.id, groupId: group.id, key: 'confirm' });
    }
    if (stage.special?.includes('cards') && !done[taskId.cards]) bodies.push({ stageId: stage.id, special: 'cards' });
    try {
      for (const body of bodies) {
        if ((await send(body)) === 'queued') markDone(bodyTaskId(body));
      }
      if (stage.special?.includes('test') && !done[taskId.test]) {
        setNote('بخش‌های دیگر ثبت شد. برای تکمیل مرحله، نتیجه‌ی تست شخصیت را هم انتخاب و ثبت کنید.');
      }
      refresh();
    } catch {
      setNote('ثبت نشد؛ اتصال را بررسی کنید و دوباره بزنید.');
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => (armed ? void confirm() : setArmed(true))}
        className={`w-full rounded-3xl px-5 py-5 text-center text-base font-extrabold shadow-md transition-all active:scale-[0.99] disabled:opacity-60 ${
          armed ? 'bg-success text-surface' : 'bg-primary text-surface'
        }`}
      >
        {busy ? 'در حال ثبت...' : armed ? 'بله، این مرحله را انجام دادم' : 'من این مرحله را انجام دادم'}
        <span className="mt-1 block text-xs font-normal opacity-90">
          {armed ? 'برای تأیید نهایی یک بار دیگر بزنید' : 'اگر صوت یا ویدیو پخش نشد، همین‌جا تأیید کنید'}
        </span>
      </button>
      {note && <p role="status" className="rounded-xl bg-warning-soft px-3 py-2 text-[13px] font-bold text-warning-ink">{note}</p>}
    </div>
  );
};
