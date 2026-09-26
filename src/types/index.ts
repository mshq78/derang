export type Screen =
  | 'home'
  | 'learning'
  | 'library'
  | 'decisions'
  | 'newDecision'
  | 'question'
  | 'report'
  | 'why'
  | 'perimeters'
  | 'skills'
  | 'sonic'
  | 'people'
  | 'stories'
  | 'challenge'
  | 'book'
  | 'farewell';

export type AnswerValue = 'yes' | 'no' | 'unknown';

export interface AnswerItem {
  value?: AnswerValue;
  note?: string;
}

export interface DecisionRecord {
  id: string;
  title: string;
  problem: string;
  why?: string;
  created: string;
  answers: Record<string, AnswerItem>;
  reviewDate?: string;
  stopSignal?: string;
}

export interface UserProfile {
  first: string;
  last: string;
}

export interface AppSettings {
  font: number;
  volume: number;
  fxVolume: number;
  sound: boolean;
  motion: boolean;
  highContrast: boolean;
  theme: 'light' | 'dark';
}

export interface QuestionDef {
  id: string;
  station: number;
  text: string;
  help: string;
  exercise: string;
  critical?: boolean;
}

export interface StationDef {
  title: string;
  desc: string;
  qs: [string, string, string, boolean?][];
}

export interface ArchetypeDef {
  id: string;
  name: string;
  title: string;
  strength: string;
  shadow: string;
  reflectionQuestion: string;
  quote: string;
  color: string;
  avatarSeed: string;
  imageUrl?: string;
}

export interface AudioStoryDef {
  key: string;
  title: string;
  subtitle: string;
  dur: string;
  seconds: number;
  tags: string[];
  desc: string;
  transcript: string;
  takeaway: string;
  audioUrl?: string;
  coverUrl?: string;
}

export interface ChallengeDef {
  type: string;
  q: string;
  opts: string[];
  ans: number;
  why: string;
}

export interface BookQADef {
  q: string;
  a: string;
  task: string;
  ref: string;
  category: string;
}

export type LibraryFilter = 'all' | 'audio' | 'video' | 'book' | 'practice';
