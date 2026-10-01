import { createHash, createHmac, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { normalizeIranMobile, toLatinDigits } from '../src/utils/phone.js';
import { getDb } from './db.js';
import { ApiError, badRequest, json, noContent } from './http.js';
import { sendOtpSms, smsFailure, smsStatus } from './sms.js';

/**
 * Phone-number sign-in for site visitors: a one-time code is sent by SMS,
 * and a correct code creates the account (first time) or signs in. The
 * session is an HttpOnly cookie; only a hash of its token is stored.
 */

const CODE_DIGITS = 6;
const CODE_TTL_SECONDS = 180;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_CODES_PER_PHONE_PER_HOUR = 5;
// Many people can share one address (a classroom's Wi-Fi, a mobile carrier), so this is generous;
// the daily total below is what caps the SMS bill.
const ipHourlyLimit = () => Math.max(1, Number(process.env.SMS_PER_IP_HOURLY) || 60);
const MAX_VERIFY_ATTEMPTS = 5;
const SESSION_DAYS = 30;
const COOKIE_NAME = 'derang_session';

const dailyLimit = () => Math.max(1, Number(process.env.SMS_DAILY_LIMIT) || 1000);

export interface PublicUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
}

const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

function otpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret.length < 32) {
    throw new ApiError(500, 'config', 'کلید امنیتی OTP_SECRET روی سرور تنظیم نشده است (حداقل ۳۲ نویسه).');
  }
  return secret;
}

/** The code is bound to the phone, so a code for one number is useless for another. */
function hashCode(phone: string, code: string): string {
  return createHmac('sha256', otpSecret()).update(`${phone}:${code}`).digest('hex');
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
  return forwarded.split(',')[0].trim() || 'unknown';
}

/** Rejects cross-site browser requests; a missing Origin (curl, server-side) is allowed. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    // fall through to the rejection below
  }
  if (originHost !== host) throw new ApiError(403, 'forbidden_origin', 'درخواست از مبدأ نامعتبر ارسال شد.');
}

// ---------------------------------------------------------------------------
// Password sign-in for accounts the admin created in advance (username = mobile number)
// ---------------------------------------------------------------------------

const scryptAsync = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, 32, (err, key) => (err ? reject(err) : resolve(key)))
  );

/** Stored as s1$<salt>$<hash> (scrypt, base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `s1$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

async function checkPassword(password: string, stored: string | null): Promise<boolean> {
  const [version, saltPart, hashPart] = (stored ?? '').split('$');
  const salt = Buffer.from(saltPart || 'x', 'base64url');
  const expected = Buffer.from(hashPart || '', 'base64url');
  const key = await scryptAsync(password, salt); // runs even for unknown users, to keep timing alike
  return version === 's1' && expected.length === key.length && timingSafeEqual(expected, key);
}

const PASSWORD_WINDOW = "interval '15 minutes'";
const MAX_FAILS_PER_ACCOUNT = 8;
// One office or classroom shares an address, so the per-address cap is wide.
const MAX_FAILS_PER_IP = 300;

export async function passwordLogin(request: Request, body: unknown): Promise<Response> {
  const { username, password: passwordInput } = (body ?? {}) as { username?: unknown; password?: unknown };
  const phone = typeof username === 'string' ? normalizeIranMobile(username) : null;
  const password = typeof passwordInput === 'string' ? toLatinDigits(passwordInput).trim() : '';
  const wrong = () => new ApiError(401, 'invalid_credentials', 'نام کاربری یا رمز عبور درست نیست.');
  if (!phone || !password || password.length > 128) throw wrong();

  const db = getDb();
  const ip = clientIp(request);
  const keys = [`pw:${phone}`, `pwip:${ip}`];
  const [counts] = await db.query(
    `SELECT count(*) FILTER (WHERE ip = $1)::int AS account, count(*) FILTER (WHERE ip = $2)::int AS ip
     FROM login_attempts WHERE ip = ANY($3) AND attempted_at > now() - ${PASSWORD_WINDOW}`,
    [keys[0], keys[1], keys]
  );
  if (Number(counts?.account) >= MAX_FAILS_PER_ACCOUNT || Number(counts?.ip) >= MAX_FAILS_PER_IP) {
    throw new ApiError(429, 'too_many_attempts', 'تلاش‌های ناموفق زیاد بود. چند دقیقه بعد دوباره امتحان کنید.');
  }

  const [row] = await db.query(
    'SELECT id, phone, first_name, last_name, password_hash FROM users WHERE phone = $1',
    [phone]
  );
  const ok = await checkPassword(password, (row?.password_hash as string | null) ?? null);
  if (!row || !ok) {
    await db.query('INSERT INTO login_attempts (ip) VALUES ($1), ($2)', keys);
    throw wrong();
  }

  await db.query('DELETE FROM login_attempts WHERE ip = $1', [keys[0]]);
  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [row.id]);
  const user = toPublicUser(row);
  const token = randomBytes(32).toString('base64url');
  await db.query(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [sha256Hex(token), user.id, SESSION_DAYS]
  );
  await db.query(`DELETE FROM user_sessions WHERE expires_at < now()`);
  return json({ user }, 200, 'no-store', {
    'Set-Cookie': cookieHeader(request, token, SESSION_DAYS * 24 * 3600),
  });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=') || null;
  }
  return null;
}

function cookieHeader(request: Request, value: string, maxAgeSeconds: number): string {
  const proto = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '');
  const parts = [`${COOKIE_NAME}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (proto === 'https') parts.push('Secure');
  return parts.join('; ');
}

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id: row.id as string,
    phone: row.phone as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
  };
}

// ---------------------------------------------------------------------------
// Request a code
// ---------------------------------------------------------------------------

export async function requestCode(request: Request, body: unknown): Promise<Response> {
  const input = (body as { phone?: unknown } | null)?.phone;
  const phone = typeof input === 'string' ? normalizeIranMobile(input) : null;
  if (!phone) throw badRequest('شماره موبایل معتبر نیست؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.', 'invalid_phone');

  const status = smsStatus();
  if (!status.configured) {
    throw new ApiError(503, 'sms_unavailable', 'ورود با پیامک هنوز راه‌اندازی نشده است.');
  }

  const db = getDb();
  const ip = clientIp(request);
  const code = String(randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, '0');
  const id = randomUUID();

  // One atomic statement checks every limit and inserts only if all pass.
  const inserted = await db.query(
    `INSERT INTO otp_codes (id, phone, code_hash, ip, expires_at)
     SELECT $1, $2, $3, $4, now() + make_interval(secs => $5)
     WHERE NOT EXISTS (
             SELECT 1 FROM otp_codes
             WHERE phone = $2 AND verified_at IS NULL AND created_at > now() - make_interval(secs => $6))
       AND (SELECT count(*) FROM otp_codes WHERE phone = $2 AND created_at > now() - interval '1 hour') < $7
       AND (SELECT count(*) FROM otp_codes WHERE ip = $4 AND created_at > now() - interval '1 hour') < $8
       AND (SELECT count(*) FROM otp_codes WHERE created_at > now() - interval '1 day') < $9
     RETURNING id`,
    [
      id,
      phone,
      hashCode(phone, code),
      ip,
      CODE_TTL_SECONDS,
      RESEND_COOLDOWN_SECONDS,
      MAX_CODES_PER_PHONE_PER_HOUR,
      ipHourlyLimit(),
      dailyLimit(),
    ]
  );

  if (inserted.length === 0) throw await explainRefusal(phone, ip);

  // Only the newest code may be used.
  await db.query(`UPDATE otp_codes SET consumed_at = now() WHERE phone = $1 AND id <> $2 AND consumed_at IS NULL`, [
    phone,
    id,
  ]);

  try {
    await sendOtpSms(phone, code);
  } catch (err) {
    // Do not make the visitor wait out the cooldown for a failure that was not theirs.
    await db.query('DELETE FROM otp_codes WHERE id = $1', [id]);
    throw smsFailure(err);
  }

  await db.query(`DELETE FROM otp_codes WHERE created_at < now() - interval '2 days'`);
  return json({ ok: true, expiresInSeconds: CODE_TTL_SECONDS, resendAfterSeconds: RESEND_COOLDOWN_SECONDS });
}

async function explainRefusal(phone: string, ip: string): Promise<ApiError> {
  const db = getDb();
  const [cooldown] = await db.query(
    `SELECT GREATEST(1, CEIL(EXTRACT(EPOCH FROM (created_at + make_interval(secs => $2) - now()))))::int AS wait
     FROM otp_codes WHERE phone = $1 AND verified_at IS NULL AND created_at > now() - make_interval(secs => $2)
     ORDER BY created_at DESC LIMIT 1`,
    [phone, RESEND_COOLDOWN_SECONDS]
  );
  if (cooldown) {
    const wait = Number(cooldown.wait);
    return new ApiError(429, 'cooldown', `برای ارسال دوباره کد، ${wait} ثانیه صبر کنید.`, wait);
  }
  const [counts] = await db.query(
    `SELECT (SELECT count(*) FROM otp_codes WHERE phone = $1 AND created_at > now() - interval '1 hour')::int AS by_phone,
            (SELECT count(*) FROM otp_codes WHERE ip = $2 AND created_at > now() - interval '1 hour')::int AS by_ip`,
    [phone, ip]
  );
  if (Number(counts?.by_phone) >= MAX_CODES_PER_PHONE_PER_HOUR || Number(counts?.by_ip) >= ipHourlyLimit()) {
    return new ApiError(429, 'too_many_requests', 'تعداد درخواست‌ها زیاد بود. حدود یک ساعت دیگر دوباره تلاش کنید.', 3600);
  }
  return new ApiError(503, 'sms_busy', 'سامانه پیامکی موقتاً در دسترس نیست. لطفاً بعداً تلاش کنید.', 600);
}

// ---------------------------------------------------------------------------
// Verify the code, sign in or register
// ---------------------------------------------------------------------------

const invalidCode = () => new ApiError(400, 'invalid_code', 'کد واردشده نادرست است یا منقضی شده است.');

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyCode(request: Request, body: unknown): Promise<Response> {
  const { phone: phoneInput, code: codeInput } = (body ?? {}) as { phone?: unknown; code?: unknown };
  const phone = typeof phoneInput === 'string' ? normalizeIranMobile(phoneInput) : null;
  const code = typeof codeInput === 'string' ? toLatinDigits(codeInput).replace(/\s/g, '') : '';
  if (!phone) throw badRequest('شماره موبایل معتبر نیست.', 'invalid_phone');
  if (!new RegExp(`^\\d{${CODE_DIGITS}}$`).test(code)) {
    throw badRequest(`کد باید ${CODE_DIGITS} رقم باشد.`, 'invalid_code');
  }

  const db = getDb();
  const [current] = await db.query(
    `SELECT id, code_hash FROM otp_codes
     WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );
  if (!current) throw invalidCode();

  // Count the attempt first, atomically, so parallel guesses cannot exceed the limit.
  const [attempt] = await db.query(
    `UPDATE otp_codes SET attempts = attempts + 1
     WHERE id = $1 AND consumed_at IS NULL AND attempts < $2 RETURNING attempts`,
    [current.id, MAX_VERIFY_ATTEMPTS]
  );
  if (!attempt) {
    throw new ApiError(429, 'too_many_attempts', 'تعداد تلاش‌های ناموفق زیاد بود. یک کد جدید دریافت کنید.');
  }

  if (!safeEqualHex(hashCode(phone, code), current.code_hash as string)) {
    if (Number(attempt.attempts) >= MAX_VERIFY_ATTEMPTS) {
      await db.query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1', [current.id]);
    }
    throw invalidCode();
  }

  // Single use: only one concurrent request can consume the code.
  const [consumed] = await db.query(
    'UPDATE otp_codes SET consumed_at = now(), verified_at = now() WHERE id = $1 AND consumed_at IS NULL RETURNING id',
    [current.id]
  );
  if (!consumed) throw invalidCode();

  const [row] = await db.query(
    `INSERT INTO users (id, phone, last_login_at) VALUES ($1, $2, now())
     ON CONFLICT (phone) DO UPDATE SET last_login_at = now()
     RETURNING id, phone, first_name, last_name`,
    [randomUUID(), phone]
  );
  const user = toPublicUser(row);

  const token = randomBytes(32).toString('base64url');
  await db.query(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [sha256Hex(token), user.id, SESSION_DAYS]
  );
  await db.query(`DELETE FROM user_sessions WHERE expires_at < now()`);

  return json({ user }, 200, 'no-store', {
    'Set-Cookie': cookieHeader(request, token, SESSION_DAYS * 24 * 3600),
  });
}

// ---------------------------------------------------------------------------
// Session, profile, logout
// ---------------------------------------------------------------------------

export async function currentUser(request: Request): Promise<PublicUser | null> {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return null;
  const [row] = await getDb().query(
    `SELECT u.id, u.phone, u.first_name, u.last_name
     FROM user_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256Hex(token)]
  );
  return row ? toPublicUser(row) : null;
}

export async function requireUser(request: Request): Promise<PublicUser> {
  const user = await currentUser(request);
  if (!user) throw new ApiError(401, 'unauthorized', 'برای ادامه وارد شوید.');
  return user;
}

const cleanName = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export async function updateProfile(request: Request, body: unknown): Promise<Response> {
  const user = await requireUser(request);
  const { firstName, lastName } = (body ?? {}) as { firstName?: unknown; lastName?: unknown };
  const first = cleanName(firstName, 40);
  const last = cleanName(lastName, 50);
  if (!first) throw badRequest('نام نمی‌تواند خالی باشد.', 'validation');

  const [row] = await getDb().query(
    `UPDATE users SET first_name = $2, last_name = $3 WHERE id = $1
     RETURNING id, phone, first_name, last_name`,
    [user.id, first, last]
  );
  return json({ user: toPublicUser(row) });
}

export async function logout(request: Request): Promise<Response> {
  const token = readCookie(request, COOKIE_NAME);
  if (token) await getDb().query('DELETE FROM user_sessions WHERE token_hash = $1', [sha256Hex(token)]);
  const response = noContent();
  response.headers.set('Set-Cookie', cookieHeader(request, '', 0));
  return response;
}
