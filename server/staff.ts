import { randomUUID } from 'node:crypto';
import type { AdminSession } from './auth.js';
import { getDb } from './db.js';
import { ApiError, badRequest, conflict, notFound } from './http.js';
import { hashPassword } from './password.js';
import { ROLES, isRole } from './permissions.js';

/** Panel accounts (content producers, support staff, ...). The owner account lives in environment variables. */

const USERNAME = /^[a-zA-Z0-9._-]{3,40}$/;

function toStaff(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    role: row.role as string,
    active: row.active === true,
    createdAt: new Date(row.created_at as string).toISOString(),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string).toISOString() : null,
  };
}

const COLUMNS = 'id, username, display_name, role, active, created_at, last_login_at';

export async function listStaff() {
  const rows = await getDb().query(`SELECT ${COLUMNS} FROM staff_users ORDER BY created_at, id`);
  return {
    roles: Object.entries(ROLES).map(([id, r]) => ({ id, label: r.label, description: r.description })),
    items: rows.map(toStaff),
  };
}

const cleanText = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

function checkNewPassword(value: unknown): string {
  const password = typeof value === 'string' ? value : '';
  if (password.length < 8 || password.length > 128) {
    throw badRequest('رمز عبور مدیران باید حداقل ۸ نویسه باشد.', 'validation');
  }
  return password;
}

export async function createStaff(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const username = cleanText(input.username, 40);
  if (!USERNAME.test(username)) {
    throw badRequest('نام کاربری باید ۳ تا ۴۰ نویسه انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد.', 'validation');
  }
  if (!isRole(input.role)) throw badRequest('نقش انتخاب‌شده معتبر نیست.', 'validation');
  const password = checkNewPassword(input.password);
  if (username.toLowerCase() === (process.env.ADMIN_USERNAME || '').toLowerCase()) {
    throw conflict('این نام کاربری برای مدیر اصلی رزرو شده است.');
  }
  const [dup] = await getDb().query('SELECT 1 AS ok FROM staff_users WHERE lower(username) = lower($1)', [username]);
  if (dup) throw conflict('این نام کاربری از قبل وجود دارد.');
  const [row] = await getDb().query(
    `INSERT INTO staff_users (id, username, display_name, role, password_hash) VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [randomUUID(), username, cleanText(input.displayName, 60) || username, input.role, await hashPassword(password)]
  );
  return toStaff(row);
}

export async function updateStaff(id: string, body: unknown, actor: AdminSession) {
  const input = (body ?? {}) as Record<string, unknown>;
  const sets: string[] = [];
  const values: unknown[] = [id];
  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (input.displayName !== undefined) push('display_name', cleanText(input.displayName, 60));
  if (input.role !== undefined) {
    if (!isRole(input.role)) throw badRequest('نقش انتخاب‌شده معتبر نیست.', 'validation');
    push('role', input.role);
  }
  if (input.active !== undefined) push('active', input.active === true);
  if (input.password !== undefined && input.password !== '') push('password_hash', await hashPassword(checkNewPassword(input.password)));
  if (sets.length === 0) throw badRequest('تغییری برای ذخیره ارسال نشده است.', 'validation');
  if (id === actor.staffId && (input.active === false || (input.role !== undefined && input.role !== actor.role))) {
    throw new ApiError(400, 'validation', 'نقش یا وضعیت حساب خودتان را نمی‌توانید تغییر دهید.');
  }

  const db = getDb();
  const [row] = await db.query(`UPDATE staff_users SET ${sets.join(', ')} WHERE id = $1 RETURNING ${COLUMNS}`, values);
  if (!row) throw notFound('این حساب پیدا نشد.');
  // Deactivation, a new role or a new password ends open sessions; the person signs in again.
  if (input.active === false || input.role !== undefined || (input.password !== undefined && input.password !== '')) {
    await db.query('DELETE FROM admin_sessions WHERE staff_id = $1', [id]);
  }
  return toStaff(row);
}

export async function deleteStaff(id: string, actor: AdminSession): Promise<{ username: string }> {
  if (id === actor.staffId) throw new ApiError(400, 'validation', 'حساب خودتان را نمی‌توانید حذف کنید.');
  const [row] = await getDb().query('DELETE FROM staff_users WHERE id = $1 RETURNING username', [id]);
  if (!row) throw notFound('این حساب پیدا نشد.');
  await getDb().query('DELETE FROM admin_sessions WHERE staff_id = $1', [id]);
  return { username: row.username as string };
}
