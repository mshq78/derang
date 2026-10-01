type Base = {
  id: string;
  sortOrder: number;
  isPublished: boolean;
};

export interface SiteSettings {
  brandName: string;            // "درنگ"
  orgName: string;              // "پردیس نوآوری گِرا"
  tagline: string;              // "سامانه تصمیم‌گیری هوشیار"
  heroKicker: string;           // "همراه اختصاصی تصمیم‌گیری"
  heroTitle: string;            // "پیش از یک تصمیم مهم، چند دقیقه «درنگ» کنید."
  heroSubtitle: string;
  introAudioTitle: string;     // title of the short intro audio on the home page
  introAudioUrl: string;       // empty = no intro audio
  phoneLoginEnabled: boolean;  // true = visitors must sign in with an SMS code
  passwordLoginEnabled: boolean; // true = visitors sign in with a mobile number and password set by the admin
  tripMode: boolean;           // true = members of a trip group see only the journey game
  openAccess: boolean;         // true = no sign-in and no name screen at all (temporary review mode)
  onboardingTitle: string;
  onboardingSubtitle: string;
  farewellText: string;
  externalTestUrl: string;      // "https://test.igera.ir/"
  externalTestTitle: string;
  externalTestSubtitle: string;
  externalTestButton: string;
  whyPage: {
    intro: string;
    spots: { title: string; desc: string; tone: 'danger' | 'warning' | 'primary' }[];
    goalTitle: string;
    goalText: string;
  };
  pageIntros: Record<
    | 'why'
    | 'perimeters'
    | 'skills'
    | 'sonic'
    | 'people'
    | 'stories'
    | 'challenge'
    | 'library'
    | 'book'
    | 'learning'
    | 'decisions'
    | 'newDecision',
    { kicker: string; title: string; desc: string }
  >;
}

export interface Station extends Base {
  title: string;
  desc: string;
}

export interface Question extends Base {
  stationId: string;
  text: string;
  help: string;
  exercise: string;
  critical: boolean;
}

export interface Perimeter extends Base {
  tag: string;
  en: string;
  fa: string;
  desc: string;
  question: string;
  solution: string;
}

export interface Skill extends Base {
  name: string;
  desc: string;
}

export interface SonicTool extends Base {
  letter: string;
  en: string;
  fa: string;
  tool: string;
  desc: string;
}

export interface Person extends Base {
  name: string;
  title: string;
  strength: string;
  shadow: string;
  reflectionQuestion: string;
  quote: string;
  colorBg: string;
  colorPrimary: string;
  imageUrl?: string;      // front of the card (strength)
  backImageUrl?: string;  // back of the card (shadow)
}

export interface AudioStory extends Base {
  title: string;
  subtitle: string;
  durationSeconds: number;
  tags: string[];
  desc: string;
  transcript: string;
  takeaway: string;
  audioUrl?: string;
  coverUrl?: string;
}

export interface VideoItem extends Base {
  title: string;
  badge: string;
  desc: string;
  videoUrl?: string;
  posterUrl?: string;
  quote: string;
  reflectionQuestion: string;
  whyImportant: string;
  showOnStories: boolean;
}

export interface BookQA extends Base {
  category: string;
  q: string;
  a: string;
  task: string;
  ref: string;
}

export interface Challenge extends Base {
  type: string;
  q: string;
  opts: string[];
  ans: number;
  why: string;
}

export interface HelpEntry extends Base {
  screen: string;
  title: string;
  body: string;
  tip: string;
}

export interface TourSlide extends Base {
  title: string;
  desc: string;
  icon: 'CheckSquare' | 'Compass' | 'HelpCircle' | 'Layers' | 'BookOpen' | 'Sparkles' | 'Award';
  tone: 'primary' | 'success' | 'warning' | 'accent';
}

export interface LearningStep extends Base {
  screen: 'why' | 'perimeters' | 'skills' | 'sonic' | 'people' | 'stories' | 'challenge';
  title: string;
  desc: string;
}

export interface ContentBundle {
  version: string;
  updatedAt: string;            // ISO date
  site: SiteSettings;
  stations: Station[];
  questions: Question[];
  perimeters: Perimeter[];
  skills: Skill[];
  sonic: SonicTool[];
  people: Person[];
  audioStories: AudioStory[];
  videos: VideoItem[];
  bookQA: BookQA[];
  challenges: Challenge[];
  help: HelpEntry[];
  tour: TourSlide[];
  learningSteps: LearningStep[];
}

export type CollectionName =
  | 'stations'
  | 'questions'
  | 'perimeters'
  | 'skills'
  | 'sonic'
  | 'people'
  | 'audioStories'
  | 'videos'
  | 'bookQA'
  | 'challenges'
  | 'help'
  | 'tour'
  | 'learningSteps';

export type CollectionItem =
  | Station
  | Question
  | Perimeter
  | Skill
  | SonicTool
  | Person
  | AudioStory
  | VideoItem
  | BookQA
  | Challenge
  | HelpEntry
  | TourSlide
  | LearningStep;

export type CollectionItemMap = {
  stations: Station;
  questions: Question;
  perimeters: Perimeter;
  skills: Skill;
  sonic: SonicTool;
  people: Person;
  audioStories: AudioStory;
  videos: VideoItem;
  bookQA: BookQA;
  challenges: Challenge;
  help: HelpEntry;
  tour: TourSlide;
  learningSteps: LearningStep;
};
