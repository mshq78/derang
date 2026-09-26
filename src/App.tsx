import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Compass,
  Sparkles,
  BookOpen,
  Volume2,
  Video,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Award,
  RefreshCw,
  Printer,
  Clock,
} from 'lucide-react';

import {
  Screen,
  AnswerValue,
  DecisionRecord,
  UserProfile,
  AppSettings,
} from './types';
import {
  STATIONS,
  QUESTIONS,
  PERIMETERS,
  SKILLS,
  SONIC,
  PEOPLE,
  AUDIO_STORIES,
  BOOK_QA,
  CHALLENGES,
} from './data/dorangData';
import { toPersianDigits, formatDisplayDate, truncate } from './utils/helpers';
import { playSoundEffect } from './utils/audioEffects';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { ArchetypeCard } from './components/ArchetypeCard';
import { AudioPlayer } from './components/AudioPlayer';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { SettingsModal } from './components/SettingsModal';
import { TourModal } from './components/TourModal';
import { HelpModal } from './components/HelpModal';
import { Confetti } from './components/Confetti';

const STORAGE_KEY = 'gera_dorang_unified_v2';

const DEFAULT_SETTINGS: AppSettings = {
  font: 1,
  volume: 0.85,
  fxVolume: 0.8,
  sound: true,
  motion: true,
  highContrast: false,
};

export default function App() {
  // State Initialization with LocalStorage
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) return parsed.profile;
      }
    } catch {
      // Ignore
    }
    return { first: '', last: '' };
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.settings) return { ...DEFAULT_SETTINGS, ...parsed.settings };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [decisions, setDecisions] = useState<DecisionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.decisions)) return parsed.decisions;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeDecisionId) return parsed.activeDecisionId;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [learningDone, setLearningDone] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.learningDone)) return parsed.learningDone;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [unlockedArchetypes, setUnlockedArchetypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.unlockedArchetypes)) return parsed.unlockedArchetypes;
      }
    } catch {
      // Ignore
    }
    return ['davinci'];
  });

  const [screen, setScreen] = useState<Screen>('home');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [activeArchetype, setActiveArchetype] = useState('davinci');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'audio' | 'video' | 'poster' | 'book' | 'practice'>('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [openBookIndex, setOpenBookIndex] = useState<number | null>(null);

  // Challenge Quiz state
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeAnswered, setChallengeAnswered] = useState(false);
  const [selectedChallengeOption, setSelectedChallengeOption] = useState<number | null>(null);
  const [challengeCorrectCount, setChallengeCorrectCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<'none' | 'help' | 'settings' | 'tour' | 'video'>('none');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Decision Form state
  const [newTitle, setNewTitle] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newWhy, setNewWhy] = useState('');

  // Active question hint state
  const [activeQuestionHint, setActiveQuestionHint] = useState<'none' | 'help' | 'exercise'>('none');

  // Sync to LocalStorage
  useEffect(() => {
    try {
      const payload = {
        profile,
        settings,
        decisions,
        activeDecisionId,
        learningDone,
        unlockedArchetypes,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage might be full
    }
  }, [profile, settings, decisions, activeDecisionId, learningDone, unlockedArchetypes]);

  // Apply styling settings
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(settings.font));
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [settings.font, settings.highContrast]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleNavigate = (newScreen: Screen) => {
    playSoundEffect('tap', settings.sound, settings.fxVolume);
    setScreen(newScreen);
    window.scrollTo({ top: 0, behavior: settings.motion ? 'smooth' : 'auto' });
  };

  const currentDecision = useMemo(() => {
    return decisions.find((d) => d.id === activeDecisionId) || null;
  }, [decisions, activeDecisionId]);

  const markLearningDone = (moduleId: string) => {
    if (!learningDone.includes(moduleId)) {
      setLearningDone((prev) => [...prev, moduleId]);
    }
  };

  // Next recommended learning step
  const nextLearningStep = useMemo(() => {
    const sequence = [
      { id: 'why', title: 'چرا قضاوت خطا می‌کند؟', screen: 'why' as Screen },
      { id: 'perimeters', title: 'ده دام مدل PERIMETERS', screen: 'perimeters' as Screen },
      { id: 'skills', title: 'هفت شایستگی رهبری هوشیار', screen: 'skills' as Screen },
      { id: 'sonic', title: 'ابزارهای پنج‌گانه SONIC', screen: 'sonic' as Screen },
      { id: 'people', title: 'پنج الگوی تصمیم‌گیری', screen: 'people' as Screen },
      { id: 'stories', title: 'روایت‌ها و تجارب واقعی', screen: 'stories' as Screen },
      { id: 'challenge', title: 'چالش‌های کشف و بازخورد', screen: 'challenge' as Screen },
    ];
    return sequence.find((s) => !learningDone.includes(s.id)) || sequence[sequence.length - 1];
  }, [learningDone]);

  // Profile submission handler
  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const firstInput = form.elements.namedItem('first') as HTMLInputElement;
    const lastInput = form.elements.namedItem('last') as HTMLInputElement;

    const first = firstInput?.value.trim() || '';
    const last = lastInput?.value.trim() || '';

    if (!first) {
      showToast('لطفاً نام خود را وارد کنید.');
      return;
    }

    setProfile({ first, last });
    playSoundEffect('enter', settings.sound, settings.fxVolume);
    showToast(`${first} عزیز، به درنگ خوش آمدید!`);
  };

  // Create Decision
  const handleCreateDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProblem.trim()) {
      showToast('عنوان و صورت مسئله الزامی است.');
      return;
    }

    const newRecord: DecisionRecord = {
      id: `d_${Date.now()}`,
      title: newTitle.trim(),
      problem: newProblem.trim(),
      why: newWhy.trim(),
      created: new Date().toISOString(),
      answers: {},
    };

    setDecisions((prev) => [newRecord, ...prev]);
    setActiveDecisionId(newRecord.id);
    setQuestionIndex(0);
    setActiveQuestionHint('none');
    setNewTitle('');
    setNewProblem('');
    setNewWhy('');
    playSoundEffect('enter', settings.sound, settings.fxVolume);
    handleNavigate('question');
  };

  // Answer question
  const handleAnswerQuestion = (val: AnswerValue) => {
    if (!activeDecisionId) return;
    const q = QUESTIONS[questionIndex];
    playSoundEffect('tap', settings.sound, settings.fxVolume);

    setDecisions((prev) =>
      prev.map((d) => {
        if (d.id === activeDecisionId) {
          const currentAns = d.answers[q.id] || {};
          return {
            ...d,
            answers: {
              ...d.answers,
              [q.id]: {
                ...currentAns,
                value: val,
              },
            },
          };
        }
        return d;
      })
    );
  };

  // Question Note
  const handleUpdateNote = (noteText: string) => {
    if (!activeDecisionId) return;
    const q = QUESTIONS[questionIndex];
    setDecisions((prev) =>
      prev.map((d) => {
        if (d.id === activeDecisionId) {
          const currentAns = d.answers[q.id] || {};
          return {
            ...d,
            answers: {
              ...d.answers,
              [q.id]: {
                ...currentAns,
                note: noteText,
              },
            },
          };
        }
        return d;
      })
    );
  };

  // Challenge answer handler
  const handleChallengeAnswer = (optionIdx: number) => {
    if (challengeAnswered) return;
    const currentChallenge = CHALLENGES[challengeIndex % CHALLENGES.length];
    const isCorrect = optionIdx === currentChallenge.ans;

    setSelectedChallengeOption(optionIdx);
    setChallengeAnswered(true);

    if (isCorrect) {
      playSoundEffect('win', settings.sound, settings.fxVolume);
      setShowConfetti(true);
      setChallengeCorrectCount((prev) => prev + 1);

      // Archetype unlock logic
      const archetypesList = ['davinci', 'lincoln', 'edison', 'churchill', 'einstein'];
      const nextUnlockIndex = Math.min(
        archetypesList.length - 1,
        Math.floor((challengeCorrectCount + 1) / 2)
      );
      const toUnlock = archetypesList[nextUnlockIndex];
      if (toUnlock && !unlockedArchetypes.includes(toUnlock)) {
        setUnlockedArchetypes((prev) => [...prev, toUnlock]);
        setTimeout(() => {
          showToast(`کارت شخصیت «${PEOPLE[toUnlock].name}» در مجموعه شما باز شد!`);
        }, 600);
      }
    } else {
      playSoundEffect('wrong', settings.sound, settings.fxVolume);
    }
  };

  const handleNextChallenge = () => {
    playSoundEffect('tap', settings.sound, settings.fxVolume);
    setChallengeIndex((prev) => (prev + 1) % CHALLENGES.length);
    setChallengeAnswered(false);
    setSelectedChallengeOption(null);
  };

  // Backup & Restore handlers
  const handleBackupDownload = () => {
    const data = {
      version: 2,
      exportDate: new Date().toISOString(),
      decisions,
      learningDone,
      unlockedArchetypes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dorang_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('فایل پشتیبان با موفقیت دانلود شد.');
  };

  const handleRestoreFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.decisions)) {
        setDecisions((prev) => {
          const existingIds = new Set(prev.map((d) => d.id));
          const newOnes = parsed.decisions.filter((d: DecisionRecord) => !existingIds.has(d.id));
          return [...prev, ...newOnes];
        });
      }
      if (Array.isArray(parsed.learningDone)) {
        setLearningDone((prev) => [...new Set([...prev, ...parsed.learningDone])]);
      }
      if (Array.isArray(parsed.unlockedArchetypes)) {
        setUnlockedArchetypes((prev) => [...new Set([...prev, ...parsed.unlockedArchetypes])]);
      }
      showToast('اطلاعات با موفقیت بازیابی شد.');
      setActiveModal('none');
    } catch {
      showToast('خطا در خواندن فایل پشتیبان.');
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('آیا از حذف تمام پرونده‌ها و پیشرفت یادگیری مطمئن هستید؟ این عمل برگشت‌ناپذیر است.')) {
      localStorage.removeItem(STORAGE_KEY);
      setDecisions([]);
      setActiveDecisionId(null);
      setLearningDone([]);
      setUnlockedArchetypes(['davinci']);
      setActiveModal('none');
      showToast('تمام اطلاعات پاک‌سازی شد.');
    }
  };

  // 1. Onboarding Screen if Name not provided
  if (!profile.first) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-right">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-lg shadow-blue-500/25 mb-3">
              د
            </div>
            <span className="text-xs font-bold text-blue-600 mb-1">
              پردیس نوآوری گِرا
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              به سامانه «دِرانْـگ» خوش آمدید
            </h1>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-sm">
              همراه هوشیار شما برای مکث‌های سرنوشت‌ساز، سنجش سوگیری‌ها و تصمیم‌گیری‌های شفاف و سنجیده.
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="first" className="block text-xs font-bold text-slate-700 mb-1.5">
                نام شما
              </label>
              <input
                id="first"
                name="first"
                type="text"
                required
                maxLength={40}
                placeholder="مثلاً: مریم یا آرش"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-right"
              />
            </div>

            <div>
              <label htmlFor="last" className="block text-xs font-bold text-slate-700 mb-1.5">
                نام خانوادگی <span className="text-slate-400 font-normal">(اختیاری)</span>
              </label>
              <input
                id="last"
                name="last"
                type="text"
                maxLength={50}
                placeholder="مثلاً: نیک‌بخت"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-right"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] transition-all"
              >
                <span>شروع تجربه درنگ</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </form>

          <p className="mt-5 text-center text-[11px] text-slate-400">
            اطلاعات شما به طور محرمانه در همین دستگاه باقی می‌ماند.
          </p>
        </div>
      </div>
    );
  }

  // 2. Farewell Screen
  if (screen === 'farewell') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-right">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 text-center shadow-xl">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold text-2xl mb-4 border border-emerald-100">
            ✓
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {profile.first} عزیز، سپاس از درنگ هوشیارانه امروز شما
          </h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            تمامی پرونده‌ها و یادداشت‌های شما روی همین مرورگر محفوظ است. هر زمان که تصمیمی تازه در پیش داشتید، با یک مکث کوتاه به درنگ بازگردید.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => handleNavigate('home')}
              className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
            >
              بازگشت به میز کار درنگ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Core App Layout
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 transition-colors">
      {/* Top Bar */}
      <TopBar
        currentScreen={screen}
        onNavigate={handleNavigate}
        onOpenHelp={() => setActiveModal('help')}
        onOpenSettings={() => setActiveModal('settings')}
        onExit={() => {
          playSoundEffect('exit', settings.sound, settings.fxVolume);
          setScreen('farewell');
        }}
      />

      {/* Main View Area */}
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
        {/* ============================================================== */}
        {/* SCREEN: HOME (میز کار) */}
        {/* ============================================================== */}
        {screen === 'home' && (
          <div className="flex flex-col gap-5 text-right">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">
                  <span>همراه اختصاصی تصمیم‌گیری</span>
                  <span aria-hidden="true">·</span>
                  <span>{profile.first} عزیز، خوش آمدید</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  پیش از یک تصمیم مهم، چند دقیقه «درنگ» کنید.
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  مسئله را در پنج ایستگاه نقادانه بسنجید؛ سوگیری‌های پنهان را آشکار سازید و پیامدهای غیرقابل بازگشت را پیش از وقوع مهار کنید.
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => handleNavigate('newDecision')}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>بررسی تصمیم جدید</span>
                  </button>

                  {currentDecision && (
                    <button
                      onClick={() => handleNavigate('question')}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors shadow-sm"
                    >
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                      <span>ادامه تصمیم «{truncate(currentDecision.title, 22)}»</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveModal('tour')}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 px-3.5 py-3 text-xs font-semibold text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 transition-colors"
                  >
                    <Compass className="h-4 w-4" />
                    <span>تور آموزشی</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick 2-Column Section: Learning Next Step + Discovery Quiz */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Learning Next Step Card */}
              <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      گام بعدی یادگیری
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                      {toPersianDigits(learningDone.length)} از {toPersianDigits(7)} ایستگاه
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
                    {nextLearningStep.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    با گذراندن این بخش، خطاهای قضاوت را بهتر تشخیص داده و چک‌لیست تصمیم را با تسلط بیشتری به کار می‌گیرید.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-2 rounded-full transition-all ${
                          idx < learningDone.length
                            ? 'w-4 bg-blue-600'
                            : 'w-2 bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleNavigate(nextLearningStep.screen)}
                    className="flex items-center gap-1 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <span>ادامه مسیر</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* 2-Minute Discovery Challenge Card */}
              <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      کشف ۲ دقیقه‌ای
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {toPersianDigits(challengeCorrectCount)} امتیاز درست
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
                    چالش کشف دام‌ها و ابزارهای مکث
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    یک سناریوی تصمیم‌گیری واقعی را بسنجید، بازخورد منطقی بگیرید و کارت‌های شخصیت را باز کنید.
                  </p>
                </div>

                {/* Collectible Cards Strip */}
                <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
                  {Object.keys(PEOPLE).map((pKey) => {
                    const isUnlocked = unlockedArchetypes.includes(pKey);
                    return (
                      <span
                        key={pKey}
                        className={`flex h-8 px-2.5 items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
                          isUnlocked
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isUnlocked ? PEOPLE[pKey].name.split(' ')[0] : '🔒'}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleNavigate('challenge')}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-sm transition-all"
                  >
                    <span>ورود به چالش</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Spotlight on Library */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    کتابخانه و منابع همراه
                  </h3>
                  <span className="text-xs text-slate-500">
                    روایت‌های عبرت‌آموز صوتی، پاسخ‌های کتاب Tune In، و الگوهای تصمیم
                  </span>
                </div>
                <button
                  onClick={() => handleNavigate('library')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                >
                  <span>مشاهده همه</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setLibraryFilter('audio');
                    handleNavigate('library');
                  }}
                  className="flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors text-right"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 mb-2">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    ۶ روایت صوتی
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    اصفهان، تایتان، ترابانت و پالو آلتو
                  </span>
                </button>

                <button
                  onClick={() => handleNavigate('book')}
                  className="flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-amber-50/50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors text-right"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 mb-2">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    پرسش‌های کتاب Tune In
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    ۱۵ پرسش با تمرین‌های ۶۰ ثانیه‌ای
                  </span>
                </button>

                <button
                  onClick={() => handleNavigate('people')}
                  className="flex flex-col items-start p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors text-right"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 mb-2">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    پنج الگوی تصمیم
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    نقطه قوت و سایه افراط شخصیت‌ها
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: LEARNING PATH (مسیر یادگیری) */}
        {/* ============================================================== */}
        {screen === 'learning' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                مسیر هفت‌گانه هوشیاری
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                از شناخت خطاهای ذهن تا مهارت سنجش در عمل
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                می‌توانید به ترتیب پیشنهادی پیش بروید یا هر زمان بر حسب نیاز وارد هر بخش شوید. این مسیر برای پرورش عضله فکری شماست.
              </p>

              {/* Progress Line */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  میزان پیشرفت کلی: {toPersianDigits(Math.round((learningDone.length / 7) * 100))}٪
                </span>
                <button
                  onClick={() => {
                    setLearningDone([]);
                    showToast('مسیر یادگیری برای بازخوانی مجدد بازنشانی شد.');
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                >
                  مرور مجدد از آغاز
                </button>
              </div>
            </div>

            {/* Path Steps List */}
            <div className="flex flex-col gap-3">
              {[
                {
                  id: 'why',
                  title: '۱. چرا اصلاً به «درنگ» نیاز داریم؟',
                  desc: 'کالبدشکافی نقاط کور (Blind spots)، نقاط ناشنوا (Deaf spots) و نقاط لال (Dumb spots).',
                  screen: 'why' as Screen,
                },
                {
                  id: 'perimeters',
                  title: '۲. ده دام پنهان در مدل PERIMETERS',
                  desc: 'از قدرت و ایگو تا هویت و داستان‌سرایی؛ ابزار تشخیص سوگیری‌ها پیش از اجرا.',
                  screen: 'perimeters' as Screen,
                },
                {
                  id: 'skills',
                  title: '۳. هفت شایستگی رهبری هوشیار',
                  desc: 'شایستگی‌های رفتار تصمیم‌گیرنده: ذهن باز، واقعیت‌سنجی، شنیدن مخالف و مرز اخلاقی.',
                  screen: 'skills' as Screen,
                },
                {
                  id: 'sonic',
                  title: '۴. ابزارهای پنج‌گانه SONIC در لحظه',
                  desc: 'تکنیک‌های ۵ چرا، حذف فرضی گزینه اول، آزمون احتمال و اصطکاک تصمیم.',
                  screen: 'sonic' as Screen,
                },
                {
                  id: 'people',
                  title: '۵. پنج الگوی تصمیم‌گیری (شخصیت‌ها)',
                  desc: 'داوینچی، لینکلن، ادیسون، چرچیل و اینشتین؛ نقطه قوت و روی دیگر آن (خطر افراط).',
                  screen: 'people' as Screen,
                },
                {
                  id: 'stories',
                  title: '۶. روایت‌ها و عبرت‌های زنده',
                  desc: 'ماجرای تایتان، اصفهان، ترابانت، پالو آلتو و ویدئوی تحلیلی شاه سلطان حسین.',
                  screen: 'stories' as Screen,
                },
                {
                  id: 'challenge',
                  title: '۷. چالش‌های کشف و تمرین تعاملی',
                  desc: 'سنجش موقعیت‌های واقعی، تشخیص دام، دریافت بازخورد سازنده و باز کردن کارت‌ها.',
                  screen: 'challenge' as Screen,
                },
              ].map((step, idx) => {
                const isDone = learningDone.includes(step.id);
                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between rounded-2xl border p-4.5 transition-all ${
                      isDone
                        ? 'border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isDone ? '✓' : toPersianDigits(idx + 1)}
                      </div>
                      <div className="text-right">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {step.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavigate(step.screen)}
                      className={`flex-shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                        isDone
                          ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      {isDone ? 'مرور' : 'شروع'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-SCREEN: WHY (چرا درنگ؟) */}
        {/* ============================================================== */}
        {screen === 'why' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                گام اول · ریشه‌یابی خطا
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                چرا اصلاً به «درنگ» نیاز داریم؟
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                کتاب Tune In اثر نوالا والش نشان می‌دهد که فجایع مدیریتی معمولاً از سر کمبود اطلاعات روی نمی‌دهند؛ بلکه نتیجه دنیای داده‌زده، پرشتاب و پرنویزی هستند که در آن تفکر تحلیلی فدای شتاب‌زدگی می‌شود.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 block mb-1">
                    نقاط کور (Blind spots)
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    واقعیات و نشانه‌هایی که به دلیل سوگیری‌های اولیه یا فیلترهای ذهنی اصلاً در دامنه توجهمان قرار نمی‌گیرند.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block mb-1">
                    نقاط ناشنوا (Deaf spots)
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    هشدارهایی که به گوشمان می‌رسد، اما به دلیل غرور، تعصب یا اعتبار گوینده، آن‌ها را نشنیده می‌گیریم.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 block mb-1">
                    نقاط لال (Dumb spots)
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    لحظاتی که متوجه خطر یا ایرادی در تصمیم می‌شویم اما از ترس جمع یا همرنگی، شجاعت سخن گفتن را از دست می‌دهیم.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-blue-50/70 p-4 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block mb-1">
                  هدف غایی درنگ:
                </span>
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                  هدف حذف صددرصدی تمام خطاها نیست؛ هدف ایجاد یک «اصطکاک هوشیارانه» است تا پیش از فرود آمدن چکش تصمیم، مطمئن شویم چیزی حیاتی از قلم نیفتاده است.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  بازگشت به فهرست مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('why');
                    handleNavigate('perimeters');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <span>ثبت و رفتن به مدل PERIMETERS</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-SCREEN: PERIMETERS (ده دام تصمیم) */}
        {/* ============================================================== */}
        {screen === 'perimeters' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                گام دوم · مدل ده مؤلفه‌ای
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                ده دام تصمیم در مدل PERIMETERS
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                این ده دام حاصل هزاران تصمیم ناموفق در سیاست و کسب‌وکار است. هدف حفظ اصطلاحات انگلیسی نیست؛ بلکه تجهیز ذهن به یک قطب‌نمای هشدار در لحظه قضاوت است.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERIMETERS.map((p, idx) => (
                  <div
                    key={p.en}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-200/50 pb-2 dark:border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-mono text-xs font-bold">
                            {p.tag}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {p.fa} ({p.en})
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          دام {toPersianDigits(idx + 1)} از ۱۰
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>

                    <div className="mt-3.5 space-y-2 border-t border-slate-200/40 pt-2.5 dark:border-slate-800">
                      <div className="rounded-xl bg-amber-50/80 p-2.5 dark:bg-amber-950/20 border border-amber-200/40">
                        <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                          پرسش درنگ:
                        </span>
                        <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                          {p.question}
                        </p>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong className="text-slate-700 dark:text-slate-300">راهکار پادزهر: </strong>
                        {p.solution}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('perimeters');
                    handleNavigate('skills');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <span>ثبت و رفتن به شایستگی‌ها</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-SCREEN: SKILLS (شایستگی‌های رهبری هوشیار) */}
        {/* ============================================================== */}
        {screen === 'skills' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                گام سوم · رفتار و شایستگی
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                هفت شایستگی رهبری هوشیار
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                چارچوب شایستگی‌های طراحی‌شده در پردیس نوآوری گِرا برای رویارویی با ده دام تصمیم‌گیری.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {SKILLS.map((skill, idx) => (
                  <div
                    key={skill.name}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs mt-0.5">
                      {toPersianDigits(idx + 1)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {skill.name}
                      </h4>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {skill.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('skills');
                    handleNavigate('sonic');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <span>ثبت و رفتن به ابزارهای SONIC</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-SCREEN: SONIC (ابزارهای اصطکاک تصمیم) */}
        {/* ============================================================== */}
        {screen === 'sonic' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                گام چهارم · جعبه ابزار اقدام در لحظه
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                مدل SONIC؛ اصطکاک هوشیارانه
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                برگرفته از فصل ۱۴ کتاب Tune In؛ این ۵ تکنیک برای کند کردن کورکورانه نیست، بلکه برای مداخله در گلوگاه‌های تصمیم است.
              </p>

              <div className="mt-6 space-y-3.5">
                {SONIC.map((tool) => (
                  <div
                    key={tool.letter}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-lg">
                        {tool.letter}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {tool.fa}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({tool.en})
                          </span>
                        </div>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                          ابزار کلیدی: {tool.tool}
                        </span>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {tool.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('sonic');
                    handleNavigate('people');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <span>ثبت و رفتن به الگوهای شخصیت</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-SCREEN: PEOPLE (پنج الگوی تصمیم‌گیری) */}
        {/* ============================================================== */}
        {screen === 'people' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                گام پنجم · تیپ‌های تصمیم‌گیری
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                پنج الگوی تصمیم‌گیری تاریخی
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                هر انسان دارای یک نقطه قوت اصلی در تصمیم‌گیری است؛ اما جالب اینجاست که بزرگ‌ترین شکست‌ها معمولاً در اثر «افراط در همان نقطه قوت» رقم می‌خورد! روی کارت‌ها بزنید تا سایه پنهان هر کدام را کشف کنید.
              </p>

              {/* Archetype switcher tabs */}
              <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {Object.keys(PEOPLE).map((id) => {
                  const p = PEOPLE[id];
                  const isActive = activeArchetype === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        playSoundEffect('tap', settings.sound, settings.fxVolume);
                        setActiveArchetype(id);
                      }}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Archetype Card */}
              <div className="mt-4">
                <ArchetypeCard archetype={PEOPLE[activeArchetype]} />
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('people');
                    handleNavigate('stories');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <span>ثبت و رفتن به روایت‌ها</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-SCREEN: STORIES (روایت‌ها و تجارب) */}
        {/* ============================================================== */}
        {screen === 'stories' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                گام ششم · روایت‌های تاریخی و صنعتی
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                دیدن دام‌ها در صحنه تاریخ و کسب‌وکار
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                یکی از روایت‌های صوتی را گوش دهید یا ویدئوی تحلیلی را تماشا کنید و ببینید کدام دام در پروژه‌های شما نیز زمزمه می‌کند.
              </p>

              {/* Video Spotlight Card */}
              <div className="mt-5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-5 dark:border-amber-900/40 dark:from-slate-900 dark:to-slate-850">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      ویدئوی تحلیلی و طنز انتقادی
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                      شاه سلطان حسین؛ هزینه گزاف تعلل در تصمیم‌گیری
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-lg leading-relaxed">
                      روایتی هنری و نمادین از شاهی که «تصمیم نگرفتن» را به امید تقدیر ترجیح داد و پایتختی ۲۰۰ ساله را به نابودی سپرد.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveModal('video')}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-all whitespace-nowrap"
                  >
                    <Video className="h-4 w-4" />
                    <span>تماشای ویدئو</span>
                  </button>
                </div>
              </div>

              {/* Audio Stories List */}
              <div className="mt-5 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  روایت‌های صوتی (پخش درون‌برنامه‌ای با متن کامل):
                </h4>
                {AUDIO_STORIES.map((story) => (
                  <AudioPlayer key={story.key} story={story} volume={settings.volume} />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('stories');
                    handleNavigate('challenge');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <span>ثبت و رفتن به چالش‌های کشف</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-SCREEN: CHALLENGE (چالش کشف و بازخورد) */}
        {/* ============================================================== */}
        {screen === 'challenge' && (
          <div className="flex flex-col gap-5 text-right">
            {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    گام هفتم · تمرین و بازی‌وارسازی
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    چالش کشف دام‌ها ({CHALLENGES[challengeIndex % CHALLENGES.length].type})
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  <Award className="h-4 w-4" />
                  <span>{toPersianDigits(challengeCorrectCount)} پاسخ درست</span>
                </div>
              </div>

              {/* Challenge Body */}
              <div className="mt-5">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                  {CHALLENGES[challengeIndex % CHALLENGES.length].q}
                </p>

                {/* Options List */}
                <div className="mt-5 space-y-2.5">
                  {CHALLENGES[challengeIndex % CHALLENGES.length].opts.map((opt, optIdx) => {
                    const isCorrectOption = optIdx === CHALLENGES[challengeIndex % CHALLENGES.length].ans;
                    const isSelected = selectedChallengeOption === optIdx;

                    let btnStyle = 'border-slate-200/90 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800';
                    if (challengeAnswered) {
                      if (isCorrectOption) {
                        btnStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold';
                      } else if (isSelected) {
                        btnStyle = 'border-rose-500 bg-rose-50/80 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200';
                      } else {
                        btnStyle = 'opacity-40 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={challengeAnswered}
                        onClick={() => handleChallengeAnswer(optIdx)}
                        className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-right text-xs font-semibold transition-all ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {challengeAnswered && isCorrectOption && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        )}
                        {challengeAnswered && isSelected && !isCorrectOption && (
                          <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback Box */}
                {challengeAnswered && (
                  <div
                    className={`mt-4 rounded-2xl p-4 border text-xs leading-relaxed ${
                      selectedChallengeOption === CHALLENGES[challengeIndex % CHALLENGES.length].ans
                        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
                        : 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
                    }`}
                  >
                    <strong className="block font-bold mb-1">
                      {selectedChallengeOption === CHALLENGES[challengeIndex % CHALLENGES.length].ans
                        ? 'آفرین! کاملاً درست است:'
                        : 'این بار نه؛ اما تحلیل منطقی را ببینید:'}
                    </strong>
                    {CHALLENGES[challengeIndex % CHALLENGES.length].why}
                  </div>
                )}
              </div>

              {/* Digital Collectible Cards Progress */}
              <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  کارت‌های دیجیتال شخصیت‌های باز شده:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {Object.keys(PEOPLE).map((pKey) => {
                    const isUnlocked = unlockedArchetypes.includes(pKey);
                    return (
                      <div
                        key={pKey}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${
                          isUnlocked
                            ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 shadow-sm'
                            : 'border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <span>{isUnlocked ? '✓' : '🔒'}</span>
                        <span>{PEOPLE[pKey].name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  بازگشت به مسیر
                </button>

                <div className="flex gap-2">
                  {challengeAnswered ? (
                    <button
                      onClick={handleNextChallenge}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-sm"
                    >
                      <span>چالش بعدی</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      markLearningDone('challenge');
                      showToast('تبریک! تمام بخش‌های مسیر یادگیری را طی کردید.');
                      handleNavigate('home');
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
                  >
                    تکمیل و بازگشت به میز کار
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: LIBRARY (کتابخانه جامع) */}
        {/* ============================================================== */}
        {screen === 'library' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                گنجینه دانش
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                کتابخانه جامع درنگ
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                تمام روایت‌های صوتی، خلاصه‌های کتاب Tune In، درس ویدئویی و تمرین‌ها در این بخش به آسانی قابل جستجو و مطالعه‌اند.
              </p>

              {/* Search input */}
              <div className="relative mt-4">
                <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در موضوعات، روایت‌ها، و پرسش‌ها..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pr-10 pl-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-right"
                />
              </div>

              {/* Filter Tabs */}
              <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'همه منابع' },
                  { id: 'audio', label: 'روایت‌های صوتی' },
                  { id: 'video', label: 'ویدئوی تحلیلی' },
                  { id: 'book', label: 'پرسش‌های کتاب' },
                  { id: 'practice', label: 'چالش‌ها و تمرین' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      playSoundEffect('tap', settings.sound, settings.fxVolume);
                      setLibraryFilter(f.id as any);
                    }}
                    className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      libraryFilter === f.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Library Content Items */}
            <div className="space-y-4">
              {/* Audio Stories */}
              {(libraryFilter === 'all' || libraryFilter === 'audio') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Volume2 className="h-4 w-4 text-blue-600" />
                    <span>روایت‌های صوتی مستند:</span>
                  </div>
                  {AUDIO_STORIES.filter(
                    (s) =>
                      !librarySearch.trim() ||
                      s.title.includes(librarySearch) ||
                      s.desc.includes(librarySearch) ||
                      s.tags.some((t) => t.includes(librarySearch))
                  ).map((story) => (
                    <AudioPlayer key={story.key} story={story} volume={settings.volume} />
                  ))}
                </div>
              )}

              {/* Video Module */}
              {(libraryFilter === 'all' || libraryFilter === 'video') && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-600">ویدئو</span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        شاه سلطان حسین؛ هزینه تعلل در تصمیم‌گیری
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        روایت طنزآمیز و درس‌آموز از پیامدهای ترس از اتخاذ تصمیمات سخت
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveModal('video')}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-sm"
                    >
                      <Video className="h-4 w-4" />
                      <span>تماشا</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Book Q&A Link */}
              {(libraryFilter === 'all' || libraryFilter === 'book') && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600">کتاب Tune In</span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        ۱۵ پرسش بنیادین تصمیم‌گیری از نگاه نوالا والش
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        پاسخ‌های کاربردی به همراه تمرین ۶۰ ثانیه‌ای برای هر پرسش
                      </p>
                    </div>
                    <button
                      onClick={() => handleNavigate('book')}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>مشاهده پرسش‌ها</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: BOOK (پرسش‌های کتاب Tune In) */}
        {/* ============================================================== */}
        {screen === 'book' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                آموزش مفهومی
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                پرسش‌های کتاب Tune In اثر نوالا والش
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                به جای خلاصه کتاب خسته‌کننده، این ۱۵ پرسش کلیدی چکیده عملی و کاربردی مفاهیم کتاب برای تصمیمات روزمره شماست.
              </p>
            </div>

            <div className="space-y-3">
              {BOOK_QA.map((item, idx) => {
                const isOpen = openBookIndex === idx;
                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all"
                  >
                    <button
                      onClick={() => {
                        playSoundEffect('tap', settings.sound, settings.fxVolume);
                        setOpenBookIndex(isOpen ? null : idx);
                      }}
                      className="flex w-full items-center justify-between p-4.5 text-right hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-bold text-xs mt-0.5">
                          {toPersianDigits(idx + 1)}
                        </span>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                            {item.category}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.q}
                          </h4>
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 space-y-3 leading-relaxed">
                        <p className="font-normal">{item.a}</p>

                        <div className="rounded-xl bg-amber-50/80 p-3.5 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60">
                          <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                            تمرین ۶۰ ثانیه‌ای برای تصمیم شما:
                          </span>
                          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                            {item.task}
                          </p>
                        </div>

                        <span className="text-[11px] text-slate-400 block">
                          ارجاع: {item.ref}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: DECISIONS (فهرست پرونده‌های تصمیم) */}
        {/* ============================================================== */}
        {screen === 'decisions' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  بایگانی خصوصی
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  پرونده‌های تصمیم من
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  اطلاعات محرمانه در همین مرورگر ذخیره شده و قابل ویرایش و بازنگری است.
                </p>
              </div>

              <button
                onClick={() => handleNavigate('newDecision')}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all whitespace-nowrap"
              >
                <PlusCircle className="h-4 w-4" />
                <span>تصمیم جدید</span>
              </button>
            </div>

            {decisions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
                <FolderOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  هنوز پرونده‌ای ثبت نکرده‌اید
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  هر زمان تصمیمی مهم (خرید، سرمایه‌گذاری، استخدام یا تغییر استراتژی) در پیش داشتید، با ایجاد یک پرونده آن را در ۲۰ پرسش بسنجید.
                </p>
                <button
                  onClick={() => handleNavigate('newDecision')}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>ساخت نخستین پرونده</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {decisions.map((d) => {
                  const answeredCount = Object.keys(d.answers).length;
                  const percent = Math.round((answeredCount / 20) * 100);

                  return (
                    <div
                      key={d.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-slate-300"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>ثبت: {formatDisplayDate(d.created)}</span>
                          <span>·</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {toPersianDigits(answeredCount)} از {toPersianDigits(20)} پاسخ
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {d.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {d.problem}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveDecisionId(d.id);
                            handleNavigate('report');
                          }}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
                        >
                          <span>مشاهده شناسنامه</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveDecisionId(d.id);
                            setQuestionIndex(0);
                            handleNavigate('question');
                          }}
                          className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                        >
                          <span>{answeredCount === 20 ? 'بازنگری چک‌لیست' : 'ادامه پاسخ‌ها'}</span>
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: NEW DECISION (تعریف تصمیم جدید) */}
        {/* ============================================================== */}
        {screen === 'newDecision' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                گام آغازین
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                تصمیمی که قصد بررسی آن را دارید چیست؟
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                اصل طلایی درنگ: صورت مسئله را بدون گنجاندن راه‌حل محبوب در آن بنویسید تا ذهن برای ارزیابی گزینه‌های رقیب مسدود نشود.
              </p>

              <form onSubmit={handleCreateDecision} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="dTitle" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    عنوان خلاصه تصمیم
                  </label>
                  <input
                    id="dTitle"
                    type="text"
                    required
                    maxLength={80}
                    placeholder="مثلاً: انتخاب شیوه تامین مالی پروژه جدید"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all text-right"
                  />
                </div>

                <div>
                  <label htmlFor="dProblem" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    مسئله را در یک جمله صریح بنویسید
                  </label>
                  <textarea
                    id="dProblem"
                    required
                    rows={3}
                    maxLength={500}
                    placeholder="صورت مسئله را بدون اینکه بگویید «باید فلان کار را بکنیم» شرح دهید..."
                    value={newProblem}
                    onChange={(e) => setNewProblem(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all text-right"
                  />
                </div>

                <div>
                  <label htmlFor="dWhy" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    چرا این تصمیم مهم و سرنوشت‌ساز است؟ <span className="text-slate-400 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    id="dWhy"
                    rows={2}
                    maxLength={400}
                    placeholder="پیامدها، هزینه‌ها، ریسک‌ها یا چرایی حساس بودن موعد تصمیم..."
                    value={newWhy}
                    onChange={(e) => setNewWhy(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all text-right"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleNavigate('home')}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    انصراف
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <span>ایجاد پرونده و ورود به چک‌لیست</span>
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: QUESTION (چک‌لیست ایستگاه‌ها و پرسش‌ها) */}
        {/* ============================================================== */}
        {screen === 'question' && currentDecision && (
          <div className="flex flex-col gap-5 text-right">
            {/* Station Progress Dots Header */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    ایستگاه {toPersianDigits(QUESTIONS[questionIndex].station + 1)} از ۵:
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {STATIONS[QUESTIONS[questionIndex].station].title}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  پرسش {toPersianDigits(questionIndex + 1)} از ۲۰
                </span>
              </div>

              {/* Station Dots Visual */}
              <div className="mt-3 flex items-center gap-1.5">
                {STATIONS.map((_, sIdx) => {
                  const currentStation = QUESTIONS[questionIndex].station;
                  return (
                    <div
                      key={sIdx}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        sIdx < currentStation
                          ? 'bg-emerald-600'
                          : sIdx === currentStation
                          ? 'bg-blue-600'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                {STATIONS[QUESTIONS[questionIndex].station].desc}
              </p>
            </div>

            {/* Question Card */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
              {QUESTIONS[questionIndex].critical && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>پرسش حساس و خط قرمز (عدم پاسخ روشن مانع از اجراست)</span>
                </div>
              )}

              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-relaxed">
                {QUESTIONS[questionIndex].text}
              </h3>

              {/* Question Help / 60s Exercise Toggle */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => {
                    playSoundEffect('tap', settings.sound, settings.fxVolume);
                    setActiveQuestionHint(activeQuestionHint === 'help' ? 'none' : 'help');
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                    activeQuestionHint === 'help'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>این سؤال یعنی چه؟</span>
                </button>

                <button
                  onClick={() => {
                    playSoundEffect('tap', settings.sound, settings.fxVolume);
                    setActiveQuestionHint(activeQuestionHint === 'exercise' ? 'none' : 'exercise');
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                    activeQuestionHint === 'exercise'
                      ? 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>تمرین ۶۰ ثانیه‌ای</span>
                </button>
              </div>

              {/* Hint Box */}
              {activeQuestionHint !== 'none' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 leading-relaxed animate-fadeIn">
                  <strong className="block font-bold text-slate-900 dark:text-white mb-1">
                    {activeQuestionHint === 'help' ? 'شرح و منطق سؤال:' : 'تمرین پیشنهادی:'}
                  </strong>
                  {activeQuestionHint === 'help'
                    ? QUESTIONS[questionIndex].help
                    : QUESTIONS[questionIndex].exercise}
                </div>
              )}

              {/* 3 Answer Choice Buttons */}
              <div>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  وضعیت در تصمیم شما:
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { val: 'yes' as AnswerValue, label: 'بله (انجام شده)', color: 'emerald' },
                    { val: 'no' as AnswerValue, label: 'خیر (انجام نشده)', color: 'rose' },
                    { val: 'unknown' as AnswerValue, label: 'نامشخص / مبهم', color: 'amber' },
                  ].map((choice) => {
                    const currentAnswer = currentDecision.answers[QUESTIONS[questionIndex].id]?.value;
                    const isSelected = currentAnswer === choice.val;

                    let activeClass = 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
                    if (isSelected) {
                      if (choice.val === 'yes') {
                        activeClass = 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 font-extrabold shadow-sm';
                      } else if (choice.val === 'no') {
                        activeClass = 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 font-extrabold shadow-sm';
                      } else {
                        activeClass = 'border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 font-extrabold shadow-sm';
                      }
                    }

                    return (
                      <button
                        key={choice.val}
                        onClick={() => handleAnswerQuestion(choice.val)}
                        className={`min-h-[50px] rounded-xl border p-2 text-center text-xs font-semibold transition-all active:scale-95 ${activeClass}`}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note / Evidence Input */}
              <div>
                <label
                  htmlFor="qNote"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  یادداشت، منبع شواهد یا اقدام لازم <span className="text-slate-400 font-normal">(اختیاری)</span>
                </label>
                <textarea
                  id="qNote"
                  rows={2}
                  value={currentDecision.answers[QUESTIONS[questionIndex].id]?.note || ''}
                  onChange={(e) => handleUpdateNote(e.target.value)}
                  placeholder="چه دلیلی برای این پاسخ دارید؟ چه کاری باید پیش از جلسه بعدی انجام شود؟"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all text-right"
                />
              </div>

              {/* Prev / Next Navigation Controls */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  disabled={questionIndex === 0}
                  onClick={() => {
                    playSoundEffect('tap', settings.sound, settings.fxVolume);
                    setQuestionIndex((prev) => Math.max(0, prev - 1));
                    setActiveQuestionHint('none');
                  }}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none dark:border-slate-700 dark:text-slate-300"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>پرسش قبلی</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavigate('report')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    مشاهده شناسنامه
                  </button>

                  <button
                    onClick={() => {
                      playSoundEffect('tap', settings.sound, settings.fxVolume);
                      if (questionIndex >= QUESTIONS.length - 1) {
                        handleNavigate('report');
                      } else {
                        setQuestionIndex((prev) => prev + 1);
                        setActiveQuestionHint('none');
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                  >
                    <span>{questionIndex === QUESTIONS.length - 1 ? 'مشاهده پرونده' : 'پرسش بعدی'}</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: REPORT (شناسنامه و گزارش تصمیم) */}
        {/* ============================================================== */}
        {screen === 'report' && currentDecision && (
          <div className="flex flex-col gap-5 text-right">
            {/* Header */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    شناسنامه تحلیلی
                  </span>
                  <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {currentDecision.title}
                  </h2>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    صورت مسئله: {currentDecision.problem}
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>چاپ / PDF</span>
                </button>
              </div>

              {/* Tabular Numerals Metrics Strip */}
              {(() => {
                const ans = currentDecision.answers;
                const yesCount = QUESTIONS.filter((q) => ans[q.id]?.value === 'yes').length;
                const noCount = QUESTIONS.filter((q) => ans[q.id]?.value === 'no').length;
                const unkCount = QUESTIONS.filter((q) => ans[q.id]?.value === 'unknown').length;
                const pendingCount = 20 - (yesCount + noCount + unkCount);

                return (
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                      <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {toPersianDigits(yesCount)}
                      </span>
                      <span className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                        روشن و انجام‌شده
                      </span>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                      <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 tabular-nums">
                        {toPersianDigits(noCount)}
                      </span>
                      <span className="block text-[11px] font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                        نیازمند اقدام اصلاحی
                      </span>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                      <span className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                        {toPersianDigits(unkCount)}
                      </span>
                      <span className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                        نامشخص / مبهم
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 tabular-nums">
                        {toPersianDigits(pendingCount)}
                      </span>
                      <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                        پاسخ‌داده‌نشده
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Critical Questions Warning */}
              {(() => {
                const unresolvedCritical = QUESTIONS.filter(
                  (q) => q.critical && currentDecision.answers[q.id]?.value !== 'yes'
                );

                if (unresolvedCritical.length > 0) {
                  return (
                    <div className="mt-5 rounded-2xl border border-rose-300 bg-rose-50/80 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          هشدار بحرانی: {toPersianDigits(unresolvedCritical.length)} پرسش حساس هنوز روشن نیست!
                        </span>
                      </div>
                      <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                        پیش از اجرای این تصمیم، حتماً موارد زیر را تعیین تکلیف کنید:
                      </p>
                      <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-rose-800 dark:text-rose-300">
                        {unresolvedCritical.map((cq) => (
                          <li key={cq.id}>{cq.text}</li>
                        ))}
                      </ul>
                    </div>
                  );
                } else {
                  return (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 font-medium">
                      ✓ تمام پرسش‌های حساس دارای پاسخ روشن هستند. این امر ضریب اطمینان تصمیم را ارتقا می‌دهد.
                    </div>
                  );
                }
              })()}
            </div>

            {/* Open Items Section */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
                موضوعات باز و اقدامات ضروری
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                مواردی که در چک‌لیست با «خیر» یا «نامشخص» علامت زده‌اید:
              </p>

              {(() => {
                const openItems = QUESTIONS.filter((q) => {
                  const val = currentDecision.answers[q.id]?.value;
                  return val === 'no' || val === 'unknown';
                });

                if (openItems.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                      هیچ موضوع باز یا مبهمی ثبت نشده است.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {openItems.map((q) => {
                      const ans = currentDecision.answers[q.id];
                      return (
                        <div
                          key={q.id}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-850"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {q.text}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                ans?.value === 'no'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {ans?.value === 'no' ? 'خیر' : 'نامشخص'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                            <strong>اقدام پیشنهادی: </strong>
                            {ans?.note || q.exercise}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Review Date and Stop Signal Formulation */}
              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 space-y-4">
                <div>
                  <label htmlFor="revDate" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    موعد بازنگری نهایی تصمیم
                  </label>
                  <input
                    id="revDate"
                    type="date"
                    value={currentDecision.reviewDate || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDecisions((prev) =>
                        prev.map((d) => (d.id === currentDecision.id ? { ...d, reviewDate: val } : d))
                      );
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-right"
                  />
                </div>

                <div>
                  <label htmlFor="stopSig" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    علامت توقف اضطراری یا بازنگری (Circuit Breaker)
                  </label>
                  <textarea
                    id="stopSig"
                    rows={2}
                    value={currentDecision.stopSignal || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDecisions((prev) =>
                        prev.map((d) => (d.id === currentDecision.id ? { ...d, stopSignal: val } : d))
                      );
                    }}
                    placeholder="در صورت مشاهده چه نشانه‌ای، اجرای این تصمیم باید بی‌درنگ متوقف و بازنگری شود؟"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all text-right"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => handleNavigate('question')}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  بازگشت به سؤالات
                </button>

                <button
                  onClick={() => {
                    showToast('پرونده با موفقیت ذخیره شد.');
                    handleNavigate('decisions');
                  }}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  تأیید و ذخیره پرونده
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav
        currentScreen={screen}
        onNavigate={handleNavigate}
        decisionCount={decisions.length}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900/95 px-4 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-md dark:bg-slate-100 dark:text-slate-900 animate-slideUp text-center"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}

      {/* Global Modals */}
      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          profile={profile}
          onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
          onUpdateProfile={(newProfile) => setProfile(newProfile)}
          onClose={() => setActiveModal('none')}
          onOpenTour={() => setActiveModal('tour')}
          onBackup={handleBackupDownload}
          onRestore={handleRestoreFile}
          onClearData={handleClearAllData}
        />
      )}

      {activeModal === 'tour' && <TourModal onClose={() => setActiveModal('none')} />}

      {activeModal === 'help' && (
        <HelpModal
          screen={screen}
          onClose={() => setActiveModal('none')}
          onOpenTour={() => setActiveModal('tour')}
        />
      )}

      {activeModal === 'video' && <VideoPlayerModal onClose={() => setActiveModal('none')} />}
    </div>
  );
}
