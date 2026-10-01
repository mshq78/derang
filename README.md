# سامانه تصمیم‌گیری هوشیار «درنگ» (Derang)
**محصولی از پردیس نوآوری گِرا (Gera Innovation Campus)**

«درنگ» یک سامانه پیشرفته، مستقل و تعاملی برای سنجش، بازبینی و تصمیم‌گیری هوشیارانه بر پایه مدل علمی **PERIMETERS**، ابزارهای در لحظه **SONIC** و مفاهیم کتاب *Tune In* اثر نوالا والش است. این برنامه به رهبران، مدیران و تصمیم‌گیرندگان کمک می‌کند تا پیش از هر اقدام بزرگ، نقاط کور، خطاهای شناختی و تله‌های همرنگی گروهی را شناسایی و مهار کنند.

---

## قابلیت‌های کلیدی

1. **میز کار و مسیر یادگیری ۷ گانه:** کالبدشکافی دام‌های تصمیم‌گیری، شایستگی‌های رهبری هوشیار، ابزارهای SONIC، الگوهای شخصیتی (داوینچی، لینکلن، ادیسون، چرچیل، اینشتین) و عبرت‌های زنده (تایتان، اصفهان، ترابانت، پالو آلتو).
2. **پرونده‌های تصمیم‌گیری و چک‌لیست پویا:** ایجاد پرونده برای تصمیم‌های واقعی، پاسخ به پرسش‌های ارزیابی همراه با راهنما و تمرین ۶۰ ثانیه‌ای، ثبت یادداشت و صدور شناسنامه تصمیم با قابلیت چاپ استاندارد / ذخیره PDF.
3. **کتابخانه جامع چندرسانه‌ای:** جستجوی فوری در میان روایت‌های صوتی، ویدئوی تحلیلی شاه سلطان حسین، پرسش‌های کتاب و چالش‌های تعاملی.
4. **شخصی‌سازی و دسترسی‌پذیری:** پشتیبانی کامل از حالت شب (Dark Mode)، کنتراست بالا (High Contrast)، کاهش حرکت (Reduce Motion)، کنترل اندازه قلم، و افکت‌های صوتی.
5. **پنل مدیریت محتوای جامع (Admin CMS):** امکان ویرایش تمامی متون، ایستگاه‌ها، سوالات، روایت‌ها، و تنظیمات سایت با ایزولاسیون کامل در حالت پیش‌نمایش محلی (Sandbox).

---

## نحوه نصب و راه‌اندازی (Frontend)

```bash
# نصب وابستگی‌ها
npm install

# اجرای سرور توسعه محلی
npm run dev

# بررسی سلامت کد و تایپ‌ها
npm run lint

# ساخت نسخه نهایی
npm run build
```

---

## متغیرهای محیطی (Environment Variables)

در فایل `.env` یا متغیرهای محیطی سیستم، می‌توانید آدرس پایه سرور را مشخص نمایید:

```env
VITE_API_BASE_URL=https://your-api-server.com
```

*نکته مهم:* در محیط تولید (Production)، خالی بودن `VITE_API_BASE_URL` به معنای فراخوانی نسبی مسیرهای `/api/...` روی همان دامنه اصلی سایت است. در صورت عدم دسترسی به شبکه، اپلیکیشن عمومی از حافظه کش محلی یا داده‌های پیش‌فرض بارگذاری می‌شود.

---

## پنل مدیریت محتوا (`/admin`)

- دسترسی به پنل مدیریت صرفاً از طریق آدرس مستقیم `/admin` امکان‌پذیر است.
- در محیط توسعه (`DEV`)، دکمه «حالت پیش‌نمایش» امکان ورود به محیط Sandbox بدون رمز عبور را فراهم می‌کند.
- در محیط تولید (`Production`)، ورود به پنل صرفاً با احراز هویت از طریق `POST /api/admin/login` انجام می‌پذیرد و در صورت بروز خطا در ذخیره‌سازی، پیام خطا نمایش داده شده و تغییرات فیک در کلاینت اعمال نمی‌شوند.
- در زمان لود بودن صفحه پنل مدیریت، تگ `<meta name="robots" content="noindex,nofollow">` در هدر سند اعمال می‌شود.

---

## قرارداد ارتباط با سرور (Backend Contract)

بک‌اند در همین مخزن است و روی Vercel Functions اجرا می‌شود؛ داده‌ها در Postgres (Neon) و فایل‌ها در Vercel Blob ذخیره می‌شوند.

- `api/index.ts`: تنها تابع سرور. `vercel.json` همه درخواست‌های `/api/...` را به آن می‌فرستد.
- `server/router.ts`: مسیریابی اندپوینت‌ها.
- `server/schema.ts`: ساخت خودکار جدول‌ها در اولین درخواست و پرکردن دیتابیس خالی با `src/data/defaultContent.ts`. هیچ مرحله دستی لازم نیست.
- `server/content.ts`: خواندن و نوشتن محتوا. هر تغییر، `version` محتوا را عوض می‌کند تا کش کاربران به‌روز شود.
- `server/validate.ts`: اعتبارسنجی همه ورودی‌ها (فیلدها، طول متن، نشانی‌های http/https، شناسه‌ها).
- `server/auth.ts`: ورود مدیر، نشست ۱۲ ساعته (فقط هش توکن در دیتابیس ذخیره می‌شود) و قفل موقت پس از ۱۰ تلاش ناموفق در ۱۵ دقیقه.
- `server/upload.ts`: صدور توکن کوتاه‌مدت بارگذاری. فایل مستقیم از مرورگر به Vercel Blob می‌رود (بدنه توابع Vercel به ۴٫۵ مگابایت محدود است). سقف حجم: تصویر ۵، صوت ۵۰ و ویدئو ۲۰۰ مگابایت.

## ورود و ثبت‌نام با شماره موبایل (کد یک‌بارمصرف پیامکی)

- **روشن/خاموش:** پنل مدیریت ← تنظیمات عمومی ← «ورود و ثبت‌نام با شماره موبایل». به‌صورت پیش‌فرض **خاموش** است و سایت مثل قبل فقط نام را می‌پرسد. وقتی روشن شود، کاربر باید شماره‌اش را با کد پیامکی تأیید کند. روشن کردن فقط وقتی ممکن است که سامانه پیامکی روی سرور وصل باشد، و سایت فقط وقتی ورود می‌خواهد که همان سرور بتواند پیامک بفرستد.
- **جریان:** شماره ← کد ۶ رقمی (اعتبار ۳ دقیقه، ارسال دوباره بعد از ۶۰ ثانیه) ← اگر شماره تازه است، نام ← ورود. نشست در یک کوکی HttpOnly به مدت ۳۰ روز می‌ماند.
- **امنیت:** کد فقط به‌صورت HMAC ذخیره می‌شود؛ هر کد ۵ بار قابل امتحان است؛ حداکثر ۵ کد در ساعت برای هر شماره و `SMS_PER_IP_HOURLY` در ساعت برای هر آدرس شبکه و `SMS_DAILY_LIMIT` در روز در کل (سقف هزینه پیامک). درخواست‌های بین‌سایتی رد می‌شوند.
- **داده‌ها:** شماره و نام در جدول `users` ذخیره می‌شود. پرونده‌های تصمیم و پیشرفت یادگیری هنوز روی همان دستگاه می‌ماند، به‌تفکیک هر حساب.

### اتصال سامانه پیامکی (`SMS_PROVIDER`)

| مقدار | متغیرهای لازم |
| --- | --- |
| `kavenegar` | `KAVENEGAR_API_KEY`، `KAVENEGAR_TEMPLATE` (قالب verify) |
| `ippanel` | `IPPANEL_API_KEY`، `IPPANEL_PATTERN_CODE` (الگوی تأییدشده)، `IPPANEL_ORIGINATOR` (خط ارسال)، اختیاری `IPPANEL_PARAM_NAME` (پیش‌فرض `verification-code`) |
| `smsir` | `SMSIR_API_KEY`، `SMSIR_TEMPLATE_ID`، اختیاری `SMSIR_PARAM_NAME` (پیش‌فرض `Code`) |
| `custom` | `SMS_HTTP_URL` و معمولاً `SMS_HTTP_BODY`؛ برای هر سامانه‌ای با API وب (متغیرهای دیگر در `.env.example`) |
| `console` | فقط برای آزمایش روی نسخه‌های پیش‌نمایش؛ کد در لاگ سرور چاپ می‌شود و روی سایت اصلی رد می‌شود |

بعد از وصل کردن، در همان کارت پنل مدیریت با «ارسال پیامک آزمایشی» اتصال را امتحان کنید. همچنین `OTP_SECRET` (رشته تصادفی ۳۲+ نویسه‌ای) لازم است.

### متغیرهای محیطی سرور (در تنظیمات پروژه Vercel)

| متغیر | توضیح |
| --- | --- |
| `DATABASE_URL` | اتصال Neon (یکپارچگی Neon در Vercel خودش تنظیم می‌کند) |
| `BLOB_READ_WRITE_TOKEN` | توکن Vercel Blob برای بارگذاری فایل |
| `ADMIN_USERNAME` | نام کاربری پنل مدیریت |
| `OTP_SECRET` | کلید هش کدهای پیامکی (ورود با موبایل) |
| `ADMIN_PASSWORD` | رمز پنل مدیریت؛ برای تغییر رمز فقط همین متغیر را عوض کنید و دوباره Deploy کنید |

قرارداد اندپوینت‌ها (مطابق با پیاده‌سازی در `src/lib/api.ts` و `server/router.ts`):

### اندپوینت‌های عمومی (Public)
- **`GET /api/content`**
  - بدون نیاز به توکن احراز هویت
  - خروجی: `ContentBundle` (شامل موارد منتشرشده و مرتب‌شده)
  - ۱۵ ثانیه در CDN کش می‌شود؛ تغییرات پنل حداکثر پس از چند ثانیه روی سایت دیده می‌شوند.

### اندپوینت‌های کاربران (ورود با موبایل)
نشست در کوکی HttpOnly است و فقط روی دامنه خود سایت کار می‌کند (`VITE_API_BASE_URL` باید خالی باشد).

- **`POST /api/auth/request-code`** بدنه `{ "phone": "09123456789" }` ← `{ ok, expiresInSeconds, resendAfterSeconds }`؛ خطای `429` با `retryAfter`.
- **`POST /api/auth/verify-code`** بدنه `{ phone, code }` ← `{ user }` و کوکی نشست. اگر شماره تازه باشد حساب ساخته می‌شود (نام خالی).
- **`GET /api/auth/me`** ← `{ user }` یا `401`.
- **`PUT /api/auth/profile`** بدنه `{ firstName, lastName }` ← `{ user }`.
- **`POST /api/auth/logout`** ← `204` و پاک شدن کوکی.

### اندپوینت‌های مدیریت (Admin)
تمامی اندپوینت‌های مدیریت نیازمند هدر `Authorization: Bearer <token>` هستند (به جز لاگین):

- **`POST /api/admin/login`**
  - بدنه درخواست: `{ "username": "string", "password": "string" }`
  - خروجی: `{ "token": "string", "expiresAt": "string", "admin": { "username": "string" } }`
- **`GET /api/admin/me`**
  - خروجی: `{ "admin": { "username": "string" } }`
- **`POST /api/admin/logout`**
  - خروجی: وضعیت `204 No Content`
- **`GET /api/admin/content`**
  - خروجی: `ContentBundle` شامل تمام موارد (حتی پیش‌نویس و منتشرنشده)
- **`PUT /api/admin/site`**
  - بدنه درخواست: `SiteSettings` (شیء کامل تنظیمات)
  - خروجی: `SiteSettings`
- **`POST /api/admin/collections/:collection`**
  - نام مجموعه‌ها: `stations`, `questions`, `perimeters`, `skills`, `sonic`, `people`, `audioStories`, `videos`, `bookQA`, `challenges`, `help`, `tour`, `learningSteps`
  - بدنه درخواست: اطلاعات مورد جدید (فیلد `id` اختیاری)
  - خروجی: وضعیت `201 Created` با شیء مورد ایجادشده
- **`PUT /api/admin/collections/:collection/:id`**
  - بدنه درخواست: شیء کامل مورد به‌روزرسانی‌شده
  - خروجی: شیء به‌روز شده
- **`DELETE /api/admin/collections/:collection/:id`**
  - خروجی: وضعیت `204 No Content`
- **`POST /api/admin/collections/:collection/reorder`**
  - بدنه درخواست: `{ "ids": ["id1", "id2", ...] }`
  - خروجی: `{ "items": [...] }`
- **`POST /api/admin/blob-upload`**
  - توسط `upload()` از `@vercel/blob/client` فراخوانی می‌شود و فقط توکن بارگذاری صادر می‌کند؛ مسیر فایل با نوع آن شروع می‌شود (`image/...`، `audio/...`، `video/...`).
- **`GET /api/admin/export`**
  - خروجی: `ContentBundle` کامل (پشتیبان)
- **`GET /api/admin/sms-config`** ← `{ provider, configured, missing }`
- **`POST /api/admin/sms-test`** بدنه `{ "phone": "09123456789" }`: ارسال پیامک آزمایشی
- **`POST /api/admin/import`**
  - بدنه درخواست: `ContentBundle`
  - خروجی: `{ "ok": true }`

فرمت بازگشت خطای سرور: `{ "error": { "code": "string", "message": "string" } }` که متن `message` مستقیماً به کاربر مدیر نمایش داده می‌شود.



## Management panel (`/admin`)

A sidebar console with a dashboard, every content collection, site members, panel accounts with roles,
site settings and an activity log.

- **Owner account:** `ADMIN_USERNAME` / `ADMIN_PASSWORD` (always works, full access).
- **Panel accounts** (Admins and roles page): `admin` (everything), `editor` (content only), `support`
  (site members only), `viewer` (read-only). Permissions are enforced on the server.
- **Site members:** created one by one or imported from an Excel/CSV file (mobile number = user name, any
  column, e.g. a personnel code, = password). They sign in with mobile + password when
  «ورود با نام کاربری و رمز عبور» is switched on in Settings. Passwords are stored as scrypt hashes.
- **Activity log:** sign-ins to the panel and every change to content, settings, members and panel accounts.
- API: `/api/admin/{me,dashboard,users,users/import,staff,audit}` plus the existing content endpoints.
