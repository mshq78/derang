import type { CollectionName, ContentBundle, SiteSettings } from '../src/types/content.js';
import { badRequest } from './http.js';
import { normalizeMediaUrl } from './media.js';
import { normalizeVideoInput } from '../src/utils/videoEmbed.js';

export const COLLECTIONS: CollectionName[] = [
  'stations',
  'questions',
  'perimeters',
  'skills',
  'sonic',
  'people',
  'audioStories',
  'videos',
  'bookQA',
  'challenges',
  'help',
  'tour',
  'learningSteps',
];

export function isCollection(value: string): value is CollectionName {
  return (COLLECTIONS as string[]).includes(value);
}

type Field =
  | { t: 'text'; required?: boolean; max?: number }
  | { t: 'url' }
  | { t: 'color' }
  | { t: 'int'; min?: number; max?: number }
  | { t: 'bool' }
  | { t: 'list'; min?: number; max?: number }
  | { t: 'enum'; values: string[] };

const text = (max = 20000): Field => ({ t: 'text', required: true, max });
const optText = (max = 20000): Field => ({ t: 'text', max });
const url: Field = { t: 'url' };
const bool: Field = { t: 'bool' };

const LEARNING_SCREENS = ['why', 'perimeters', 'skills', 'sonic', 'people', 'stories', 'challenge'];

const SPECS: Record<CollectionName, Record<string, Field>> = {
  stations: { title: text(300), desc: optText() },
  questions: {
    stationId: text(80),
    text: text(2000),
    help: optText(),
    exercise: optText(),
    critical: bool,
  },
  perimeters: {
    tag: text(4),
    en: text(200),
    fa: text(200),
    desc: optText(),
    question: optText(),
    solution: optText(),
  },
  skills: { name: text(300), desc: optText() },
  sonic: { letter: text(4), en: text(200), fa: text(200), tool: optText(500), desc: optText() },
  people: {
    name: text(200),
    title: optText(300),
    strength: optText(),
    shadow: optText(),
    reflectionQuestion: optText(),
    quote: optText(),
    colorBg: { t: 'color' },
    colorPrimary: { t: 'color' },
    imageUrl: url,
    backImageUrl: url,
  },
  audioStories: {
    title: text(300),
    subtitle: optText(500),
    durationSeconds: { t: 'int', min: 0, max: 24 * 3600 },
    tags: { t: 'list', max: 20 },
    desc: optText(),
    transcript: optText(100000),
    takeaway: optText(),
    audioUrl: url,
    coverUrl: url,
  },
  videos: {
    title: text(300),
    badge: optText(200),
    desc: optText(),
    videoUrl: url,
    posterUrl: url,
    quote: optText(),
    reflectionQuestion: optText(),
    whyImportant: optText(),
    showOnStories: bool,
  },
  bookQA: { category: optText(200), q: text(2000), a: optText(), task: optText(), ref: optText(500) },
  challenges: {
    type: text(100),
    q: text(4000),
    opts: { t: 'list', min: 2, max: 6 },
    ans: { t: 'int', min: 0, max: 5 },
    why: optText(),
  },
  help: { screen: text(50), title: text(300), body: optText(), tip: optText() },
  tour: {
    title: text(300),
    desc: optText(),
    icon: {
      t: 'enum',
      values: ['CheckSquare', 'Compass', 'HelpCircle', 'Layers', 'BookOpen', 'Sparkles', 'Award'],
    },
    tone: { t: 'enum', values: ['primary', 'success', 'warning', 'accent'] },
  },
  learningSteps: {
    screen: { t: 'enum', values: LEARNING_SCREENS },
    title: text(300),
    desc: optText(),
  },
};

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-z][a-z0-9-]{0,60})$/;

export function isValidId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id);
}

/**
 * Accepts an empty string, a same-site path such as /media/audio/x.m4a, or an
 * absolute http(s) URL. Blocks javascript:, data: and protocol-relative (//) URLs.
 */
export function isSafeUrl(value: string): boolean {
  if (value === '') return true;
  if (value.length > 2000) return false;
  if (value.startsWith('/')) return /^\/(?!\/)[A-Za-z0-9._~%\/-]*$/.test(value);
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export interface CleanItem {
  id?: string;
  sortOrder?: number;
  isPublished: boolean;
  data: Record<string, unknown>;
}

/** Validates one collection item and returns only the known fields. */
export function cleanItem(collection: CollectionName, input: unknown, label = ''): CleanItem {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest(`${label}داده ارسالی باید یک شیء باشد.`);
  }
  const src = input as Record<string, unknown>;
  const spec = SPECS[collection];
  const data: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(spec)) {
    const value = src[key];
    const fail = (why: string) => badRequest(`${label}فیلد «${key}» ${why}`, 'validation');

    switch (field.t) {
      case 'text': {
        if (value === undefined || value === null) {
          if (field.required) throw fail('الزامی است.');
          data[key] = '';
          break;
        }
        if (typeof value !== 'string') throw fail('باید متن باشد.');
        if (field.required && value.trim() === '') throw fail('نمی‌تواند خالی باشد.');
        if (field.max && value.length > field.max) throw fail(`بیش از ${field.max} نویسه است.`);
        data[key] = value;
        break;
      }
      case 'url': {
        const v = value === undefined || value === null ? '' : value;
        // videoUrl also accepts Aparat's embed code, stored as the Aparat page link.
        const raw = typeof v === 'string' && key === 'videoUrl' ? normalizeVideoInput(v) : v;
        const cleanUrl = typeof raw === 'string' ? normalizeMediaUrl(raw.trim()) : raw;
        if (typeof cleanUrl !== 'string' || !isSafeUrl(cleanUrl)) {
          throw fail('باید یک نشانی http یا https معتبر باشد.');
        }
        data[key] = cleanUrl;
        break;
      }
      case 'color': {
        if (typeof value !== 'string' || !COLOR_RE.test(value)) throw fail('رنگ معتبر نیست.');
        data[key] = value;
        break;
      }
      case 'int': {
        const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
        if (typeof n !== 'number' || !Number.isInteger(n)) throw fail('باید عدد صحیح باشد.');
        if (field.min !== undefined && n < field.min) throw fail(`نباید کمتر از ${field.min} باشد.`);
        if (field.max !== undefined && n > field.max) throw fail(`نباید بیشتر از ${field.max} باشد.`);
        data[key] = n;
        break;
      }
      case 'bool': {
        data[key] = value === true;
        break;
      }
      case 'list': {
        const list = value === undefined || value === null ? [] : value;
        if (!Array.isArray(list) || !list.every((x) => typeof x === 'string' && x.length <= 2000)) {
          throw fail('باید فهرستی از متن‌ها باشد.');
        }
        if (field.min !== undefined && list.length < field.min) throw fail(`حداقل ${field.min} مورد لازم دارد.`);
        if (field.max !== undefined && list.length > field.max) throw fail(`حداکثر ${field.max} مورد مجاز است.`);
        data[key] = list;
        break;
      }
      case 'enum': {
        if (typeof value !== 'string' || !field.values.includes(value)) {
          throw fail(`باید یکی از این مقادیر باشد: ${field.values.join('، ')}`);
        }
        data[key] = value;
        break;
      }
    }
  }

  if (collection === 'challenges') {
    const opts = data.opts as string[];
    if ((data.ans as number) >= opts.length) {
      throw badRequest(`${label}پاسخ درست باید یکی از گزینه‌های موجود باشد.`, 'validation');
    }
  }

  const out: CleanItem = { isPublished: src.isPublished === undefined ? true : src.isPublished === true, data };
  if (src.id !== undefined && src.id !== null && src.id !== '') {
    if (!isValidId(src.id)) {
      throw badRequest(`${label}شناسه فقط می‌تواند شامل حروف انگلیسی، عدد، - و _ باشد.`, 'validation');
    }
    out.id = src.id;
  }
  if (src.sortOrder !== undefined && src.sortOrder !== null) {
    if (typeof src.sortOrder !== 'number' || !Number.isInteger(src.sortOrder)) {
      throw badRequest(`${label}ترتیب نمایش باید عدد صحیح باشد.`, 'validation');
    }
    out.sortOrder = src.sortOrder;
  }
  return out;
}

const SITE_MAX_BYTES = 200 * 1024;

/** Site settings are a nested object of strings; check shape, size and the one URL field. */
export function cleanSite(input: unknown): SiteSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('تنظیمات سایت باید یک شیء باشد.');
  }
  if (JSON.stringify(input).length > SITE_MAX_BYTES) {
    throw badRequest('حجم تنظیمات سایت بیش از حد مجاز است.');
  }
  const onlyStrings = (v: unknown, depth: number): boolean => {
    if (typeof v === 'string') return true;
    if (depth > 4) return false;
    if (Array.isArray(v)) return v.every((x) => onlyStrings(x, depth + 1));
    if (v && typeof v === 'object') return Object.values(v).every((x) => onlyStrings(x, depth + 1));
    return false;
  };
  if (!onlyStrings(input, 0)) {
    throw badRequest('مقادیر تنظیمات سایت باید متن باشند.', 'validation');
  }
  const site = input as SiteSettings;
  if (typeof site.introAudioUrl === 'string') {
    site.introAudioUrl = normalizeMediaUrl(site.introAudioUrl.trim());
    if (!isSafeUrl(site.introAudioUrl)) {
      throw badRequest('نشانی فایل معرفی صوتی معتبر نیست.', 'validation');
    }
  }
  if (typeof site.externalTestUrl === 'string' && !isSafeUrl(site.externalTestUrl.trim())) {
    throw badRequest('نشانی آزمون گِرا باید با http یا https شروع شود.', 'validation');
  }
  const spots = site.whyPage?.spots;
  if (Array.isArray(spots)) {
    for (const spot of spots) {
      if (!['danger', 'warning', 'primary'].includes(spot.tone)) {
        throw badRequest('رنگ کارت‌های صفحه «چرا درنگ» معتبر نیست.', 'validation');
      }
    }
  }
  return site;
}

export interface CleanBundle {
  site: SiteSettings;
  items: Record<CollectionName, (CleanItem & { id: string; sortOrder: number })[]>;
}

/** Validates a whole content bundle (used by import and by the initial seed). */
export function cleanBundle(input: unknown): CleanBundle {
  if (!input || typeof input !== 'object') throw badRequest('فایل محتوا معتبر نیست.');
  const src = input as Partial<ContentBundle>;
  const site = cleanSite(src.site);
  const items = {} as CleanBundle['items'];

  for (const collection of COLLECTIONS) {
    const list = src[collection];
    if (!Array.isArray(list)) throw badRequest(`بخش «${collection}» در فایل وجود ندارد یا فهرست نیست.`);
    const seen = new Set<string>();
    items[collection] = list.map((raw, index) => {
      const label = `${collection} ردیف ${index + 1}: `;
      const item = cleanItem(collection, raw, label);
      if (!item.id) throw badRequest(`${label}شناسه ندارد.`, 'validation');
      if (seen.has(item.id)) throw badRequest(`${label}شناسه «${item.id}» تکراری است.`, 'validation');
      seen.add(item.id);
      return { ...item, id: item.id, sortOrder: item.sortOrder ?? (index + 1) * 10 };
    });
  }

  const stationIds = new Set(items.stations.map((s) => s.id));
  for (const q of items.questions) {
    if (!stationIds.has(q.data.stationId as string)) {
      throw badRequest(`پرسش «${q.id}» به ایستگاهی اشاره می‌کند که وجود ندارد.`, 'validation');
    }
  }
  return { site, items };
}
