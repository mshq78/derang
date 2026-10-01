/**
 * The bus trip as a game: a list of stages that the organiser opens one by one.
 * Shared by the server (scoring) and the app (screens). The correct quiz answers
 * are NOT here; they live only on the server (server/tripAnswers.ts).
 */

export type ContentRef =
  | { source: 'intro' }
  | { source: 'story'; id: string }
  | { source: 'video'; id?: string; titleIncludes?: string };

export interface MediaItem {
  key: 'audio' | 'video';
  ref: ContentRef;
}

/** The audio and the video of one piece count as alternatives: the first gives `base`, the second `bonus`. */
export interface MediaGroup {
  id: string;
  title: string;
  base: number;
  bonus: number;
  items: MediaItem[];
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface StageDef {
  id: string;
  title: string;
  subtitle: string;
  /** Finishing within this many minutes of the stage opening earns the "pioneer" badge. */
  fastMinutes: number;
  groups: MediaGroup[];
  /** Stage-one extras: choose the personality-test result, look at all five cards. */
  special?: ('test' | 'cards')[];
  quiz: QuizQuestion[];
}

export const POINTS = { test: 60, cards: 60, quiz: 10 } as const;

export const CHARACTERS = [
  { id: 'davinci', name: 'لئوناردو داوینچی' },
  { id: 'lincoln', name: 'آبراهام لینکلن' },
  { id: 'edison', name: 'توماس ادیسون' },
  { id: 'churchill', name: 'وینستون چرچیل' },
  { id: 'einstein', name: 'آلبرت اینشتین' },
] as const;

export const STAGES: StageDef[] = [
  {
    id: 's1',
    title: 'جاگیری و آغاز',
    subtitle: 'معرفی درنگ، تست شخصیت تصمیم‌گیری و کارت پنج شخصیت',
    fastMinutes: 90,
    groups: [{ id: 'intro', title: 'معرفی صوتی درنگ', base: 60, bonus: 0, items: [{ key: 'audio', ref: { source: 'intro' } }] }],
    special: ['test', 'cards'],
    quiz: [],
  },
  {
    id: 's2',
    title: 'رمزگشایی از ده دام تصمیم',
    subtitle: 'صوت مدل PERIMETERS',
    fastMinutes: 25,
    groups: [
      { id: 'perimeters', title: 'مدل PERIMETERS', base: 100, bonus: 0, items: [{ key: 'audio', ref: { source: 'story', id: 'perimeters_audio' } }] },
    ],
    quiz: [
      {
        id: 'q1',
        text: 'بر اساس این روایت، سوگیری‌ها در اصل چه هستند؟',
        options: ['خطاهای فردی ساده', 'الگوهای رفتاری مغز در برابر ابهام، زمان محدود و فشار اجتماعی', 'نشانه‌ی کم‌هوشی', 'مشکل اطلاعات ناقص'],
      },
      {
        id: 'q2',
        text: 'مدل PERIMETERS چند مؤلفه (دام) دارد؟',
        options: ['پنج', 'هفت', 'ده', 'دوازده'],
      },
      {
        id: 'q3',
        text: 'پیش از تصمیم باید از خود بپرسید…',
        options: ['چه کسی مخالف است؟', 'کدام حرف PERIMETERS در این میز پررنگ‌تر است؟', 'چقدر وقت دارم؟', 'بقیه چه می‌کنند؟'],
      },
    ],
  },
  {
    id: 's3',
    title: 'اصفهان ۱؛ پیش از سقوط',
    subtitle: 'صوت یا ویدیو (هر دو را ببینید، امتیاز بیشتر)',
    fastMinutes: 25,
    groups: [
      {
        id: 'isfahan1',
        title: 'اصفهان ۱',
        base: 100,
        bonus: 30,
        items: [
          { key: 'audio', ref: { source: 'story', id: 'isfahan1' } },
          { key: 'video', ref: { source: 'video', id: 'video-sultan-hussein' } },
        ],
      },
    ],
    quiz: [
      {
        id: 'q1',
        text: 'شاه سلطان حسین نامه‌های هولناک حکام را با کدام جمله نادیده می‌گرفت؟',
        options: ['«فردا فکر می‌کنیم»', '«هر چه تقدیر باشد همان خواهد شد»', '«دشمن توان رسیدن ندارد»', '«وزیران تصمیم می‌گیرند»'],
      },
      {
        id: 'q2',
        text: 'اطرافیان شاه با خبرهای شکست چه می‌کردند؟',
        options: ['فوراً به شاه می‌رساندند', 'لاپوشانی می‌کردند تا آرامش شاه حفظ شود', 'به مردم اعلام می‌کردند', 'نامه را گم می‌کردند'],
      },
      {
        id: 'q3',
        text: 'پرهزینه‌ترین تصمیم ممکن، طبق این روایت، کدام است؟',
        options: ['تصمیم عجولانه', 'بی‌اقدامی و فرار از رویارویی با حقیقت', 'جنگ', 'مشورت زیاد'],
      },
    ],
  },
  {
    id: 's4',
    title: 'ترابانت؛ خودرویی که منجمد شد',
    subtitle: 'ویدیو یا صوت (هر دو را ببینید، امتیاز بیشتر)',
    fastMinutes: 25,
    groups: [
      {
        id: 'trabant',
        title: 'ترابانت',
        base: 100,
        bonus: 30,
        items: [
          { key: 'audio', ref: { source: 'story', id: 'trabant' } },
          { key: 'video', ref: { source: 'video', titleIncludes: 'ترابانت' } },
        ],
      },
    ],
    quiz: [
      {
        id: 'q1',
        text: 'صف خرید ترابانت در آلمان شرقی تا چند سال طول می‌کشید؟',
        options: ['۲ سال', '۵ سال', '۱۰ سال', '۲۰ سال'],
      },
      {
        id: 'q2',
        text: 'پس از فروریختن دیوار برلین چه بر سر ترابانت آمد؟',
        options: ['فروشش دو برابر شد', 'شهروندان آن را کنار اتوبان‌ها رها کردند', 'به غرب صادر شد', 'تولیدش متوقف نشد'],
      },
      {
        id: 'q3',
        text: 'بزرگ‌ترین خواب‌آور برای ندیدن تحولات فردا چیست؟',
        options: ['شکست امروز', 'رقیب بزرگ', 'موفقیت گذشته و صف تقاضای امروز', 'کمبود سرمایه'],
      },
    ],
  },
  {
    id: 's5',
    title: 'تایتان و پالو آلتو',
    subtitle: 'دو صوت: غرور مهندسی و هویت گره‌خورده به محصول',
    fastMinutes: 40,
    groups: [
      { id: 'titan', title: 'تایتان', base: 80, bonus: 0, items: [{ key: 'audio', ref: { source: 'story', id: 'titan' } }] },
      { id: 'paloalto', title: 'پالو آلتو', base: 80, bonus: 0, items: [{ key: 'audio', ref: { source: 'story', id: 'paloalto' } }] },
    ],
    quiz: [
      {
        id: 'q1',
        text: 'مدیریت اوشن‌گیت در برابر هشدار مهندسان ایمنی چه کرد؟',
        options: ['بدنه را عوض کرد', 'منتقدان را اخراج کرد و از آن‌ها شکایت کرد', 'ماموریت را لغو کرد', 'بیمه گرفت'],
      },
      {
        id: 'q2',
        text: 'زیراکس هویت خود را چه تعریف کرده بود؟',
        options: ['شرکت رایانه', 'دستگاه کپی کاغذ', 'شرکت نرم‌افزار', 'سازنده‌ی شبکه'],
      },
      {
        id: 'q3',
        text: 'ماجرای پالو آلتو نمونه‌ی کدام دام است؟',
        options: ['دام هویت', 'دام زمان', 'دام اخلاق', 'دام ریسک'],
      },
    ],
  },
  {
    id: 's6',
    title: 'اصفهان ۲؛ کالبدشکافی',
    subtitle: 'صوت تحلیل سقوط با لنز PERIMETERS',
    fastMinutes: 20,
    groups: [
      { id: 'isfahan2', title: 'اصفهان ۲', base: 100, bonus: 0, items: [{ key: 'audio', ref: { source: 'story', id: 'isfahan2' } }] },
    ],
    quiz: [
      {
        id: 'q1',
        text: '«اطاعت کورکورانه از شاه ناتوان» نمونه‌ی کدام دام است؟',
        options: ['دام قدرت', 'دام حافظه', 'دام زمان', 'دام ریسک'],
      },
      {
        id: 'q2',
        text: '«اعتماد کاذب به اقتدار دویست‌ساله‌ی صفوی» نمونه‌ی کدام دام است؟',
        options: ['دام ایگو', 'دام روابط', 'دام حافظه', 'دام داستان'],
      },
      {
        id: 'q3',
        text: 'خط قرمز بقای هر سازمان، طبق این روایت چیست؟',
        options: ['بودجه‌ی کافی', 'امنیت روانی برای رساندن خبرهای ناگوار به رهبر', 'سرعت تصمیم', 'تعداد مشاوران'],
      },
    ],
  },
];

export const BADGES: Record<string, { label: string; desc: string }> = {
  finisher: { label: 'مسافر کامل', desc: 'همه‌ی مرحله‌ها را انجام دادید' },
  'fast:s1': { label: 'پیشگام جاگیری', desc: 'مرحله‌ی اول را زود انجام دادید' },
  'fast:s2': { label: 'پیشگام دام‌ها', desc: 'مرحله‌ی PERIMETERS را زود انجام دادید' },
  'fast:s3': { label: 'پیشگام اصفهان', desc: 'مرحله‌ی اصفهان ۱ را زود انجام دادید' },
  'fast:s4': { label: 'پیشگام ترابانت', desc: 'مرحله‌ی ترابانت را زود انجام دادید' },
  'fast:s5': { label: 'پیشگام تایتان', desc: 'مرحله‌ی تایتان و پالو آلتو را زود انجام دادید' },
  'fast:s6': { label: 'پیشگام پایان‌سفر', desc: 'مرحله‌ی آخر را زود انجام دادید' },
  'both:s3': { label: 'هم دیدم، هم شنیدم (اصفهان)', desc: 'ویدیو و صوت اصفهان ۱ را هر دو انجام دادید' },
  'both:s4': { label: 'هم دیدم، هم شنیدم (ترابانت)', desc: 'ویدیو و صوت ترابانت را هر دو انجام دادید' },
  'perfect:s2': { label: 'نمره‌ی کامل: دام‌ها', desc: 'همه‌ی پاسخ‌های مرحله‌ی PERIMETERS درست بود' },
  'perfect:s3': { label: 'نمره‌ی کامل: اصفهان', desc: 'همه‌ی پاسخ‌های اصفهان ۱ درست بود' },
  'perfect:s4': { label: 'نمره‌ی کامل: ترابانت', desc: 'همه‌ی پاسخ‌های ترابانت درست بود' },
  'perfect:s5': { label: 'نمره‌ی کامل: تایتان', desc: 'همه‌ی پاسخ‌های تایتان و پالو آلتو درست بود' },
  'perfect:s6': { label: 'نمره‌ی کامل: پایان‌سفر', desc: 'همه‌ی پاسخ‌های اصفهان ۲ درست بود' },
};

export const taskId = {
  media: (stage: string, group: string, key: string) => `${stage}:${group}:${key}`,
  test: 's1:test',
  cards: 's1:cards',
  quiz: (stage: string, q: string) => `${stage}:q:${q}`,
};
