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
        text: '«ناشنوایی در تصمیم‌گیری» در این مدل یعنی چه؟',
        options: [
          'نشنیدن صدای محیط کار',
          'کم‌شنوایی مدیران',
          'نادیده گرفتن مسائل کلیدی و حرف‌های مهم و قضاوت عجولانه',
          'سکوت در جلسه‌ها',
        ],
      },
      {
        id: 'q2',
        text: 'کدام سؤال، سؤال فیلتر «منیت» (Ego) است؟',
        options: [
          'چه چیزی را واقعاً نمی‌دانم؟',
          'آیا دارم راه بهتر را پیدا می‌کنم، یا فقط می‌خواهم ثابت کنم حق با من بوده است؟',
          'هزینه‌ی این تصمیم چه زمانی خودش را نشان می‌دهد؟',
          'دیگران چه تصمیمی گرفته‌اند؟',
        ],
      },
      {
        id: 'q3',
        text: 'سؤال فیلتر «حافظه» (Memory) کدام است؟',
        options: [
          'اگر روایت را کنار بگذارم، شواهد خام چه می‌گویند؟',
          'این حرف را به‌خاطر دلیل پذیرفته‌ام یا به‌خاطر گوینده؟',
          'اگر فردا با ذهنی آرام تصمیم بگیرم همین را انتخاب می‌کنم؟',
          'این را واقعاً می‌دانم، یا فقط این‌طور به یاد می‌آورم؟',
        ],
      },
      {
        id: 'q4',
        text: 'طبق مدل، خطر (Risk) از چه زمانی شروع می‌شود؟',
        options: [
          'وقتی نمی‌دانیم چه چیزی را نمی‌دانیم',
          'وقتی پول کم است',
          'وقتی وقت کم است',
          'وقتی دیگران مخالف‌اند',
        ],
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
        text: 'قندهار در چه سالی از کنترل صفویان خارج شد؟',
        options: [
          '۱۶۸۸',
          '۱۷۰۹',
          '۱۷۱۵',
          '۱۷۲۲',
        ],
      },
      {
        id: 'q2',
        text: 'پس از شکست گلناباد چه شد؟',
        options: [
          'اصفهان همان روز سقوط کرد',
          'محاصره‌ای حدود شش‌ماهه آغاز شد',
          'صلح امضا شد',
          'محمود هوتک عقب‌نشینی کرد',
        ],
      },
      {
        id: 'q3',
        text: 'پرسش اصلی این داستان چیست؟',
        options: [
          'چه کسی اصفهان را شکست داد؟',
          'کدام سپاه بزرگ‌تر بود؟',
          'چرا یک سیستم، وقتی هنوز فرصت اصلاح دارد، نشانه‌های بحران را نادیده می‌گیرد؟',
          'جمعیت اصفهان چقدر بود؟',
        ],
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
        text: 'هزینه‌ی راه‌اندازی تولید جانشین ترابانت (P603) حدود چقدر برآورد شد؟',
        options: [
          '۷٫۷ میلیارد مارک آلمان شرقی',
          '۱۱ میلیارد مارک',
          '۷۷۰ میلیون مارک',
          'یک میلیارد مارک',
        ],
      },
      {
        id: 'q2',
        text: 'در دهه‌ی ۱۹۸۰ زمان انتظار برای خرید ترابانت و خودروهای مشابه حدود چند سال بود؟',
        options: [
          '۳ سال',
          '۱۵ سال',
          '۵ سال',
          '۲۵ سال',
        ],
      },
      {
        id: 'q3',
        text: 'این داستان دو دام را نشان می‌دهد؛ کدام‌ها؟',
        options: [
          'ایگو و ریسک',
          'هویت و حافظه',
          'قدرت و زمان',
          'اخلاق و روایت',
        ],
      },
      {
        id: 'q4',
        text: 'کدام جمله‌ی تکراری تصمیم‌ها را به آینده منتقل می‌کرد؟',
        options: [
          '«فعلاً نه»',
          '«بعداً می‌بینیم»',
          '«همین خوب است»',
          '«باید بپرسیم»',
        ],
      },
    ],
  },
  {
    id: 's5',
    title: 'تایتان و پالو آلتو',
    subtitle: 'دو صوت: تایتان و ترانوس (پالو آلتو)',
    fastMinutes: 40,
    groups: [
      { id: 'titan', title: 'تایتان', base: 80, bonus: 0, items: [{ key: 'audio', ref: { source: 'story', id: 'titan' } }] },
      { id: 'paloalto', title: 'پالو آلتو', base: 80, bonus: 0, items: [{ key: 'audio', ref: { source: 'story', id: 'paloalto' } }] },
    ],
    quiz: [
      {
        id: 'q1',
        text: 'تایتان پیش از حادثه چند بار با موفقیت به عمق تایتانیک رسیده بود؟',
        options: [
          '۳ بار',
          '۸ بار',
          '۱۳ بار',
          '۸۰ بار',
        ],
      },
      {
        id: 'q2',
        text: 'در شیرجه‌ی شماره‌ی ۸۰ (ژوئیه‌ی ۲۰۲۲) چه شد؟',
        options: [
          'موتور خاموش شد',
          'صدای بلندی شنیده شد و داده‌ها تغییر در سازه را نشان داد، اما عملیات متوقف نشد',
          'کشتی را پیدا نکردند',
          'نشت آب شروع شد',
        ],
      },
      {
        id: 'q3',
        text: 'ترانوس چه وعده‌ای داده بود؟',
        options: [
          'خودروی برقی ارزان',
          'آزمایش خون با چند قطره خون؛ سریع‌تر، ساده‌تر و ارزان‌تر',
          'واکسن همگانی',
          'بیمه‌ی درمانی',
        ],
      },
      {
        id: 'q4',
        text: 'لنزهای اصلی داستان ترانوس کدام‌اند؟',
        options: [
          'اخلاق، روایت و روابط',
          'زمان، قدرت و ریسک',
          'حافظه، هیجان و هویت',
          'ایگو، ریسک و هویت',
        ],
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
        text: '«سیزده سال فاصله» میان کدام دو رویداد است؟',
        options: [
          'گلناباد تا تسلیم اصفهان',
          'از دست رفتن قندهار (۱۷۰۹) تا سقوط اصفهان (۱۷۲۲)',
          'رسیدن به کرمان تا گلناباد',
          'آغاز محاصره تا قحطی',
        ],
      },
      {
        id: 'q2',
        text: 'سؤال لنز «قدرت» (Power) در این داستان کدام است؟',
        options: [
          'چند بار می‌توانیم مسئله را به فردا منتقل کنیم؟',
          'کدام صدا به مرکز تصمیم می‌رسد و کدام صدا پیش از رسیدن خاموش می‌شود؟',
          'آیا شواهد خطر، برداشت سیستم را تغییر داد؟',
          'اگر روایت را کنار بگذارم چه می‌ماند؟',
        ],
      },
      {
        id: 'q3',
        text: '«چند بار می‌توانیم یک مسئله را به فردا منتقل کنیم؟» سؤال کدام لنز است؟',
        options: [
          'قدرت',
          'زمان',
          'ریسک',
          'روایت',
        ],
      },
      {
        id: 'q4',
        text: 'مشورت با منجمان و باور به مصونیت سربازان، نمونه‌ی کدام لنز است؟',
        options: [
          'هویت',
          'حافظه',
          'روایت',
          'اخلاق',
        ],
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
