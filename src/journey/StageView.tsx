import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { STAGES, taskId, type MediaItem, type StageDef } from '../data/journey';
import type { AudioStory, Person, VideoItem } from '../types/content';
import type { SiteSettings } from '../types/content';
import { completeTripTask, type TripState } from '../lib/trip';
import { TrackedAudio } from './TrackedAudio';
import { TrackedVideo } from './TrackedVideo';
import { CardsTask, Quiz, TestTask } from './tasks';

interface ContentSlice {
  site: SiteSettings;
  audioStories: AudioStory[];
  videos: VideoItem[];
  people: Person[];
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
}> = ({ stage, state, content, userId, onBack, refresh }) => {
  const index = STAGES.findIndex((s) => s.id === stage.id);
  const opened = !!state.opened?.[stage.id];
  const done = state.done ?? {};
  const report = (body: Parameters<typeof completeTripTask>[0]) => () => {
    completeTripTask(body)
      .then(refresh)
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
          {stage.groups.map((group) => {
            const available = group.items
              .map((item) => ({ item, found: resolve(item, content) }))
              .filter((x): x is { item: MediaItem; found: NonNullable<ReturnType<typeof resolve>> } => x.found !== null);
            const doneCount = group.items.filter((i) => done[taskId.media(stage.id, group.id, i.key)]).length;
            return (
              <div key={group.id} className="space-y-2">
                {group.items.length > 1 && (
                  <p className="text-xs text-ink-3">
                    {group.title}: صوت یا ویدیو را ببینید؛ اگر هر دو را انجام دهید امتیاز بیشتری می‌گیرید.
                    {doneCount > 0 ? '' : ''}
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
              </div>
            );
          })}

          {stage.special?.includes('test') && (
            <TestTask url={content.site.externalTestUrl || 'https://test.igera.ir/'} done={done[taskId.test]} onSaved={refresh} />
          )}
          {stage.special?.includes('cards') && (
            <CardsTask people={content.people} userId={userId} done={!!done[taskId.cards]} onFinished={report({ stageId: stage.id, special: 'cards' })} />
          )}
          <Quiz stageId={stage.id} questions={stage.quiz} done={done} onAnswered={refresh} />
        </>
      )}
    </div>
  );
};
