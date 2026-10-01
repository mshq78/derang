import { randomUUID } from 'node:crypto';
import { normalizeIranMobile, toLatinDigits } from '../src/utils/phone.js';
import { getDb } from './db.js';
import { badRequest, conflict, notFound } from './http.js';
import { hashPassword } from './password.js';

/**
 * Site members managed from the admin panel: the admin creates the account
 * (mobile number, password, name) and the person signs in with them.
 */

// Hashing is deliberately slow, so one request stays small.
const MAX_ROWS_PER_REQUEST = 60;

export interface ImportResult {
  created: number;
  updated: number;
  rejected: { row: number; reason: string }[];
}

const cleanName = (value: unknown, max: number): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';

const cleanPassword = (value: unknown): string => toLatinDigits(String(value ?? '')).trim();

function toMember(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    phone: row.phone as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    disabled: row.disabled === true,
    hasPassword: row.has_password === true,
    createdAt: new Date(row.created_at as string).toISOString(),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string).toISOString() : null,
  };
}

const MEMBER_COLUMNS = `id, phone, first_name, last_name, disabled, (password_hash IS NOT NULL) AS has_password,
                        created_at, last_login_at`;

export async function listMembers(params: URLSearchParams) {
  const q = (params.get('q') ?? '').trim();
  const status = params.get('status') ?? '';
  const pageSize = Math.min(Math.max(Number(params.get('pageSize')) || 25, 1), 1000);
  const page = Math.max(Number(params.get('page')) || 1, 1);

  const where: string[] = [];
  const values: unknown[] = [];
  if (q) {
    values.push(`%${toLatinDigits(q).replace(/[%_\\]/g, '\\$&')}%`);
    where.push(`(phone LIKE $${values.length} OR first_name ILIKE $${values.length} OR last_name ILIKE $${values.length}
                 OR (first_name || ' ' || last_name) ILIKE $${values.length})`);
  }
  if (status === 'disabled') where.push('disabled');
  if (status === 'active') where.push('NOT disabled');
  if (status === 'no_password') where.push('password_hash IS NULL');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const db = getDb();
  const [count] = await db.query(`SELECT count(*)::int AS n FROM users ${clause}`, values);
  const rows = await db.query(
    `SELECT ${MEMBER_COLUMNS} FROM users ${clause}
     ORDER BY created_at DESC, id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  return { total: Number(count?.n ?? 0), page, pageSize, items: rows.map(toMember) };
}

export async function createMember(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const phone = normalizeIranMobile(String(input.phone ?? ''));
  const password = cleanPassword(input.password);
  const firstName = cleanName(input.firstName, 40);
  if (!phone) throw badRequest('شماره موبایل معتبر نیست.', 'validation');
  if (!password || password.length > 128) throw badRequest('رمز عبور را وارد کنید.', 'validation');
  if (!firstName) throw badRequest('نام را وارد کنید.', 'validation');

  const [existing] = await getDb().query('SELECT 1 AS ok FROM users WHERE phone = $1', [phone]);
  if (existing) throw conflict('کاربری با این شماره از قبل وجود دارد.');
  const [row] = await getDb().query(
    `INSERT INTO users (id, phone, first_name, last_name, password_hash) VALUES ($1, $2, $3, $4, $5)
     RETURNING ${MEMBER_COLUMNS}`,
    [randomUUID(), phone, firstName, cleanName(input.lastName, 50), await hashPassword(password)]
  );
  return toMember(row);
}

export async function updateMember(id: string, body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const sets: string[] = [];
  const values: unknown[] = [id];
  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (input.phone !== undefined) {
    const phone = normalizeIranMobile(String(input.phone));
    if (!phone) throw badRequest('شماره موبایل معتبر نیست.', 'validation');
    const [dup] = await getDb().query('SELECT 1 AS ok FROM users WHERE phone = $1 AND id <> $2', [phone, id]);
    if (dup) throw conflict('این شماره برای کاربر دیگری ثبت شده است.');
    push('phone', phone);
  }
  if (input.firstName !== undefined) {
    const first = cleanName(input.firstName, 40);
    if (!first) throw badRequest('نام نمی‌تواند خالی باشد.', 'validation');
    push('first_name', first);
  }
  if (input.lastName !== undefined) push('last_name', cleanName(input.lastName, 50));
  if (input.disabled !== undefined) push('disabled', input.disabled === true);
  if (input.password !== undefined && input.password !== '') {
    const password = cleanPassword(input.password);
    if (!password || password.length > 128) throw badRequest('رمز عبور معتبر نیست.', 'validation');
    push('password_hash', await hashPassword(password));
  }
  if (sets.length === 0) throw badRequest('تغییری برای ذخیره ارسال نشده است.', 'validation');

  const db = getDb();
  const [row] = await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING ${MEMBER_COLUMNS}`, values);
  if (!row) throw notFound('این کاربر پیدا نشد.');
  // Disabling or a new password ends the person's open sessions right away.
  if (input.disabled === true || (input.password !== undefined && input.password !== '')) {
    await db.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
  }
  return toMember(row);
}

export async function deleteMember(id: string): Promise<{ phone: string }> {
  const [row] = await getDb().query('DELETE FROM users WHERE id = $1 RETURNING phone', [id]);
  if (!row) throw notFound('این کاربر پیدا نشد.');
  return { phone: row.phone as string };
}

export async function importMembers(body: unknown): Promise<ImportResult> {
  const list = (body as { users?: unknown } | null)?.users;
  if (!Array.isArray(list) || list.length === 0) throw badRequest('فهرست کاربران خالی است.', 'validation');
  if (list.length > MAX_ROWS_PER_REQUEST) {
    throw badRequest(`در هر درخواست حداکثر ${MAX_ROWS_PER_REQUEST} کاربر مجاز است.`, 'validation');
  }

  const result: ImportResult = { created: 0, updated: 0, rejected: [] };
  const seen = new Set<string>();
  const rows: { id: string; phone: string; first_name: string; last_name: string; password_hash: string }[] = [];

  for (let index = 0; index < list.length; index++) {
    const item = (list[index] ?? {}) as Record<string, unknown>;
    const row = index + 1;
    const phone = typeof item.phone === 'string' || typeof item.phone === 'number' ? normalizeIranMobile(String(item.phone)) : null;
    const password = cleanPassword(item.password);
    const firstName = cleanName(item.firstName, 40);
    if (!phone) result.rejected.push({ row, reason: 'شماره موبایل معتبر نیست' });
    else if (!password || password.length > 128) result.rejected.push({ row, reason: 'رمز عبور خالی یا بسیار طولانی است' });
    else if (!firstName) result.rejected.push({ row, reason: 'نام خالی است' });
    else if (seen.has(phone)) result.rejected.push({ row, reason: 'شماره تکراری در همین فهرست' });
    else {
      seen.add(phone);
      rows.push({
        id: randomUUID(),
        phone,
        first_name: firstName,
        last_name: cleanName(item.lastName, 50),
        password_hash: await hashPassword(password),
      });
    }
  }

  if (rows.length > 0) {
    const written = await getDb().query(
      `INSERT INTO users (id, phone, first_name, last_name, password_hash)
       SELECT x.id, x.phone, x.first_name, x.last_name, x.password_hash
       FROM jsonb_to_recordset($1::jsonb)
         AS x(id text, phone text, first_name text, last_name text, password_hash text)
       ON CONFLICT (phone) DO UPDATE
         SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, password_hash = EXCLUDED.password_hash
       RETURNING (xmax = 0) AS created, id`,
      [JSON.stringify(rows)]
    );
    for (const w of written) w.created ? result.created++ : result.updated++;
    // New passwords replace the old ones, so older sessions of updated accounts end here.
    await getDb().query(
      `DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE phone = ANY($1))`,
      [rows.map((r) => r.phone)]
    );
  }
  return result;
}
