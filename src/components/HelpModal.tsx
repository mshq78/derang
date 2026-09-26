import React from 'react';
import { Lightbulb, Compass } from 'lucide-react';
import { HELP_CONTENT } from '../data/dorangData';
import { Screen } from '../types';
import { HelpEntry } from '../types/content';
import { Modal } from './Modal';

interface HelpModalProps {
  screen: Screen;
  onClose: () => void;
  onOpenTour: () => void;
  helpEntries?: HelpEntry[];
}

export const HelpModal: React.FC<HelpModalProps> = ({ screen, onClose, onOpenTour, helpEntries }) => {
  const dynamicHelp = helpEntries?.find((h) => h.screen === screen && h.isPublished);
  const fallback = HELP_CONTENT[screen] || HELP_CONTENT.home;

  const title = dynamicHelp?.title || fallback.title;
  const body = dynamicHelp?.body || fallback.body;
  const tip = dynamicHelp?.tip || fallback.tip;

  const footer = (
    <>
      <button
        onClick={() => {
          onClose();
          onOpenTour();
        }}
        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors"
      >
        <Compass className="h-4 w-4" />
        <span>تور آموزشی استفاده از درنگ</span>
      </button>

      <button
        onClick={onClose}
        className="rounded-xl bg-surface-2 px-4 py-2 text-xs font-bold text-ink hover:bg-line transition-colors"
      >
        متوجه شدم
      </button>
    </>
  );

  return (
    <Modal
      onClose={onClose}
      title={title}
      icon={
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold text-xs">
          ؟
        </span>
      }
      footer={footer}
      maxWidth="max-w-md"
      ariaLabelledBy="helpModalTitle"
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-2 leading-relaxed font-normal">
          {body}
        </p>

        <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-warning-ink mb-1">
            <Lightbulb className="h-4 w-4" />
            <span>اصل درنگ:</span>
          </div>
          <p className="text-sm text-warning-ink leading-relaxed font-medium">
            {tip}
          </p>
        </div>
      </div>
    </Modal>
  );
};
