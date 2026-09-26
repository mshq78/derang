import React, { useState } from 'react';
import { RefreshCw, ExternalLink, Sparkles, AlertTriangle } from 'lucide-react';
import { ArchetypeDef } from '../types';

interface ArchetypeCardProps {
  archetype: ArchetypeDef;
  onExploreTest?: () => void;
  externalTestUrl?: string;
  externalTestTitle?: string;
  externalTestSubtitle?: string;
  externalTestButton?: string;
}

const ArchetypePortrait: React.FC<{ id: string; name: string }> = ({ id, name }) => {
  const getColors = () => {
    switch (id) {
      case 'davinci':
        return { bg: '#F3ECDD', primary: '#9A7336' };
      case 'lincoln':
        return { bg: '#E3ECF1', primary: '#3F6E8A' };
      case 'edison':
        return { bg: '#E4EFE8', primary: '#4E8A6A' };
      case 'churchill':
        return { bg: '#F5E5E2', primary: '#A2544E' };
      case 'einstein':
      default:
        return { bg: '#ECE8F2', primary: '#6E5F92' };
    }
  };

  const c = getColors();

  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-line shadow-inner"
      style={{ backgroundColor: c.bg }}
    >
      <div className="flex flex-col items-center justify-center p-6 text-center z-10">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm border border-line"
          style={{ backgroundColor: c.primary, color: 'var(--c-canvas)' }}
        >
          <span className="text-2xl font-bold">{name.slice(0, 1)}</span>
        </div>
        <span
          className="mt-3 text-base font-bold tracking-tight"
          style={{ color: c.primary }}
        >
          {name}
        </span>
      </div>
    </div>
  );
};

export const ArchetypeCard: React.FC<ArchetypeCardProps> = ({
  archetype,
  onExploreTest,
  externalTestUrl,
  externalTestTitle,
  externalTestSubtitle,
  externalTestButton,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Front / Back Toggle Card */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          {/* Portrait frame */}
          <div className="w-36 sm:w-44 flex-shrink-0">
            <ArchetypePortrait id={archetype.id} name={archetype.name} />
          </div>

          {/* Details body */}
          <div className="flex-1 text-right w-full">
            <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <span className="text-xs font-bold text-primary">
                  {archetype.title}
                </span>
                <h3 className="text-xl font-bold text-ink">
                  {archetype.name}
                </h3>
              </div>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink hover:bg-line transition-colors"
                aria-label="مشاهده روی دیگر کارت"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isFlipped ? 'روی کارت (قوت)' : 'پشت کارت (سایه)'}</span>
              </button>
            </div>

            {!isFlipped ? (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-success mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span>نقطه قوت بارز تصمیم‌گیری:</span>
                  </div>
                  <p className="text-sm font-medium text-ink-2 leading-relaxed">
                    {archetype.strength}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-2 p-3.5 border border-line">
                  <p className="text-sm italic text-ink-2 leading-relaxed text-right">
                    {archetype.quote}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-danger mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>روی دیگر نقطه قوت (خطر افراط / سایه):</span>
                  </div>
                  <p className="text-sm font-medium text-ink-2 leading-relaxed">
                    {archetype.shadow}
                  </p>
                </div>

                <div className="rounded-2xl bg-warning-soft p-3.5 border border-warning/30">
                  <span className="text-xs font-bold text-warning-ink block mb-1">
                    پرسش درنگ برای تصمیم شما:
                  </span>
                  <p className="text-sm font-medium text-warning-ink leading-relaxed">
                    {archetype.reflectionQuestion}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* External Gera test callout */}
      <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-2 px-4 py-3">
        <div className="text-right">
          <span className="text-xs font-bold text-ink block">
            {externalTestTitle || 'هنوز الگوی تصمیم‌گیری خود را نمی‌دانید؟'}
          </span>
          <span className="text-[13px] text-ink-2">
            {externalTestSubtitle || 'می‌توانید آزمون پنج شخصیت را در وب‌سایت پردیس نوآوری گِرا انجام دهید.'}
          </span>
        </div>
        <a
          href={externalTestUrl || 'https://test.igera.ir/'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm transition-colors whitespace-nowrap"
          aria-label={`${externalTestButton || 'شروع آزمون گِرا'} (باز شدن در زبانه جدید)`}
        >
          <span>{externalTestButton || 'شروع آزمون گِرا'}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};
