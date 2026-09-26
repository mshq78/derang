import React from 'react';
import { Home, Compass, BookOpen, FolderArchive } from 'lucide-react';
import { Screen } from '../types';

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
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 transition-colors pb-[env(safe-area-inset-bottom)]"
      aria-label="ناوبری اصلی درنگ"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-2 rounded-xl transition-all duration-150 ${
                tab.isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
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
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px] tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
