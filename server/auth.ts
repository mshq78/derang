import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDb } from './db.js';
import { ApiError, badRequest } from './http.js';

const SESSION_HOURS = 12;
const MAX_FAILED_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MINUTES = 15;

const sha256 = (value: string) => createHash('sha256').update(value).digest();
const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

/** Constant-time string comparison (hashing first makes the lengths equal). */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
  return forwarded.split(',')[0].trim() || 'unknown';
}

const unauthorized = () =>
  new ApiError(401, 'unauthorized', 'نشست شما منقضی شده است؛ دوباره وارد شوید.');

export interface AdminSession {
  username: string;
}

export async function login(request: Request, body: unknown) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    throw new ApiError(500, 'config', 'نام کاربری و رمز مدیر روی سرور تنظیم نشده است.');
  }

  const { username, password } = (body ?? {}) as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    throw badRequest('نام کاربری و رمز عبور را وارد کنید.');
  }

  const db = getDb();
  const ip = clientIp(request);
  const [recent] = await db.query(
    `SELECT COUNT(*)::int AS n FROM login_attempts
     WHERE ip = $1 AND attempted_at > now() - make_interval(mins => $2)`,
    [ip, ATTEMPT_WINDOW_MINUTES]
  );
  if (Number(recent?.n) >= MAX_FAILED_ATTEMPTS) {
    throw new ApiError(
      429,
      'too_many_attempts',
      `تعداد تلاش‌های ناموفق زیاد است. ${ATTEMPT_WINDOW_MINUTES} دقیقه دیگر دوباره امتحان کنید.`
    );
  }

  // Evaluate both comparisons so the response time does not reveal which one failed.
  const userOk = safeEqual(username, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  if (!userOk || !passOk) {
    await db.query('INSERT INTO login_attempts (ip) VALUES ($1)', [ip]);
    throw new ApiError(401, 'invalid_credentials', 'نام کاربری یا رمز عبور نادرست است.');
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  await db.transaction([
    {
      text: 'INSERT INTO admin_sessions (token_hash, username, expires_at) VALUES ($1, $2, $3)',
      params: [sha256Hex(token), expectedUser, expiresAt.toISOString()],
    },
    { text: 'DELETE FROM login_attempts WHERE ip = $1 OR attempted_at < now() - interval \'1 day\'', params: [ip] },
    { text: 'DELETE FROM admin_sessions WHERE expires_at < now()' },
  ]);

  return { token, expiresAt: expiresAt.toISOString(), admin: { username: expectedUser } };
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

export async function requireAdmin(request: Request): Promise<AdminSession> {
  const token = bearerToken(request);
  if (!token) throw unauthorized();
  const [row] = await getDb().query(
    'SELECT username FROM admin_sessions WHERE token_hash = $1 AND expires_at > now()',
    [sha256Hex(token)]
  );
  if (!row) throw unauthorized();
  return { username: row.username as string };
}

export async function logout(request: Request): Promise<void> {
  const token = bearerToken(request);
  if (token) {
    await getDb().query('DELETE FROM admin_sessions WHERE token_hash = $1', [sha256Hex(token)]);
  }
}
