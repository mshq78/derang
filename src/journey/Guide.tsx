import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { BADGES, CONFIRM_SHARE, POINTS, SPEED_MAX, STAGES } from '../data/journey';
import { useBackLayer } from '../hooks/useBackLayer';
import { toPersianDigits } from '../utils/helpers';

const fa = toPersianDigits;

/** The most a person can earn from the stages (without badges) and from badges. */
function maxima() {
  let stages = 0;
  let questions = 0;
  for (const s of STAGES) {
    for (const g of s.groups) stages += g.base + g.bonus;
    for (const sp of s.special ?? []) stages += POINTS[sp];
    questions += s.quiz.length;
  }
  const badges = Object.values(BADGES).reduce((sum, b) => sum + b.points, 0);
  return { stages, questions, quiz: questions * POINTS.quiz, badges, speed: STAGES.length * SPEED_MAX };
}

const Section: React.FC<{ n: string; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <section className="space-y-2 rounded-2xl border border-line bg-surface p-4">
    <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-surface">{n}</span>
      {title}
    </h3>
    <div className="space-y-2 text-[13px] leading-7 text-ink-2">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <li className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-0">
    <span>{label}</span>
    <span className="flex-shrink-0 font-extrabold text-primary">{value}</span>
  </li>
);

/** The rules, the points and a short how-to, written for people who have nobody next to them to ask. */
export const GuideContent: React.FC = () => {
  const m = maxima();
  const media = STAGES[1].groups[0].base;
  const both = STAGES[2].groups[0].bonus;
  const confirm = Math.round(media * CONFIRM_SHARE);
  const bd = (id: string) => BADGES[id].points;
  return (
    <div className="space-y-3">
      <Section n="۱" title="سفر چطور پیش می‌رود؟">
        <p>مسیر اصفهان تا بابلسر {fa(STAGES.length)} مرحله دارد. مرحله‌ها یکی‌یکی از طرف برگزارکننده باز می‌شوند. وقتی مرحله‌ای باز شود، همین‌جا خبرش را می‌بینید.</p>
        <p>مرحله‌ها تا پایان سفر باز می‌مانند. لازم نیست عجله کنید و هر وقت سیگنال و فرصت داشتید می‌توانید انجامشان دهید.</p>
      </Section>

      <Section n="۲" title="در هر مرحله چه کنم؟">
        <p>روی «کار حالا» در صفحه‌ی اصلی بزنید. در هر مرحله معمولاً این‌ها را می‌بینید:</p>
        <ul className="list-disc space-y-1 pr-5">
          <li><b className="text-ink">صوت یا ویدیو:</b> تا آخر پخش کنید. اگر صدا یا ویدیو پخش نشد، «نسخه‌ی متنی» را بخوانید؛ همان حساب می‌شود.</li>
          <li><b className="text-ink">سؤال‌ها:</b> بعد از دیدن یا شنیدن، چند سؤال کوتاه می‌بینید. اولین پاسخ ثبت می‌شود و فوراً توضیح پاسخ درست را می‌بینید.</li>
          <li><b className="text-ink">مرحله‌ی اول:</b> معرفی درنگ، تست شخصیت (به سایت تست بروید، تست را انجام دهید، برگردید و نتیجه را ثبت کنید) و دیدن پنج کارت از روی و پشت.</li>
        </ul>
        <p>برای مسیرهایی که اینترنت ضعیف است، در صفحه‌ی اصلی «ذخیره برای مسیر» را بزنید تا صوت‌ها روی گوشی ذخیره شوند. اگر اینترنت قطع شد، کارهایی که انجام داده‌اید نگه داشته می‌شوند و بعداً خودکار ثبت می‌شوند.</p>
      </Section>

      <Section n="۳" title="امتیازها چطور حساب می‌شود؟">
        <ul>
          <Row label="معرفی درنگ، تست شخصیت، دیدن پنج کارت (هرکدام)" value={`${fa(POINTS.test)} امتیاز`} />
          <Row label="شنیدن صوت یا دیدن ویدیوی هر بخش" value={`${fa(media)} امتیاز`} />
          <Row label="انجام هر دو، صوت و ویدیو (مرحله‌های ۳ تا ۵)" value={`+${fa(both)} امتیاز`} />
          <Row label="هر پاسخ درست به سؤال‌ها" value={`${fa(POINTS.quiz)} امتیاز`} />
          <Row label="پاسخ غلط" value="بدون کسر امتیاز" />
          <Row label={`امتیاز سرعت در هر مرحله (برای زودتر تمام‌کننده‌ها)`} value={`تا ${fa(SPEED_MAX)} امتیاز`} />
        </ul>
        <p><b className="text-ink">امتیاز سرعت:</b> در هر مرحله، کسی که همه‌ی کارهای آن مرحله را انجام دهد و به همه‌ی سؤال‌هایش جواب بدهد در یک صف قرار می‌گیرد. نفر اول {fa(SPEED_MAX)} امتیاز می‌گیرد، نفر دوم {fa(SPEED_MAX - 1)}، نفر سوم {fa(SPEED_MAX - 2)} و همین‌طور یکی یکی کمتر، تا نفر {fa(SPEED_MAX)}ام که ۱ امتیاز می‌گیرد؛ بعد از آن صفر است. جای شما در صف فقط به کسانی بستگی دارد که زودتر از شما تمام کرده‌اند. این امتیاز را فقط کسی می‌گیرد که کارها را با دیدن، شنیدن یا خواندن انجام داده باشد، نه با دکمه‌ی «انجام دادم».</p>
        <p>سؤال‌ها بیشترین سهم را دارند: بعد از دیدن یا شنیدن محتوا، پاسخ درست امتیاز مرحله را بالا می‌برد. امتیاز سؤال‌های هر مرحله وقتی حساب می‌شود که کارهای بالای همان مرحله را هم انجام داده باشید.</p>
        <p>دکمه‌ی بزرگ «من این مرحله را انجام دادم» فقط برای وقتی است که صوت و ویدیو و متن هیچ‌کدام کار نکرد. با آن فقط {fa(Math.round(CONFIRM_SHARE * 100))} درصد امتیاز آن بخش ({fa(confirm)} امتیاز) ثبت می‌شود، پس بی‌دلیل سراغش نروید.</p>
        <p>پشت‌سرهم زدن دکمه‌ها بدون دیدن و شنیدن، امتیاز چندانی نمی‌دهد. مهم‌ترین چیز، دیدن محتوا و جواب درست به سؤال‌هاست.</p>
      </Section>

      <Section n="۴" title="نشان‌ها هم امتیاز دارند">
        <ul>
          <Row label="«تا ایستگاه آخر»: انجام همه‌ی مرحله‌ها" value={`+${fa(bd('finisher'))}`} />
          <Row label="«بی‌غلط»: همه‌ی سؤال‌های یک مرحله درست" value={`+${fa(bd('perfect:s2'))}`} />
          <Row label="«اولین‌ها»: کامل کردن مرحله در مهلت ویژه‌ی آن" value={`+${fa(bd('fast:s2'))}`} />
          <Row label="«هر دو روایت»: انجام هم صوت و هم ویدیو" value={`+${fa(bd('both:s3'))}`} />
        </ul>
        <p>نشان‌هایی که گرفته‌اید و امتیازشان را در پایین صفحه‌ی اصلی، بخش «نشان‌های شما» می‌بینید.</p>
      </Section>

      <Section n="۵" title="جدول امتیاز و جایزه">
        <p>در صفحه‌ی اصلی، «جدول امتیاز» ده نفر برتر را با نام نشان می‌دهد و جایگاه خودتان را هم می‌بینید.</p>
        <p>اگر باز هم امتیاز دو نفر برابر شود، اول کسی که پاسخ‌های درست بیشتری دارد و بعد کسی که زودتر همه‌ی کارهایش را تمام کرده بالاتر می‌آید. پس برای جایزه، همیشه یک نفر اول و یک نفر دوم مشخص است.</p>
        <p>مجموع امتیاز همه‌ی کارها و سؤال‌ها حدود {fa(m.stages + m.quiz)} است. امتیاز سرعت تا {fa(m.speed)} و نشان‌ها تا {fa(m.badges)} امتیاز دیگر اضافه می‌کنند. برای جایزه‌ها و جمع‌بندی نهایی، برگزارکننده امتیازها را بررسی می‌کند و ممکن است بعد از افتتاحیه‌ی حضوری یک مرحله‌ی ویژه هم برای انتخاب نفرات برتر اضافه شود.</p>
      </Section>

      <Section n="۶" title="اگر چیزی درست کار نکرد">
        <ul className="list-disc space-y-1 pr-5">
          <li>اگر نوار «اتصال ضعیف» دیدید، نگران نباشید؛ آخرین وضعیت نمایش داده می‌شود و کارهایتان بعداً ثبت می‌شوند.</li>
          <li>دکمه‌ی «بازگشت» گوشی شما را به صفحه‌ی قبلی برمی‌گرداند.</li>
          <li>با دکمه‌ی «راهنما» در بالای صفحه می‌توانید این توضیحات را دوباره بخوانید.</li>
        </ul>
      </Section>
    </div>
  );
};

/** The guide as a full-screen layer opened from the header. */
export const GuideSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useBackLayer(true, onClose);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label="راهنما و قوانین" className="fixed inset-0 z-[55] overflow-y-auto bg-canvas text-right">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <p className="text-sm font-extrabold text-ink">راهنما و قوانین سفر</p>
        <button type="button" onClick={onClose} aria-label="بستن" className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-auto max-w-lg space-y-3 px-4 py-5">
        <GuideContent />
        <button type="button" onClick={onClose} className="w-full rounded-2xl bg-primary py-3 text-sm font-extrabold text-surface">متوجه شدم</button>
      </div>
    </div>
  );
};
