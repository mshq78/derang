import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PlusCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Compass,
  BookOpen,
  Volume2,
  Video,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Award,
  Printer,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';

import {
  Screen,
  AnswerValue,
  DecisionRecord,
  UserProfile,
  AppSettings,
  LibraryFilter,
  ArchetypeDef,
} from './types';
import {
  Station,
  Question,
  Perimeter,
  Skill,
  SonicTool,
  Person,
  AudioStory,
  VideoItem,
  BookQA,
  Challenge,
} from './types/content';
import {
  toPersianDigits,
  formatDisplayDate,
  formatDuration,
  truncate,
  normalizePersianText,
} from './utils/helpers';
import {
  isoToJalali,
  jalaliToIso,
  JALALI_MONTH_NAMES,
  getCurrentJalaliDate,
} from './utils/jalali';
import { playSoundEffect } from './utils/audioEffects';
import { ContentProvider, useContent } from './context/ContentContext';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { ArchetypeCard } from './components/ArchetypeCard';
import { AudioPlayer } from './components/AudioPlayer';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { SettingsModal } from './components/SettingsModal';
import { TourModal } from './components/TourModal';
import { HelpModal } from './components/HelpModal';
import { Confetti } from './components/Confetti';
import { EditDecisionModal } from './components/EditDecisionModal';

const STORAGE_KEY = 'gera_dorang_unified_v2';

const DEFAULT_SETTINGS: AppSettings = {
  font: 1,
  volume: 0.85,
  fxVolume: 0.8,
  sound: true,
  motion: true,
  highContrast: false,
  theme: 'light',
};

function DerangApp() {
  const { content } = useContent();

  // Dynamic content mapping - published items only, sorted by sortOrder
  const STATIONS = useMemo(() => {
    return [...content.stations]
      .filter((s: Station) => s.isPublished)
      .sort((a: Station, b: Station) => a.sortOrder - b.sortOrder);
  }, [content.stations]);

  const QUESTIONS = useMemo(() => {
    const pubStations = [...content.stations]
      .filter((s: Station) => s.isPublished)
      .sort((a: Station, b: Station) => a.sortOrder - b.sortOrder);
    const stationIndexMap = new Map<string, number>(pubStations.map((s, i) => [s.id, i]));

    const pubQuestions = [...content.questions]
      .filter((q: Question) => q.isPublished && stationIndexMap.has(q.stationId));

    pubQuestions.sort((a, b) => {
      const stA = stationIndexMap.get(a.stationId)!;
      const stB = stationIndexMap.get(b.stationId)!;
      if (stA !== stB) {
        return stA - stB;
      }
      return a.sortOrder - b.sortOrder;
    });

    return pubQuestions.map((q: Question) => ({
      id: q.id,
      station: stationIndexMap.get(q.stationId)!,
      stationId: q.stationId,
      text: q.text,
      help: q.help,
      exercise: q.exercise,
      critical: q.critical,
      sortOrder: q.sortOrder,
    }));
  }, [content.questions, content.stations]);

  const PERIMETERS = useMemo(() => {
    return [...content.perimeters]
      .filter((p: Perimeter) => p.isPublished)
      .sort((a: Perimeter, b: Perimeter) => a.sortOrder - b.sortOrder);
  }, [content.perimeters]);

  const SKILLS = useMemo(() => {
    return [...content.skills]
      .filter((s: Skill) => s.isPublished)
      .sort((a: Skill, b: Skill) => a.sortOrder - b.sortOrder);
  }, [content.skills]);

  const SONIC = useMemo(() => {
    return [...content.sonic]
      .filter((s: SonicTool) => s.isPublished)
      .sort((a: SonicTool, b: SonicTool) => a.sortOrder - b.sortOrder);
  }, [content.sonic]);

  const PEOPLE = useMemo(() => {
    const pubPeople = [...content.people]
      .filter((p: Person) => p.isPublished)
      .sort((a: Person, b: Person) => a.sortOrder - b.sortOrder);
    const res: Record<string, ArchetypeDef> = {};
    pubPeople.forEach((p: Person) => {
      res[p.id] = {
        id: p.id,
        name: p.name,
        title: p.title,
        strength: p.strength,
        shadow: p.shadow,
        reflectionQuestion: p.reflectionQuestion,
        quote: p.quote,
        color: `${p.colorBg} ${p.colorPrimary}`,
        avatarSeed: p.id,
        imageUrl: p.imageUrl,
      };
    });
    return res;
  }, [content.people]);

  const AUDIO_STORIES = useMemo(() => {
    const pubAudio = [...content.audioStories]
      .filter((a: AudioStory) => a.isPublished)
      .sort((a: AudioStory, b: AudioStory) => a.sortOrder - b.sortOrder);
    return pubAudio.map((a: AudioStory) => ({
      key: a.id,
      id: a.id,
      title: a.title,
      subtitle: a.subtitle,
      dur: toPersianDigits(formatDuration(a.durationSeconds)),
      seconds: a.durationSeconds,
      tags: a.tags,
      desc: a.desc,
      transcript: a.transcript,
      takeaway: a.takeaway,
      audioUrl: a.audioUrl,
      coverUrl: a.coverUrl,
      sortOrder: a.sortOrder,
    }));
  }, [content.audioStories]);

  const VIDEOS = useMemo(() => {
    return [...content.videos]
      .filter((v: VideoItem) => v.isPublished)
      .sort((a: VideoItem, b: VideoItem) => a.sortOrder - b.sortOrder);
  }, [content.videos]);

  const STORIES_VIDEOS = useMemo(() => {
    return VIDEOS.filter((v: VideoItem) => v.showOnStories);
  }, [VIDEOS]);

  const BOOK_QA = useMemo(() => {
    return [...content.bookQA]
      .filter((b: BookQA) => b.isPublished)
      .sort((a: BookQA, b: BookQA) => a.sortOrder - b.sortOrder);
  }, [content.bookQA]);

  const CHALLENGES = useMemo(() => {
    return [...content.challenges]
      .filter((c: Challenge) => c.isPublished)
      .sort((a: Challenge, b: Challenge) => a.sortOrder - b.sortOrder);
  }, [content.challenges]);

  const LEARNING_STEPS = useMemo(() => {
    return [...content.learningSteps]
      .filter((l) => l.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({
        id: l.id,
        title: l.title,
        desc: l.desc,
        screen: l.screen as Screen,
      }));
  }, [content.learningSteps]);
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) return parsed.profile;
      }
    } catch {
      // ignore
    }
    return { first: '', last: '' };
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.settings) return { ...DEFAULT_SETTINGS, ...parsed.settings, theme: parsed.settings.theme || 'light' };
      }
    } catch {
      // ignore
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
      // ignore
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
      // ignore
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
      // ignore
    }
    return [];
  });

  const [unlockedArchetypes, setUnlockedArchetypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.unlockedArchetypes) && parsed.unlockedArchetypes.length > 0) {
          return parsed.unlockedArchetypes;
        }
      }
    } catch {
      // ignore
    }
    return ['davinci'];
  });

  const [challengeCorrectCount, setChallengeCorrectCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.challengeCorrectCount === 'number') return parsed.challengeCorrectCount;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const [answeredChallenges, setAnsweredChallenges] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.answeredChallenges)) return parsed.answeredChallenges;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [screen, setScreen] = useState<Screen>('home');
  // Name shown on the farewell screen; the profile itself is cleared on exit.
  const [farewellName, setFarewellName] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [activeArchetype, setActiveArchetype] = useState('davinci');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [openBookIndex, setOpenBookIndex] = useState<number | null>(null);

  // Challenge State
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeAnswered, setChallengeAnswered] = useState(false);
  const [selectedChallengeOption, setSelectedChallengeOption] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Modals & Feedback
  const [activeModal, setActiveModal] = useState<'none' | 'help' | 'settings' | 'tour' | 'video'>('none');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [editingDecision, setEditingDecision] = useState<DecisionRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeVideo = useMemo(() => {
    if (!activeVideoId) return VIDEOS[0] || null;
    return VIDEOS.find((v) => v.id === activeVideoId) || VIDEOS[0] || null;
  }, [VIDEOS, activeVideoId]);

  // New Decision Form State
  const [newTitle, setNewTitle] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [activeQuestionHint, setActiveQuestionHint] = useState<'none' | 'help' | 'exercise'>('none');

  // Persistence effect
  useEffect(() => {
    try {
      const payload = {
        profile,
        settings,
        decisions,
        activeDecisionId,
        learningDone,
        unlockedArchetypes,
        challengeCorrectCount,
        answeredChallenges,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable
    }
  }, [
    profile,
    settings,
    decisions,
    activeDecisionId,
    learningDone,
    unlockedArchetypes,
    challengeCorrectCount,
    answeredChallenges,
  ]);

  // Apply theme & font settings
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(settings.font));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    if (!settings.motion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings.font, settings.theme, settings.highContrast, settings.motion]);

  // Clean toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
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

  const nextLearningStep = useMemo(() => {
    if (LEARNING_STEPS.length === 0) return null;
    return LEARNING_STEPS.find((s) => !learningDone.includes(s.id)) || LEARNING_STEPS[LEARNING_STEPS.length - 1];
  }, [LEARNING_STEPS, learningDone]);

  // Count answered questions (only yes, no, unknown)
  const getAnsweredCount = (d: DecisionRecord) => {
    return Object.values(d.answers || {}).filter(
      (a) => a.value === 'yes' || a.value === 'no' || a.value === 'unknown'
    ).length;
  };

  const getFirstUnansweredIndex = (d: DecisionRecord) => {
    if (QUESTIONS.length === 0) return 0;
    const idx = QUESTIONS.findIndex(
      (q) => !d.answers[q.id] || !d.answers[q.id].value
    );
    return idx === -1 ? 0 : idx;
  };

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

  const handleSaveEditedDecision = (id: string, title: string, problem: string, why?: string) => {
    setDecisions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title, problem, why } : d))
    );
    showToast('پرونده با موفقیت ویرایش شد.');
  };

  const handleDeleteDecision = (id: string) => {
    if (window.confirm('این پرونده برای همیشه حذف شود؟')) {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      if (activeDecisionId === id) {
        setActiveDecisionId(null);
      }
      showToast('پرونده حذف شد.');
    }
  };

  const handleAnswerQuestion = (val: AnswerValue) => {
    if (!activeDecisionId || !QUESTIONS[questionIndex]) return;
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

  const handleUpdateNote = (noteText: string) => {
    if (!activeDecisionId || !QUESTIONS[questionIndex]) return;
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

  const handleChallengeAnswer = (optionIdx: number) => {
    if (challengeAnswered || CHALLENGES.length === 0) return;
    const currentChallenge = CHALLENGES[challengeIndex % CHALLENGES.length];
    if (!currentChallenge) return;
    const isCorrect = optionIdx === currentChallenge.ans;
    const challengeKey = String(challengeIndex);

    setSelectedChallengeOption(optionIdx);
    setChallengeAnswered(true);

    if (isCorrect) {
      playSoundEffect('win', settings.sound, settings.fxVolume);
      if (settings.motion) {
        setShowConfetti(true);
      }

      // Only award points on the first correct answer
      if (!answeredChallenges.includes(challengeKey)) {
        setAnsweredChallenges((prev) => [...prev, challengeKey]);
        const newCount = challengeCorrectCount + 1;
        setChallengeCorrectCount(newCount);

        // Unlock logic: 1 card per 2 correct answers using Object.keys(PEOPLE)
        const peopleKeys = Object.keys(PEOPLE);
        const unlockedCount = 1 + Math.floor(newCount / 2);
        const newUnlocked = peopleKeys.slice(0, Math.min(peopleKeys.length, unlockedCount));

        if (newUnlocked.length > unlockedArchetypes.length) {
          setUnlockedArchetypes(newUnlocked);
          const newlyUnlockedKey = newUnlocked[newUnlocked.length - 1];
          setTimeout(() => {
            showToast(`کارت شخصیت «${PEOPLE[newlyUnlockedKey]?.name}» در مجموعه شما باز شد!`);
          }, 600);
        }
      }
    } else {
      playSoundEffect('wrong', settings.sound, settings.fxVolume);
    }
  };

  const handleNextChallenge = () => {
    if (CHALLENGES.length === 0) return;
    playSoundEffect('tap', settings.sound, settings.fxVolume);
    setChallengeIndex((prev) => (prev + 1) % CHALLENGES.length);
    setChallengeAnswered(false);
    setSelectedChallengeOption(null);
  };

  const handleBackupDownload = () => {
    const data = {
      version: 2,
      exportDate: new Date().toISOString(),
      decisions,
      learningDone,
      unlockedArchetypes,
      challengeCorrectCount,
      answeredChallenges,
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

      let restoredCount = 0;
      let ignoredCount = 0;

      if (Array.isArray(parsed.decisions)) {
        const validDecisions: DecisionRecord[] = [];
        parsed.decisions.forEach((item: unknown) => {
          if (
            item &&
            typeof item === 'object' &&
            'id' in item &&
            'title' in item &&
            'problem' in item &&
            'created' in item &&
            'answers' in item &&
            typeof (item as DecisionRecord).id === 'string' &&
            typeof (item as DecisionRecord).title === 'string' &&
            typeof (item as DecisionRecord).problem === 'string' &&
            typeof (item as DecisionRecord).created === 'string' &&
            typeof (item as DecisionRecord).answers === 'object' &&
            (item as DecisionRecord).answers !== null
          ) {
            validDecisions.push(item as DecisionRecord);
            restoredCount++;
          } else {
            ignoredCount++;
          }
        });

        setDecisions((prev) => {
          const existingIds = new Set(prev.map((d) => d.id));
          const newOnes = validDecisions.filter((d) => !existingIds.has(d.id));
          return [...prev, ...newOnes];
        });
      }

      if (Array.isArray(parsed.learningDone)) {
        setLearningDone((prev) => [...new Set([...prev, ...parsed.learningDone])]);
      }
      if (Array.isArray(parsed.unlockedArchetypes) && parsed.unlockedArchetypes.length > 0) {
        setUnlockedArchetypes((prev) => [...new Set([...prev, ...parsed.unlockedArchetypes])]);
      }
      if (typeof parsed.challengeCorrectCount === 'number') {
        setChallengeCorrectCount(parsed.challengeCorrectCount);
      }
      if (Array.isArray(parsed.answeredChallenges)) {
        setAnsweredChallenges((prev) => [...new Set([...prev, ...parsed.answeredChallenges])]);
      }

      showToast(
        `${toPersianDigits(restoredCount)} پرونده بازیابی شد، ${toPersianDigits(ignoredCount)} مورد نامعتبر نادیده گرفته شد.`
      );
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
      setChallengeCorrectCount(0);
      setAnsweredChallenges([]);
      setQuestionIndex(0);
      setScreen('home');
      setActiveModal('none');
      showToast('تمام اطلاعات پاک‌سازی شد.');
    }
  };

  // Search filter query normalized
  const normalizedQuery = normalizePersianText(librarySearch);

  const filteredAudio = useMemo(() => {
    return AUDIO_STORIES.filter((s) => {
      if (!normalizedQuery) return true;
      return (
        normalizePersianText(s.title).includes(normalizedQuery) ||
        normalizePersianText(s.desc).includes(normalizedQuery) ||
        s.tags.some((t) => normalizePersianText(t).includes(normalizedQuery))
      );
    });
  }, [AUDIO_STORIES, normalizedQuery]);

  const filteredVideos = useMemo(() => {
    return VIDEOS.filter((v) => {
      if (!normalizedQuery) return true;
      return (
        normalizePersianText(v.title).includes(normalizedQuery) ||
        normalizePersianText(v.desc).includes(normalizedQuery) ||
        normalizePersianText(v.badge).includes(normalizedQuery) ||
        (v.quote && normalizePersianText(v.quote).includes(normalizedQuery))
      );
    });
  }, [VIDEOS, normalizedQuery]);

  const filteredBookQA = useMemo(() => {
    return BOOK_QA.filter((b) => {
      if (!normalizedQuery) return true;
      return (
        normalizePersianText(b.q).includes(normalizedQuery) ||
        normalizePersianText(b.a).includes(normalizedQuery) ||
        normalizePersianText(b.category).includes(normalizedQuery)
      );
    });
  }, [BOOK_QA, normalizedQuery]);

  const filteredChallenges = useMemo(() => {
    return CHALLENGES.filter((c) => {
      if (!normalizedQuery) return true;
      return (
        normalizePersianText(c.q).includes(normalizedQuery) ||
        normalizePersianText(c.type).includes(normalizedQuery)
      );
    });
  }, [CHALLENGES, normalizedQuery]);

  const hasAnyLibraryResults =
    filteredAudio.length > 0 ||
    filteredVideos.length > 0 ||
    filteredBookQA.length > 0 ||
    filteredChallenges.length > 0;

  // Farewell View
  if (screen === 'farewell') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-right">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-success-soft text-success font-bold text-2xl mb-4 border border-success/20">
            ✓
          </div>
          <h2 className="text-xl font-bold text-ink">
            {farewellName ? `${farewellName} عزیز، ` : ''}سپاس از درنگ هوشیارانه امروز شما
          </h2>
          <p className="mt-2 text-sm text-ink-2 leading-relaxed">
            {content.site.farewellText}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => {
                setFarewellName('');
                handleNavigate('home');
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-surface shadow-sm hover:bg-primary-hover transition-all"
            >
              ورود دوباره
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Onboarding View
  if (!profile.first) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-right">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-surface font-black text-2xl shadow-sm mb-3">
              {content.site.brandName.charAt(0) || 'د'}
            </div>
            <span className="text-[13px] font-bold text-primary mb-1">
              {content.site.orgName}
            </span>
            <h1 className="text-2xl font-extrabold text-ink tracking-tight">
              {content.site.onboardingTitle}
            </h1>
            <p className="mt-2 text-sm text-ink-2 leading-relaxed max-w-sm">
              {content.site.onboardingSubtitle}
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="first" className="block text-xs font-bold text-ink mb-1.5">
                نام شما
              </label>
              <input
                id="first"
                name="first"
                type="text"
                required
                maxLength={40}
                placeholder="مثلاً: مریم یا آرش"
                className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            <div>
              <label htmlFor="last" className="block text-xs font-bold text-ink mb-1.5">
                نام خانوادگی <span className="text-ink-3 font-normal">(اختیاری)</span>
              </label>
              <input
                id="last"
                name="last"
                type="text"
                maxLength={50}
                placeholder="مثلاً: نیک‌بخت"
                className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-surface shadow-sm hover:bg-primary-hover active:scale-[0.99] transition-all"
              >
                <span>شروع تجربه {content.site.brandName}</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-3">
            اطلاعات شما به طور محرمانه در همین دستگاه باقی می‌ماند.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink pb-24 transition-colors">
      <TopBar
        currentScreen={screen}
        onNavigate={handleNavigate}
        onOpenHelp={() => setActiveModal('help')}
        onOpenSettings={() => setActiveModal('settings')}
        onExit={() => {
          playSoundEffect('exit', settings.sound, settings.fxVolume);
          setFarewellName(profile.first);
          setActiveModal('none');
          setProfile({ first: '', last: '' });
          setScreen('farewell');
        }}
        brandName={content.site.brandName}
        orgName={content.site.orgName}
        tagline={content.site.tagline}
      />

      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
        {/* ============================================================== */}
        {/* SCREEN: HOME (میز کار) */}
        {/* ============================================================== */}
        {screen === 'home' && (
          <div className="flex flex-col gap-5 text-right">
            {/* Hero Card */}
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-primary mb-2">
                  <span>{content.site.heroKicker}</span>
                  <span aria-hidden="true">·</span>
                  <span>{profile.first} عزیز، خوش آمدید</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight">
                  {content.site.heroTitle}
                </h1>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed font-normal">
                  {content.site.heroSubtitle}
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => handleNavigate('newDecision')}
                    className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-surface shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>بررسی تصمیم جدید</span>
                  </button>

                  {currentDecision && (
                    <button
                      onClick={() => {
                        setQuestionIndex(getFirstUnansweredIndex(currentDecision));
                        handleNavigate('question');
                      }}
                      className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs font-bold text-ink hover:bg-line transition-colors shadow-sm"
                    >
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span>ادامه تصمیم «{truncate(currentDecision.title, 22)}»</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveModal('tour')}
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-3 text-xs font-bold text-ink-2 hover:bg-surface-2 transition-colors"
                  >
                    <Compass className="h-4 w-4" />
                    <span>تور آموزشی</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick 2-Column: Learning Next Step + Discovery Quiz */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Learning Next Step Card */}
              <div className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 shadow-sm">
                {LEARNING_STEPS.length === 0 || !nextLearningStep ? (
                  <div className="p-4 text-center text-sm text-ink-3">
                    هنوز محتوایی برای این بخش منتشر نشده است.
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <span className="text-xs font-bold text-warning-ink">
                          گام بعدی یادگیری
                        </span>
                        <span className="text-[13px] font-semibold text-ink-3 tabular-nums">
                          {toPersianDigits(learningDone.length)} از {toPersianDigits(LEARNING_STEPS.length)} ایستگاه
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-ink">
                        {nextLearningStep.title}
                      </h3>
                      <p className="mt-1 text-sm text-ink-2 leading-relaxed">
                        با گذراندن این بخش، خطاهای قضاوت را بهتر تشخیص داده و چک‌لیست تصمیم را با تسلط بیشتری به کار می‌گیرید.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1">
                        {LEARNING_STEPS.map((_, idx) => (
                          <span
                            key={idx}
                            className={`h-2 rounded-full transition-all ${
                              idx < learningDone.length ? 'w-4 bg-primary' : 'w-2 bg-line-strong'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => handleNavigate(nextLearningStep.screen)}
                        className="flex items-center gap-1 rounded-xl bg-surface-2 px-3.5 py-2 text-xs font-bold text-ink hover:bg-line transition-colors"
                      >
                        <span>ادامه مسیر</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 2-Minute Discovery Challenge Card */}
              <div className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 shadow-sm">
                {CHALLENGES.length === 0 ? (
                  <div className="p-4 text-center text-sm text-ink-3">
                    هنوز محتوایی برای این بخش منتشر نشده است.
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <span className="text-xs font-bold text-accent">
                          کشف ۲ دقیقه‌ای
                        </span>
                        <span className="text-[13px] font-bold text-success tabular-nums">
                          {toPersianDigits(challengeCorrectCount)} امتیاز درست
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-ink">
                        چالش کشف دام‌ها و ابزارهای مکث
                      </h3>
                      <p className="mt-1 text-sm text-ink-2 leading-relaxed">
                        یک سناریوی تصمیم‌گیری واقعی را بسنجید، بازخورد منطقی بگیرید و کارت‌های شخصیت را باز کنید.
                      </p>
                    </div>

                    {/* Collectible Cards Strip */}
                    <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {Object.keys(PEOPLE).map((pKey) => {
                        const isUnlocked = unlockedArchetypes.includes(pKey);
                        return (
                          <span
                            key={pKey}
                            className={`flex h-8 px-2.5 items-center justify-center rounded-lg text-[13px] font-bold transition-all ${
                              isUnlocked
                                ? 'bg-primary-soft text-primary-ink border border-primary/20'
                                : 'bg-surface-2 text-ink-3 border border-dashed border-line-strong'
                            }`}
                          >
                            {isUnlocked ? PEOPLE[pKey]?.name?.split(' ')[0] : '🔒'}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleNavigate('challenge')}
                        className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-surface hover:opacity-90 shadow-sm transition-all"
                      >
                        <span>ورود به چالش</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Spotlight on Library */}
            <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="text-base font-bold text-ink">
                    کتابخانه و منابع همراه
                  </h3>
                  <span className="text-[13px] text-ink-3">
                    روایت‌های عبرت‌آموز صوتی، پاسخ‌های کتاب Tune In، و الگوهای تصمیم
                  </span>
                </div>
                <button
                  onClick={() => handleNavigate('library')}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1"
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
                  className="flex flex-col items-start p-4 rounded-2xl bg-surface-2 hover:bg-line border border-line transition-colors text-right"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-ink mb-2">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-ink">
                    {toPersianDigits(AUDIO_STORIES.length)} روایت صوتی
                  </span>
                  <span className="text-[13px] text-ink-3 mt-0.5">
                    اصفهان، تایتان، ترابانت و پالو آلتو
                  </span>
                </button>

                <button
                  onClick={() => handleNavigate('book')}
                  className="flex flex-col items-start p-4 rounded-2xl bg-surface-2 hover:bg-line border border-line transition-colors text-right"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-soft text-warning-ink mb-2">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-ink">
                    {toPersianDigits(BOOK_QA.length)} پرسش کتاب Tune In
                  </span>
                  <span className="text-[13px] text-ink-3 mt-0.5">
                    همراه تمرین‌های ۶۰ ثانیه‌ای
                  </span>
                </button>

                <button
                  onClick={() => handleNavigate('people')}
                  className="flex flex-col items-start p-4 rounded-2xl bg-surface-2 hover:bg-line border border-line transition-colors text-right"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-ink mb-2">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-ink">
                    {toPersianDigits(Object.keys(PEOPLE).length)} الگوی تصمیم
                  </span>
                  <span className="text-[13px] text-ink-3 mt-0.5">
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
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
              <span className="text-xs font-bold text-primary">
                {content.site.pageIntros.learning.kicker}
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                {content.site.pageIntros.learning.title}
              </h2>
              <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                {content.site.pageIntros.learning.desc}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-xs font-bold text-ink-2">
                  میزان پیشرفت کلی: {LEARNING_STEPS.length > 0 ? toPersianDigits(Math.round((learningDone.length / LEARNING_STEPS.length) * 100)) : 0}٪
                </span>
                <button
                  onClick={() => {
                    if (window.confirm('پیشرفت مسیر یادگیری صفر شود؟')) {
                      setLearningDone([]);
                      showToast('مسیر یادگیری بازنشانی شد.');
                    }
                  }}
                  className="text-[13px] font-semibold text-ink-3 hover:text-ink transition-colors"
                >
                  مرور مجدد از آغاز
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {LEARNING_STEPS.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-3">
                  هنوز محتوایی برای این بخش منتشر نشده است.
                </div>
              ) : (
                LEARNING_STEPS.map((step, idx) => {
                  const isDone = learningDone.includes(step.id);
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center justify-between rounded-2xl border p-4.5 transition-all ${
                        isDone
                          ? 'border-success/30 bg-success-soft/30'
                          : 'border-line bg-surface hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            isDone
                              ? 'bg-success text-surface'
                              : 'bg-surface-2 text-ink-2'
                          }`}
                        >
                          {isDone ? '✓' : toPersianDigits(idx + 1)}
                        </div>
                        <div className="text-right">
                          <h4 className="text-sm font-bold text-ink">
                            {step.title}
                          </h4>
                          <p className="text-xs text-ink-3 mt-0.5 line-clamp-1">
                            {step.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleNavigate(step.screen)}
                        className={`flex-shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                          isDone
                            ? 'border border-line bg-surface text-ink hover:bg-surface-2'
                            : 'bg-primary text-surface hover:bg-primary-hover shadow-sm'
                        }`}
                      >
                        {isDone ? 'مرور' : 'شروع'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SUB-SCREENS: why, perimeters, skills, sonic, people, stories, challenge, book */}
        {screen === 'why' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-primary">
                  {content.site.pageIntros.why.kicker}
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                  {content.site.pageIntros.why.title}
                </h2>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                  {content.site.whyPage.intro}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {content.site.whyPage.spots.map((spot, sIdx) => {
                  const toneColor =
                    spot.tone === 'danger'
                      ? 'text-danger'
                      : spot.tone === 'warning'
                      ? 'text-warning'
                      : 'text-primary';
                  return (
                    <div key={sIdx} className="rounded-2xl border border-line bg-surface-2 p-4">
                      <span className={`text-xs font-bold block mb-1 ${toneColor}`}>
                        {spot.title}
                      </span>
                      <p className="text-sm text-ink-2 leading-relaxed">
                        {spot.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-primary-soft p-4 border border-primary/20">
                <span className="text-xs font-bold text-primary-ink block mb-1">
                  {content.site.whyPage.goalTitle}
                </span>
                <p className="text-sm text-primary-ink leading-relaxed font-medium">
                  {content.site.whyPage.goalText}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-line pt-4">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-bold text-ink-2 hover:text-ink"
                >
                  بازگشت به فهرست مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('why');
                    handleNavigate('perimeters');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                >
                  <span>ثبت و رفتن به مدل PERIMETERS</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'perimeters' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-primary">
                  {content.site.pageIntros.perimeters.kicker}
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                  {content.site.pageIntros.perimeters.title}
                </h2>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                  {content.site.pageIntros.perimeters.desc}
                </p>
              </div>

              {PERIMETERS.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-3">
                  هنوز محتوایی برای این بخش منتشر نشده است.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PERIMETERS.map((p, idx) => (
                    <div
                      key={p.en}
                      className="flex flex-col justify-between rounded-2xl border border-line bg-surface-2 p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-line pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-surface font-mono text-xs font-bold">
                              {p.tag}
                            </span>
                            <span className="text-sm font-bold text-ink">
                              {p.fa} ({p.en})
                            </span>
                          </div>
                          <span className="text-[13px] font-semibold text-ink-3">
                            دام {toPersianDigits(idx + 1)} از ۱۰
                          </span>
                        </div>
                        <p className="mt-2.5 text-sm text-ink-2 leading-relaxed">
                          {p.desc}
                        </p>
                      </div>

                      <div className="mt-3.5 space-y-2 border-t border-line pt-2.5">
                        <div className="rounded-xl bg-warning-soft p-2.5 border border-warning/20">
                          <span className="text-[13px] font-bold text-warning-ink block mb-0.5">
                            پرسش درنگ:
                          </span>
                          <p className="text-[13px] text-warning-ink leading-relaxed font-medium">
                            {p.question}
                          </p>
                        </div>
                        <div className="text-[13px] text-ink-3">
                          <strong className="text-ink">راهکار پادزهر: </strong>
                          {p.solution}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-line pt-4">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-bold text-ink-2 hover:text-ink"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('perimeters');
                    handleNavigate('skills');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                >
                  <span>ثبت و رفتن به شایستگی‌ها</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'skills' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-primary">
                  {content.site.pageIntros.skills.kicker}
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                  {content.site.pageIntros.skills.title}
                </h2>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                  {content.site.pageIntros.skills.desc}
                </p>
              </div>

              {SKILLS.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-3">
                  هنوز محتوایی برای این بخش منتشر نشده است.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {SKILLS.map((skill, idx) => (
                    <div
                      key={skill.name}
                      className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4"
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-ink font-bold text-xs mt-0.5">
                        {toPersianDigits(idx + 1)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-ink">
                          {skill.name}
                        </h4>
                        <p className="mt-1 text-sm text-ink-2 leading-relaxed">
                          {skill.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-line pt-4">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-bold text-ink-2 hover:text-ink"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('skills');
                    handleNavigate('sonic');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                >
                  <span>ثبت و رفتن به ابزارهای SONIC</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'sonic' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-primary">
                  {content.site.pageIntros.sonic.kicker}
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                  {content.site.pageIntros.sonic.title}
                </h2>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                  {content.site.pageIntros.sonic.desc}
                </p>
              </div>

              {SONIC.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-3">
                  هنوز محتوایی برای این بخش منتشر نشده است.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {SONIC.map((tool) => (
                    <div
                      key={tool.letter}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 p-4"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-surface font-black text-lg">
                          {tool.letter}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-ink">
                              {tool.fa}
                            </h4>
                            <span className="text-xs font-mono text-ink-3">
                              ({tool.en})
                            </span>
                          </div>
                          <span className="text-xs font-bold text-primary block mt-0.5">
                            ابزار کلیدی: {tool.tool}
                          </span>
                          <p className="mt-1 text-sm text-ink-2 leading-relaxed">
                            {tool.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-line pt-4">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-bold text-ink-2 hover:text-ink"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('sonic');
                    handleNavigate('people');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                >
                  <span>ثبت و رفتن به الگوهای شخصیت</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'people' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-primary">
                  {content.site.pageIntros.people.kicker}
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                  {content.site.pageIntros.people.title}
                </h2>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                  {content.site.pageIntros.people.desc}
                </p>
              </div>

              {Object.keys(PEOPLE).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-3">
                  هنوز محتوایی برای این بخش منتشر نشده است.
                </div>
              ) : (
                <>
                  <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
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
                              ? 'bg-primary text-surface shadow-sm'
                              : 'bg-surface-2 text-ink-2 hover:bg-line'
                          }`}
                        >
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <ArchetypeCard
                    archetype={PEOPLE[activeArchetype] || Object.values(PEOPLE)[0]}
                    externalTestUrl={content.site.externalTestUrl}
                    externalTestTitle={content.site.externalTestTitle}
                    externalTestSubtitle={content.site.externalTestSubtitle}
                    externalTestButton={content.site.externalTestButton}
                  />
                </>
              )}

              <div className="flex items-center justify-between border-t border-line pt-4">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-bold text-ink-2 hover:text-ink"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('people');
                    handleNavigate('stories');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                >
                  <span>ثبت و رفتن به روایت‌ها</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'stories' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-primary">
                  {content.site.pageIntros.stories.kicker}
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                  {content.site.pageIntros.stories.title}
                </h2>
                <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                  {content.site.pageIntros.stories.desc}
                </p>
              </div>

              {STORIES_VIDEOS.map((video) => (
                <div key={video.id} className="rounded-2xl border border-line bg-surface-2 p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[13px] font-bold text-warning">
                        {video.badge}
                      </span>
                      <h3 className="text-base font-bold text-ink mt-0.5">
                        {video.title}
                      </h3>
                      <p className="text-sm text-ink-2 mt-1 max-w-lg leading-relaxed">
                        {video.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveVideoId(video.id);
                        setActiveModal('video');
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-warning px-4 py-2.5 text-xs font-bold text-surface shadow-sm hover:opacity-90 transition-all whitespace-nowrap"
                    >
                      <Video className="h-4 w-4" />
                      <span>تماشای ویدئو</span>
                    </button>
                  </div>
                </div>
              ))}

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-ink">
                  روایت‌های صوتی (پخش درون‌برنامه‌ای با متن کامل):
                </h4>
                {AUDIO_STORIES.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-3">
                    هنوز محتوایی برای این بخش منتشر نشده است.
                  </div>
                ) : (
                  AUDIO_STORIES.map((story) => (
                    <AudioPlayer key={story.key} story={story} volume={settings.volume} />
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t border-line pt-4">
                <button
                  onClick={() => handleNavigate('learning')}
                  className="text-xs font-bold text-ink-2 hover:text-ink"
                >
                  بازگشت به مسیر
                </button>
                <button
                  onClick={() => {
                    markLearningDone('stories');
                    handleNavigate('challenge');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                >
                  <span>ثبت و رفتن به چالش‌های کشف</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'challenge' && (
          <div className="flex flex-col gap-5 text-right">
            {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} isMotionEnabled={settings.motion} />}

            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
              {CHALLENGES.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-3">
                  هنوز محتوایی برای این بخش منتشر نشده است.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div>
                      <span className="text-xs font-bold text-accent">
                        {content.site.pageIntros.challenge.kicker}
                      </span>
                      <h2 className="text-xl font-bold text-ink mt-0.5">
                        {content.site.pageIntros.challenge.title} ({CHALLENGES[challengeIndex % CHALLENGES.length]?.type || 'دام‌یاب'})
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-ink">
                      <Award className="h-4 w-4" />
                      <span>{toPersianDigits(challengeCorrectCount)} پاسخ درست</span>
                    </div>
                  </div>

                  {/* Already Answered Notice */}
                  {answeredChallenges.includes(String(challengeIndex)) && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-success bg-success-soft px-3 py-1 rounded-full">
                      <span>✓ پاسخ داده شده</span>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-bold text-ink leading-relaxed">
                      {CHALLENGES[challengeIndex % CHALLENGES.length]?.q}
                    </p>

                    <div role="radiogroup" aria-label="گزینه‌های پاسخ چالش" className="mt-5 space-y-2.5">
                      {CHALLENGES[challengeIndex % CHALLENGES.length]?.opts.map((opt, optIdx) => {
                        const isCorrectOption = optIdx === CHALLENGES[challengeIndex % CHALLENGES.length]?.ans;
                        const isSelected = selectedChallengeOption === optIdx;

                        let btnStyle = 'border-line bg-surface hover:bg-surface-2 text-ink';
                        if (challengeAnswered) {
                          if (isCorrectOption) {
                            btnStyle = 'border-success bg-success-soft text-success-ink font-bold';
                          } else if (isSelected) {
                            btnStyle = 'border-danger bg-danger-soft text-danger-ink';
                          } else {
                            btnStyle = 'opacity-40 border-line bg-surface-2 text-ink-3';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            role="radio"
                            aria-checked={isSelected}
                            disabled={challengeAnswered}
                            onClick={() => handleChallengeAnswer(optIdx)}
                            className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-right text-sm font-semibold transition-all ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {challengeAnswered && isCorrectOption && (
                              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                            )}
                            {challengeAnswered && isSelected && !isCorrectOption && (
                              <XCircle className="h-4 w-4 text-danger flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {challengeAnswered && (
                      <div
                        className={`mt-4 rounded-2xl p-4 border text-sm leading-relaxed ${
                          selectedChallengeOption === CHALLENGES[challengeIndex % CHALLENGES.length]?.ans
                            ? 'border-success/30 bg-success-soft text-success-ink'
                            : 'border-warning/30 bg-warning-soft text-warning-ink'
                        }`}
                      >
                        <strong className="block font-bold mb-1">
                          {selectedChallengeOption === CHALLENGES[challengeIndex % CHALLENGES.length]?.ans
                            ? 'آفرین! کاملاً درست است:'
                            : 'این بار نه؛ اما تحلیل منطقی را ببینید:'}
                        </strong>
                        {CHALLENGES[challengeIndex % CHALLENGES.length]?.why}
                      </div>
                    )}
                  </div>

                  {/* Challenge summary card after final challenge */}
                  {challengeIndex === CHALLENGES.length - 1 && challengeAnswered && (
                    <div className="rounded-2xl border border-line bg-surface-2 p-5 text-center space-y-3">
                      <h3 className="text-base font-bold text-ink">
                        {toPersianDigits(challengeCorrectCount)} از {toPersianDigits(CHALLENGES.length)} چالش را درست پاسخ دادید
                      </h3>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setChallengeIndex(0);
                            setChallengeAnswered(false);
                            setSelectedChallengeOption(null);
                          }}
                          className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-surface-2"
                        >
                          مرور دوباره
                        </button>
                        <button
                          onClick={() => handleNavigate('home')}
                          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                        >
                          بازگشت به میز کار
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Digital Collectible Cards Progress */}
                  <div className="border-t border-line pt-4">
                    <span className="text-xs font-bold text-ink-2 block mb-2">
                      کارت‌های دیجیتال شخصیت‌های باز شده:
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {Object.keys(PEOPLE).map((pKey) => {
                        const isUnlocked = unlockedArchetypes.includes(pKey);
                        return (
                          <div
                            key={pKey}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${
                              isUnlocked
                                ? 'border-primary/20 bg-primary-soft text-primary-ink shadow-sm'
                                : 'border-dashed border-line-strong bg-surface-2 text-ink-3'
                            }`}
                          >
                            <span>{isUnlocked ? '✓' : '🔒'}</span>
                            <span>{PEOPLE[pKey]?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-line pt-4">
                    <button
                      onClick={() => handleNavigate('learning')}
                      className="text-xs font-bold text-ink-2 hover:text-ink"
                    >
                      بازگشت به مسیر
                    </button>

                    <div className="flex gap-2">
                      {challengeAnswered && challengeIndex < CHALLENGES.length - 1 && (
                        <button
                          onClick={handleNextChallenge}
                          className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-surface hover:opacity-90 shadow-sm"
                        >
                          <span>چالش بعدی</span>
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          markLearningDone('challenge');
                          showToast('تبریک! تمام بخش‌های مسیر یادگیری را طی کردید.');
                          handleNavigate('home');
                        }}
                        className="rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-ink hover:bg-surface-2 shadow-sm"
                      >
                        تکمیل و بازگشت به میز کار
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {screen === 'book' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
              <span className="text-xs font-bold text-primary">
                {content.site.pageIntros.book.kicker}
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                {content.site.pageIntros.book.title}
              </h2>
              <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                {content.site.pageIntros.book.desc}
              </p>
            </div>

            <div className="space-y-3">
              {BOOK_QA.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-3">
                  هنوز محتوایی برای این بخش منتشر نشده است.
                </div>
              ) : (
                BOOK_QA.map((item, idx) => {
                  const isOpen = openBookIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-all"
                    >
                      <button
                        onClick={() => {
                          playSoundEffect('tap', settings.sound, settings.fxVolume);
                          setOpenBookIndex(isOpen ? null : idx);
                        }}
                        className="flex w-full items-center justify-between p-4.5 text-right hover:bg-surface-2 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold text-xs mt-0.5">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <div>
                            <span className="text-[13px] font-semibold text-ink-3 block mb-0.5">
                              {item.category}
                            </span>
                            <h4 className="text-sm font-bold text-ink">
                              {item.q}
                            </h4>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-ink-3 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-ink-3 flex-shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="border-t border-line bg-surface-2 p-5 text-sm text-ink-2 space-y-3 leading-relaxed animate-fadeIn">
                          <p className="font-normal">{item.a}</p>

                          <div className="rounded-xl bg-warning-soft p-3.5 border border-warning/20">
                            <span className="text-[13px] font-bold text-warning-ink block mb-0.5">
                              تمرین ۶۰ ثانیه‌ای برای تصمیم شما:
                            </span>
                            <p className="text-sm text-warning-ink font-medium">
                              {item.task}
                            </p>
                          </div>

                          <span className="text-xs text-ink-3 block">
                            ارجاع: {item.ref}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: LIBRARY (کتابخانه جامع) */}
        {/* ============================================================== */}
        {screen === 'library' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
              <span className="text-xs font-bold text-primary">
                {content.site.pageIntros.library.kicker}
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                {content.site.pageIntros.library.title}
              </h2>
              <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                {content.site.pageIntros.library.desc}
              </p>

              {/* Search input */}
              <div className="relative mt-4">
                <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-ink-3" />
                <input
                  type="text"
                  placeholder="جستجو در موضوعات، روایت‌ها، و پرسش‌ها..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-2 pr-10 pl-4 py-2.5 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>

              {/* Filter Tabs without unused poster */}
              <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all' as LibraryFilter, label: 'همه منابع' },
                  { id: 'audio' as LibraryFilter, label: 'روایت‌های صوتی' },
                  { id: 'video' as LibraryFilter, label: 'ویدئوی تحلیلی' },
                  { id: 'book' as LibraryFilter, label: 'پرسش‌های کتاب' },
                  { id: 'practice' as LibraryFilter, label: 'چالش‌ها و تمرین' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      playSoundEffect('tap', settings.sound, settings.fxVolume);
                      setLibraryFilter(f.id);
                    }}
                    className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      libraryFilter === f.id
                        ? 'bg-primary text-surface shadow-sm'
                        : 'bg-surface-2 text-ink-2 hover:bg-line'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Empty state when search has no results */}
            {!hasAnyLibraryResults ? (
              <div className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-2">
                نتیجه‌ای برای «{librarySearch}» پیدا نشد.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Audio Stories Section */}
                {(libraryFilter === 'all' || libraryFilter === 'audio') && filteredAudio.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-ink-2">
                      <Volume2 className="h-4 w-4 text-primary" />
                      <span>روایت‌های صوتی مستند ({toPersianDigits(filteredAudio.length)} مورد):</span>
                    </div>
                    {filteredAudio.map((story) => (
                      <AudioPlayer key={story.key} story={story} volume={settings.volume} />
                    ))}
                  </div>
                )}

                {/* Video Module Section */}
                {(libraryFilter === 'all' || libraryFilter === 'video') && filteredVideos.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-ink-2">
                      <Video className="h-4 w-4 text-warning" />
                      <span>ویدئوهای تحلیلی ({toPersianDigits(filteredVideos.length)} مورد):</span>
                    </div>
                    {filteredVideos.map((video) => (
                      <div key={video.id} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[13px] font-bold text-warning">{video.badge}</span>
                            <h4 className="text-base font-bold text-ink mt-0.5">
                              {video.title}
                            </h4>
                            <p className="text-sm text-ink-2 mt-1 leading-relaxed">
                              {video.desc}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setActiveVideoId(video.id);
                              setActiveModal('video');
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-warning px-4 py-2 text-xs font-bold text-surface hover:opacity-90 shadow-sm whitespace-nowrap flex-shrink-0"
                          >
                            <Video className="h-4 w-4" />
                            <span>تماشا</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Book Q&A Items Section */}
                {(libraryFilter === 'all' || libraryFilter === 'book') && filteredBookQA.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-ink-2">
                      <BookOpen className="h-4 w-4 text-warning" />
                      <span>پرسش‌های مرتبط کتاب Tune In ({toPersianDigits(filteredBookQA.length)} مورد):</span>
                    </div>
                    {filteredBookQA.map((item, idx) => {
                      const isOpen = openBookIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-all"
                        >
                          <button
                            onClick={() => {
                              playSoundEffect('tap', settings.sound, settings.fxVolume);
                              setOpenBookIndex(isOpen ? null : idx);
                            }}
                            className="flex w-full items-center justify-between p-4 text-right hover:bg-surface-2 transition-colors"
                            aria-expanded={isOpen}
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold text-xs mt-0.5">
                                {toPersianDigits(idx + 1)}
                              </span>
                              <div>
                                <span className="text-[13px] font-semibold text-ink-3 block mb-0.5">
                                  {item.category}
                                </span>
                                <h4 className="text-sm font-bold text-ink">
                                  {item.q}
                                </h4>
                              </div>
                            </div>
                            {isOpen ? (
                              <ChevronUp className="h-5 w-5 text-ink-3 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-ink-3 flex-shrink-0" />
                            )}
                          </button>

                          {isOpen && (
                            <div className="border-t border-line bg-surface-2 p-5 text-sm text-ink-2 space-y-3 leading-relaxed animate-fadeIn">
                              <p className="font-normal">{item.a}</p>
                              <div className="rounded-xl bg-warning-soft p-3.5 border border-warning/20">
                                <span className="text-[13px] font-bold text-warning-ink block mb-0.5">
                                  تمرین ۶۰ ثانیه‌ای:
                                </span>
                                <p className="text-sm text-warning-ink font-medium">
                                  {item.task}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Practice / Challenges Section */}
                {(libraryFilter === 'all' || libraryFilter === 'practice') && filteredChallenges.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-ink-2">
                      <Award className="h-4 w-4 text-accent" />
                      <span>چالش‌های کشف و ارزیابی ({toPersianDigits(filteredChallenges.length)} چالش):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredChallenges.map((c) => {
                        const originalIndex = CHALLENGES.indexOf(c);
                        const isDone = answeredChallenges.includes(String(originalIndex));
                        return (
                          <div
                            key={originalIndex}
                            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-sm"
                          >
                            <div>
                              <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
                                <span className="text-xs font-bold text-accent">
                                  {c.type}
                                </span>
                                {isDone && (
                                  <span className="text-xs font-bold text-success">
                                    ✓ پاسخ داده شده
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-ink line-clamp-2">
                                {c.q}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setChallengeIndex(originalIndex);
                                setChallengeAnswered(false);
                                setSelectedChallengeOption(null);
                                handleNavigate('challenge');
                              }}
                              className="mt-3 inline-flex items-center justify-center gap-1 rounded-xl bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink hover:bg-line"
                            >
                              <span>ورود به چالش</span>
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN: DECISIONS (فهرست پرونده‌های من) */}
        {/* ============================================================== */}
        {screen === 'decisions' && (
          <div className="flex flex-col gap-5 text-right">
            <div className="flex items-center justify-between rounded-3xl border border-line bg-surface p-6 shadow-sm">
              <div>
                <span className="text-xs font-bold text-primary">
                  {content.site.pageIntros.decisions.kicker}
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                  {content.site.pageIntros.decisions.title}
                </h2>
                <p className="mt-1 text-sm text-ink-3">
                  {content.site.pageIntros.decisions.desc}
                </p>
              </div>

              <button
                onClick={() => handleNavigate('newDecision')}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-surface shadow-sm hover:bg-primary-hover transition-all whitespace-nowrap"
              >
                <PlusCircle className="h-4 w-4" />
                <span>تصمیم جدید</span>
              </button>
            </div>

            {decisions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-ink-3 mb-3" />
                <h3 className="text-base font-bold text-ink">
                  هنوز پرونده‌ای ثبت نکرده‌اید
                </h3>
                <p className="mt-1 text-sm text-ink-2 max-w-sm mx-auto">
                  هر زمان تصمیمی مهم در پیش داشتید، با ایجاد یک پرونده آن را در {toPersianDigits(QUESTIONS.length)} پرسش بسنجید.
                </p>
                <button
                  onClick={() => handleNavigate('newDecision')}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-surface shadow-sm hover:bg-primary-hover transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>ساخت نخستین پرونده</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {decisions.map((d) => {
                  const answeredCount = getAnsweredCount(d);
                  const percent = QUESTIONS.length > 0 ? Math.round((answeredCount / QUESTIONS.length) * 100) : 0;

                  return (
                    <div
                      key={d.id}
                      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm transition-all hover:border-line-strong"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-[13px] text-ink-3 mb-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>ثبت: {formatDisplayDate(d.created)}</span>
                            <span>·</span>
                            <span className="font-bold text-primary">
                              {toPersianDigits(answeredCount)} از {toPersianDigits(QUESTIONS.length)} پاسخ ({toPersianDigits(percent)}٪)
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-ink">
                            {d.title}
                          </h3>
                          <p className="text-sm text-ink-2 mt-1 line-clamp-1">
                            {d.problem}
                          </p>
                        </div>

                        {/* Card action buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => setEditingDecision(d)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink-2 hover:bg-line"
                            aria-label="ویرایش عنوان و صورت مسئله"
                            title="ویرایش"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteDecision(d.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-danger hover:bg-danger-soft"
                            aria-label="حذف این پرونده"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setActiveDecisionId(d.id);
                              handleNavigate('report');
                            }}
                            className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink hover:bg-line shadow-sm"
                          >
                            <span>مشاهده شناسنامه</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveDecisionId(d.id);
                              setQuestionIndex(getFirstUnansweredIndex(d));
                              handleNavigate('question');
                            }}
                            className="flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                          >
                            <span>{answeredCount === QUESTIONS.length ? 'بازنگری چک‌لیست' : 'ادامه پاسخ‌ها'}</span>
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Real progress bar */}
                      <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
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
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
              <span className="text-xs font-bold text-primary">
                {content.site.pageIntros.newDecision.kicker}
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                {content.site.pageIntros.newDecision.title}
              </h2>
              <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                {content.site.pageIntros.newDecision.desc}
              </p>

              <form onSubmit={handleCreateDecision} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="dTitle" className="block text-xs font-bold text-ink mb-1.5">
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
                    className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all text-right"
                  />
                </div>

                <div>
                  <label htmlFor="dProblem" className="block text-xs font-bold text-ink mb-1.5">
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
                    className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all text-right"
                  />
                </div>

                <div>
                  <label htmlFor="dWhy" className="block text-xs font-bold text-ink mb-1.5">
                    چرا این تصمیم مهم و سرنوشت‌ساز است؟ <span className="text-ink-3 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    id="dWhy"
                    rows={2}
                    maxLength={400}
                    placeholder="پیامدها، هزینه‌ها، ریسک‌ها یا چرایی حساس بودن موعد تصمیم..."
                    value={newWhy}
                    onChange={(e) => setNewWhy(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all text-right"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={() => handleNavigate('home')}
                    className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-ink-2 hover:bg-surface-2"
                  >
                    انصراف
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-surface shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
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
        {screen === 'question' && (
          !currentDecision ? (
            <div className="rounded-3xl border border-line bg-surface p-8 text-center space-y-4">
              <FolderOpen className="h-12 w-12 mx-auto text-ink-3" />
              <h3 className="text-base font-bold text-ink">پرونده‌ای انتخاب نشده است</h3>
              <p className="text-sm text-ink-2">برای ارزیابی چک‌لیست، لطفاً ابتدا یک پرونده را باز کنید یا تصمیم جدیدی ثبت نمایید.</p>
              <button
                onClick={() => handleNavigate('decisions')}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
              >
                رفتن به پرونده‌ها
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5 text-right">
              {/* Station Progress Header */}
              <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">
                      ایستگاه {toPersianDigits(QUESTIONS[questionIndex].station + 1)} از {toPersianDigits(STATIONS.length)}:
                    </span>
                    <span className="text-xs font-bold text-ink">
                      {STATIONS[QUESTIONS[questionIndex].station].title}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-ink-3 tabular-nums">
                    پرسش {toPersianDigits(questionIndex + 1)} از {toPersianDigits(QUESTIONS.length)}
                  </span>
                </div>

                {/* Stations Bar */}
                <div className="flex items-center gap-1.5">
                  {STATIONS.map((_, sIdx) => {
                    const currentStation = QUESTIONS[questionIndex].station;
                    return (
                      <div
                        key={sIdx}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          sIdx < currentStation
                            ? 'bg-success'
                            : sIdx === currentStation
                            ? 'bg-primary'
                            : 'bg-line-strong'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Per-question dot row for the current station */}
                <div className="pt-2 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-3">پرسش‌های این ایستگاه:</span>
                  <div className="flex items-center gap-1.5">
                    {QUESTIONS.map((q, idx) => {
                      if (q.station !== QUESTIONS[questionIndex].station) return null;
                      const ansVal = currentDecision.answers[q.id]?.value;
                      const isCurrent = idx === questionIndex;

                      let dotClass = 'bg-line-strong';
                      if (ansVal === 'yes') dotClass = 'bg-success';
                      else if (ansVal === 'no') dotClass = 'bg-danger';
                      else if (ansVal === 'unknown') dotClass = 'bg-warning';

                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            playSoundEffect('tap', settings.sound, settings.fxVolume);
                            setQuestionIndex(idx);
                            setActiveQuestionHint('none');
                          }}
                          className={`h-3 w-3 rounded-full transition-all ${dotClass} ${
                            isCurrent ? 'ring-2 ring-primary ring-offset-2 scale-125' : 'hover:opacity-80'
                          }`}
                          aria-label={`پرسش ${toPersianDigits(idx + 1)}`}
                          title={`پرسش ${toPersianDigits(idx + 1)}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-ink-3">
                  {STATIONS[QUESTIONS[questionIndex].station].desc}
                </p>
              </div>

              {/* Question Card */}
              <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
                {QUESTIONS[questionIndex].critical && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-xs font-bold text-danger-ink border border-danger/30">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>پرسش حساس و خط قرمز (عدم پاسخ روشن مانع از اجراست)</span>
                  </div>
                )}

                <h3 className="text-lg sm:text-xl font-bold text-ink leading-relaxed">
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
                        ? 'border-primary bg-primary-soft text-primary-ink'
                        : 'border-line bg-surface-2 text-ink-2 hover:bg-line'
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
                        ? 'border-warning bg-warning-soft text-warning-ink'
                        : 'border-line bg-surface-2 text-ink-2 hover:bg-line'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>تمرین ۶۰ ثانیه‌ای</span>
                  </button>
                </div>

                {/* Hint Box */}
                {activeQuestionHint !== 'none' && (
                  <div className="rounded-2xl border border-line bg-surface-2 p-4 text-sm text-ink-2 leading-relaxed animate-fadeIn">
                    <strong className="block font-bold text-ink mb-1">
                      {activeQuestionHint === 'help' ? 'شرح و منطق سؤال:' : 'تمرین پیشنهادی:'}
                    </strong>
                    {activeQuestionHint === 'help'
                      ? QUESTIONS[questionIndex].help
                      : QUESTIONS[questionIndex].exercise}
                  </div>
                )}

                {/* 3 Answer Choice Buttons */}
                <div>
                  <span className="block text-xs font-bold text-ink mb-2">
                    وضعیت در تصمیم شما:
                  </span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { val: 'yes' as AnswerValue, label: 'بله (انجام شده)', type: 'success' },
                      { val: 'no' as AnswerValue, label: 'خیر (انجام نشده)', type: 'danger' },
                      { val: 'unknown' as AnswerValue, label: 'نامشخص / مبهم', type: 'warning' },
                    ].map((choice) => {
                      const currentAnswer = currentDecision.answers[QUESTIONS[questionIndex].id]?.value;
                      const isSelected = currentAnswer === choice.val;

                      let activeClass = 'border-line bg-surface hover:bg-surface-2 text-ink';
                      if (isSelected) {
                        if (choice.val === 'yes') {
                          activeClass = 'border-success bg-success-soft text-success-ink font-bold shadow-sm';
                        } else if (choice.val === 'no') {
                          activeClass = 'border-danger bg-danger-soft text-danger-ink font-bold shadow-sm';
                        } else {
                          activeClass = 'border-warning bg-warning-soft text-warning-ink font-bold shadow-sm';
                        }
                      }

                      return (
                        <button
                          key={choice.val}
                          aria-pressed={isSelected}
                          onClick={() => handleAnswerQuestion(choice.val)}
                          className={`min-h-[50px] rounded-xl border p-2 text-center text-xs font-bold transition-all active:scale-95 ${activeClass}`}
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
                    className="block text-xs font-bold text-ink mb-1.5"
                  >
                    یادداشت، منبع شواهد یا اقدام لازم <span className="text-ink-3 font-normal">(اختیاری)</span>
                  </label>
                  <textarea
                    id="qNote"
                    rows={2}
                    value={currentDecision.answers[QUESTIONS[questionIndex].id]?.note || ''}
                    onChange={(e) => handleUpdateNote(e.target.value)}
                    placeholder="چه دلیلی برای این پاسخ دارید؟ چه کاری باید پیش از جلسه بعدی انجام شود؟"
                    className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all text-right"
                  />
                </div>

                {/* Prev / Next Navigation Controls */}
                <div className="flex items-center justify-between border-t border-line pt-4">
                  <button
                    disabled={questionIndex === 0}
                    onClick={() => {
                      playSoundEffect('tap', settings.sound, settings.fxVolume);
                      setQuestionIndex((prev) => Math.max(0, prev - 1));
                      setActiveQuestionHint('none');
                    }}
                    className="flex items-center gap-1 rounded-xl border border-line px-3.5 py-2 text-xs font-bold text-ink hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>پرسش قبلی</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNavigate('report')}
                      className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-ink hover:bg-surface-2"
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
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                    >
                      <span>{questionIndex === QUESTIONS.length - 1 ? 'مشاهده پرونده' : 'پرسش بعدی'}</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* ============================================================== */}
        {/* SCREEN: REPORT (شناسنامه و گزارش تصمیم) */}
        {/* ============================================================== */}
        {screen === 'report' && (
          !currentDecision ? (
            <div className="rounded-3xl border border-line bg-surface p-8 text-center space-y-4">
              <FolderOpen className="h-12 w-12 mx-auto text-ink-3" />
              <h3 className="text-base font-bold text-ink">پرونده‌ای انتخاب نشده است</h3>
              <p className="text-sm text-ink-2">برای مشاهده گزارش، لطفاً ابتدا یک پرونده را انتخاب فرمایید.</p>
              <button
                onClick={() => handleNavigate('decisions')}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
              >
                رفتن به پرونده‌ها
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5 text-right">
              {/* Header */}
              <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm print-card space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary">
                      شناسنامه تحلیلی
                    </span>
                    <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink">
                      {currentDecision.title}
                    </h2>
                    <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                      <strong>صورت مسئله:</strong> {currentDecision.problem}
                    </p>
                    {currentDecision.why && (
                      <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">
                        <strong>اهمیت تصمیم:</strong> {currentDecision.why}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink hover:bg-line no-print"
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
                  const pendingCount = QUESTIONS.length - (yesCount + noCount + unkCount);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-2xl border border-success/30 bg-success-soft p-3.5 text-center">
                        <span className="text-xl sm:text-2xl font-bold text-success-ink tabular-nums">
                          {toPersianDigits(yesCount)}
                        </span>
                        <span className="block text-xs font-bold text-success-ink mt-0.5">
                          روشن و انجام‌شده
                        </span>
                      </div>

                      <div className="rounded-2xl border border-danger/30 bg-danger-soft p-3.5 text-center">
                        <span className="text-xl sm:text-2xl font-bold text-danger-ink tabular-nums">
                          {toPersianDigits(noCount)}
                        </span>
                        <span className="block text-xs font-bold text-danger-ink mt-0.5">
                          نیازمند اقدام اصلاحی
                        </span>
                      </div>

                      <div className="rounded-2xl border border-warning/30 bg-warning-soft p-3.5 text-center">
                        <span className="text-xl sm:text-2xl font-bold text-warning-ink tabular-nums">
                          {toPersianDigits(unkCount)}
                        </span>
                        <span className="block text-xs font-bold text-warning-ink mt-0.5">
                          نامشخص / مبهم
                        </span>
                      </div>

                      <div className="rounded-2xl border border-line bg-surface-2 p-3.5 text-center">
                        <span className="text-xl sm:text-2xl font-bold text-ink tabular-nums">
                          {toPersianDigits(pendingCount)}
                        </span>
                        <span className="block text-xs font-bold text-ink-3 mt-0.5">
                          پاسخ‌داده‌نشده
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Critical Warning */}
                {(() => {
                  const unresolvedCritical = QUESTIONS.filter(
                    (q) => q.critical && currentDecision.answers[q.id]?.value !== 'yes'
                  );

                  if (unresolvedCritical.length > 0) {
                    return (
                      <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4">
                        <div className="flex items-center gap-2 text-danger-ink font-bold text-xs mb-1">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            هشدار بحرانی: {toPersianDigits(unresolvedCritical.length)} پرسش حساس هنوز روشن نیست!
                          </span>
                        </div>
                        <p className="text-sm text-danger-ink leading-relaxed">
                          پیش از اجرای این تصمیم، حتماً موارد زیر را تعیین تکلیف کنید:
                        </p>
                        <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-danger-ink">
                          {unresolvedCritical.map((cq) => (
                            <li key={cq.id}>{cq.text}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  } else {
                    return (
                      <div className="rounded-2xl border border-success/30 bg-success-soft p-3.5 text-xs text-success-ink font-medium">
                        ✓ تمام پرسش‌های حساس دارای پاسخ روشن هستند. این امر ضریب اطمینان تصمیم را ارتقا می‌دهد.
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Open Items Section */}
              <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm print-card space-y-4">
                <div>
                  <h3 className="text-base font-bold text-ink mb-1">
                    موضوعات باز و اقدامات ضروری
                  </h3>
                  <p className="text-xs text-ink-3">
                    مواردی که در چک‌لیست با «خیر» یا «نامشخص» علامت زده‌اید:
                  </p>
                </div>

                {(() => {
                  const openItems = QUESTIONS.filter((q) => {
                    const val = currentDecision.answers[q.id]?.value;
                    return val === 'no' || val === 'unknown';
                  });

                  if (openItems.length === 0) {
                    return (
                      <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-3">
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
                            className="rounded-2xl border border-line bg-surface-2 p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-ink">
                                {q.text}
                              </span>
                              <span
                                className={`text-[13px] font-bold px-2 py-0.5 rounded-full ${
                                  ans?.value === 'no'
                                    ? 'bg-danger-soft text-danger-ink'
                                    : 'bg-warning-soft text-warning-ink'
                                }`}
                              >
                                {ans?.value === 'no' ? 'خیر' : 'نامشخص'}
                              </span>
                            </div>

                            {ans?.note ? (
                              <div className="space-y-1 text-sm text-ink-2">
                                <p>
                                  <strong className="text-ink">یادداشت شما: </strong>
                                  {ans.note}
                                </p>
                                <p className="text-xs text-ink-3">
                                  <strong className="text-ink-2">تمرین پیشنهادی: </strong>
                                  {q.exercise}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-ink-2">
                                <strong className="text-ink">تمرین پیشنهادی: </strong>
                                {q.exercise}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Review Date with Jalali Picker & Circuit Breaker */}
                <div className="border-t border-line pt-5 space-y-4">
                  {/* Jalali Date Picker */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      موعد بازنگری نهایی تصمیم (تقویم هجری شمسی)
                    </label>

                    {(() => {
                      const curJalali = isoToJalali(currentDecision.reviewDate);
                      const baseJalali = getCurrentJalaliDate();
                      const years = Array.from({ length: 6 }).map((_, i) => baseJalali.jy + i);

                      const updateJalaliDate = (newJy: number, newJm: number, newJd: number) => {
                        const isoStr = jalaliToIso(newJy, newJm, newJd);
                        setDecisions((prev) =>
                          prev.map((d) => (d.id === currentDecision.id ? { ...d, reviewDate: isoStr } : d))
                        );
                      };

                      return (
                        <div className="flex items-center gap-2 max-w-sm">
                          {/* Day */}
                          <select
                            value={curJalali.jd}
                            onChange={(e) =>
                              updateJalaliDate(curJalali.jy, curJalali.jm, parseInt(e.target.value, 10))
                            }
                            aria-label="روز بازنگری"
                            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right"
                          >
                            {Array.from({ length: 31 }).map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {toPersianDigits(i + 1)}
                              </option>
                            ))}
                          </select>

                          {/* Month */}
                          <select
                            value={curJalali.jm}
                            onChange={(e) =>
                              updateJalaliDate(curJalali.jy, parseInt(e.target.value, 10), curJalali.jd)
                            }
                            aria-label="ماه بازنگری"
                            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right flex-1"
                          >
                            {JALALI_MONTH_NAMES.map((name, i) => (
                              <option key={i + 1} value={i + 1}>
                                {name}
                              </option>
                            ))}
                          </select>

                          {/* Year */}
                          <select
                            value={curJalali.jy}
                            onChange={(e) =>
                              updateJalaliDate(parseInt(e.target.value, 10), curJalali.jm, curJalali.jd)
                            }
                            aria-label="سال بازنگری"
                            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right"
                          >
                            {years.map((y) => (
                              <option key={y} value={y}>
                                {toPersianDigits(y)}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Circuit Breaker text */}
                  <div>
                    <label htmlFor="stopSig" className="block text-xs font-bold text-ink mb-1.5">
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
                      className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all text-right no-print"
                    />
                    {/* Read-only copy for print */}
                    <div className="print-only text-sm text-ink p-2 border border-line rounded-xl mt-1">
                      {currentDecision.stopSignal || 'نشانه‌ای ثبت نشده است.'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-line pt-4 gap-2 no-print">
                  <button
                    onClick={() => handleNavigate('question')}
                    className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink-2 hover:bg-surface-2"
                  >
                    بازگشت به سؤالات
                  </button>

                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => {
                        showToast('پرونده با موفقیت ذخیره شد.');
                        handleNavigate('decisions');
                      }}
                      className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
                    >
                      بازگشت به فهرست پرونده‌ها
                    </button>
                    <span className="text-[13px] text-ink-3">
                      تغییرات به‌صورت خودکار ذخیره می‌شوند.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentScreen={screen}
        onNavigate={handleNavigate}
        decisionCount={decisions.length}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-ink text-canvas px-4 py-2.5 text-sm font-bold shadow-sm animate-slideUp text-center"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}

      {/* Modals */}
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

      {activeModal === 'tour' && (
        <TourModal
          onClose={() => setActiveModal('none')}
          tourSlides={content.tour}
        />
      )}

      {activeModal === 'help' && (
        <HelpModal
          screen={screen}
          onClose={() => setActiveModal('none')}
          onOpenTour={() => setActiveModal('tour')}
          helpEntries={content.help}
        />
      )}

      {activeModal === 'video' && activeVideo && (
        <VideoPlayerModal
          onClose={() => setActiveModal('none')}
          title={activeVideo.title}
          badge={activeVideo.badge}
          description={activeVideo.desc}
          videoUrl={activeVideo.videoUrl}
          posterUrl={activeVideo.posterUrl}
          quote={activeVideo.quote}
          reflectionQuestion={activeVideo.reflectionQuestion}
          whyImportant={activeVideo.whyImportant}
        />
      )}

      {editingDecision && (
        <EditDecisionModal
          decision={editingDecision}
          onClose={() => setEditingDecision(null)}
          onSave={handleSaveEditedDecision}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ContentProvider>
      <DerangApp />
    </ContentProvider>
  );
}

