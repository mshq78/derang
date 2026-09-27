import React from 'react';
import { AlertOctagon, Video } from 'lucide-react';
import { Modal } from './Modal';
import { videoEmbedUrl } from '../utils/videoEmbed';

interface VideoPlayerModalProps {
  onClose: () => void;
  title?: string;
  badge?: string;
  description?: string;
  videoUrl?: string;
  posterUrl?: string;
  quote?: string;
  reflectionQuestion?: string;
  whyImportant?: string;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  onClose,
  title = 'شاه سلطان حسین؛ هزینه گزاف تعلل',
  badge = 'ویدئوی تحلیلی و طنز انتقادی',
  description = 'کالبدشکافی طنزآمیز و تلخ فرار از مسئولیت تصمیم‌گیری در تاریخ ایران',
  videoUrl,
  posterUrl,
  quote = '«هر چه تقدیر باشد همان خواهد شد!»',
  reflectionQuestion = 'اگر این تصمیمی که امروز پیش‌روی شماست، یک ماه دیگر هم به بهانه «صبر کنیم ببینیم چه می‌شود» به تعویق بیفتد، دقیقاً چه فرصت یا سرمایه‌ای ممکن است برای همیشه نابود شود؟',
  whyImportant = 'شاه سلطان حسین نماد بارز «تعلل خوش‌خیالانه» است. او خردمندانه سکوت نمی‌کرد، بلکه از سر ناتوانی در تحمل رنج تصمیم‌گیری به عافیت‌طلبی پناه برده بود. درنگ به شما یادآوری می‌کند که تصمیم نگرفتن، خود یک تصمیم بسیار پرریسک است.',
}) => {
  // Aparat/YouTube page links cannot be framed directly; use their embed address.
  const embedUrl = videoUrl ? videoEmbedUrl(videoUrl) : null;

  return (
    <Modal
      onClose={onClose}
      title={title}
      subtitle={badge}
      maxWidth="max-w-lg"
      ariaLabelledBy="videoModalTitle"
    >
      {/* Video Content or Placeholder */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
        {videoUrl ? (
          embedUrl ? (
            <div className="relative aspect-video w-full">
              <iframe
                src={embedUrl}
                title={title}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              controls
              playsInline
              preload="metadata"
              poster={posterUrl}
              className="aspect-video w-full bg-black object-contain"
              src={videoUrl}
            />
          )
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning border border-warning/30 mb-3 shadow-sm">
              <Video className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-ink max-w-xs leading-relaxed">
              {quote}
            </p>
            <span className="text-[13px] text-ink-3 mt-1.5 font-medium">
              {description}
            </span>
            <div className="mt-3 rounded-lg bg-surface px-3 py-1 text-xs font-semibold text-ink-2 border border-line">
              ویدئو به‌زودی اضافه می‌شود
            </div>
          </div>
        )}
      </div>

      {/* Reflection & Lessons */}
      <div className="space-y-4 pt-1">
        {/* Lesson prompt */}
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4">
          <div className="flex items-center gap-2 text-danger-ink font-bold text-xs mb-1">
            <AlertOctagon className="h-4 w-4" />
            <span>پرسش تأمل‌برانگیز برای تصمیم شما:</span>
          </div>
          <p className="text-sm text-danger-ink leading-relaxed font-medium">
            {reflectionQuestion}
          </p>
        </div>

        <div className="text-sm text-ink-2 leading-relaxed">
          <strong className="block text-ink font-bold mb-1">
            چرا این ویدئو مهم است؟
          </strong>
          {whyImportant}
        </div>
      </div>
    </Modal>
  );
};
