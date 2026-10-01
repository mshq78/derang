import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDb } from './db.js';
import { ApiError, badRequest } from './http.js';
import { checkPassword } from './password.js';
import { Permission, Role, isRole, permissionsOf } from './permissions.js';

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
  role: Role;
  /** Set for accounts created in the panel; empty for the owner account from the environment variables. */
  staffId: string | null;
  displayName: string;
}

export const can = (session: AdminSession, permission: Permission): boolean =>
  permissionsOf(session.role).includes(permission);

/** Throws 403 unless the signed-in person's role includes the permission. */
export function require(session: AdminSession, permission: Permission): void {
  if (!can(session, permission)) {
    throw new ApiError(403, 'forbidden', 'نقش شما اجازه‌ی این کار را ندارد.');
  }
}

export async function login(request: Request, body: unknown) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

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

  // The owner account (environment variables) always works; panel accounts come next.
  // Every comparison is evaluated so the response time does not reveal which part failed.
  const ownerOk =
    !!expectedUser && !!expectedPass && safeEqual(username, expectedUser) && safeEqual(password, expectedPass);
  const [staff] = await db.query(
    'SELECT id, username, display_name, role, password_hash, active FROM staff_users WHERE lower(username) = lower($1)',
    [username.trim()]
  );
  const staffOk = await checkPassword(password, (staff?.password_hash as string | undefined) ?? null);

  let session: AdminSession | null = null;
  if (ownerOk) {
    session = { username: expectedUser!, role: 'admin', staffId: null, displayName: 'مدیر اصلی' };
  } else if (staff && staffOk && isRole(staff.role)) {
    if (!staff.active) throw new ApiError(403, 'account_disabled', 'این حساب مدیریتی غیرفعال شده است.');
    session = {
      username: staff.username as string,
      role: staff.role,
      staffId: staff.id as string,
      displayName: (staff.display_name as string) || (staff.username as string),
    };
  }
  if (!session) {
    await db.query('INSERT INTO login_attempts (ip) VALUES ($1)', [ip]);
    if (!expectedUser || !expectedPass) {
      // Without the owner variables only panel accounts can sign in.
      const [any] = await db.query('SELECT 1 AS ok FROM staff_users LIMIT 1');
      if (!any) throw new ApiError(500, 'config', 'نام کاربری و رمز مدیر روی سرور تنظیم نشده است.');
    }
    throw new ApiError(401, 'invalid_credentials', 'نام کاربری یا رمز عبور نادرست است.');
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  await db.transaction([
    {
      text: 'INSERT INTO admin_sessions (token_hash, username, expires_at, role, staff_id) VALUES ($1, $2, $3, $4, $5)',
      params: [sha256Hex(token), session.username, expiresAt.toISOString(), session.role, session.staffId],
    },
    { text: 'DELETE FROM login_attempts WHERE ip = $1 OR attempted_at < now() - interval \'1 day\'', params: [ip] },
    { text: 'DELETE FROM admin_sessions WHERE expires_at < now()' },
    ...(session.staffId
      ? [{ text: 'UPDATE staff_users SET last_login_at = now() WHERE id = $1', params: [session.staffId] }]
      : []),
  ]);

  return { token, expiresAt: expiresAt.toISOString(), admin: publicAdmin(session) };
}

export function publicAdmin(session: AdminSession) {
  return {
    username: session.username,
    displayName: session.displayName,
    role: session.role,
    permissions: permissionsOf(session.role),
  };
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

export async function requireAdmin(request: Request): Promise<AdminSession> {
  const token = bearerToken(request);
  if (!token) throw unauthorized();
  // A panel account that was disabled or deleted loses its sessions at once.
  const [row] = await getDb().query(
    `SELECT s.username, s.role, s.staff_id, st.display_name, st.active, st.role AS current_role
     FROM admin_sessions s LEFT JOIN staff_users st ON st.id = s.staff_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256Hex(token)]
  );
  if (!row) throw unauthorized();
  if (row.staff_id && (!row.active || !isRole(row.current_role))) throw unauthorized();
  return {
    username: row.username as string,
    role: (row.staff_id ? row.current_role : row.role) as Role,
    staffId: (row.staff_id as string | null) ?? null,
    displayName: (row.display_name as string | null) || (row.username as string),
  };
}

export async function logout(request: Request): Promise<void> {
  const token = bearerToken(request);
  if (token) {
    await getDb().query('DELETE FROM admin_sessions WHERE token_hash = $1', [sha256Hex(token)]);
  }
}
