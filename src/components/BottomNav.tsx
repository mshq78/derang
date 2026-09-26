import React from 'react';
import { Home, Compass, BookOpen, FolderArchive } from 'lucide-react';
import { Screen } from '../types';
import { toPersianDigits } from '../utils/helpers';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  decisionCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  decisionCount = 0,
}) => {
  const tabs = [
    {
      id: 'home' as Screen,
      label: 'میز کار',
      icon: Home,
      isActive: currentScreen === 'home',
    },
    {
      id: 'learning' as Screen,
      label: 'مسیر',
      icon: Compass,
      isActive: [
        'learning',
        'why',
        'perimeters',
        'skills',
        'sonic',
        'people',
        'stories',
        'challenge',
      ].includes(currentScreen),
    },
    {
      id: 'library' as Screen,
      label: 'کتابخانه',
      icon: BookOpen,
      isActive: ['library', 'book'].includes(currentScreen),
    },
    {
      id: 'decisions' as Screen,
      label: 'پرونده‌ها',
      icon: FolderArchive,
      badge: decisionCount > 0 ? decisionCount : undefined,
      isActive: ['decisions', 'newDecision', 'question', 'report'].includes(currentScreen),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md transition-colors pb-[env(safe-area-inset-bottom)] no-print"
      aria-label="ناوبری اصلی درنگ"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              aria-current={tab.isActive ? 'page' : undefined}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-2 rounded-xl transition-all duration-150 ${
                tab.isActive
                  ? 'text-primary font-bold'
                  : 'text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform duration-150 ${
                    tab.isActive ? 'scale-110' : ''
                  }`}
                  strokeWidth={tab.isActive ? 2.5 : 2}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-surface">
                    {toPersianDigits(tab.badge)}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[13px] tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
