import { randomUUID } from 'node:crypto';
import { normalizeIranMobile, toLatinDigits } from '../src/utils/phone.js';
import { getDb } from './db.js';
import { badRequest } from './http.js';
import { hashPassword } from './userAuth.js';

/**
 * Admin-managed accounts: the admin uploads a list (mobile number, password, name)
 * and each person then signs in with the mobile number and password.
 */

// Hashing is deliberately slow, so a request stays small.
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

export async function importAccounts(body: unknown): Promise<ImportResult> {
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
    const password = toLatinDigits(String(item.password ?? '')).trim();
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
       RETURNING (xmax = 0) AS created`,
      [JSON.stringify(rows)]
    );
    for (const w of written) w.created ? result.created++ : result.updated++;
  }
  return result;
}

export async function accountSummary(): Promise<{ total: number; withPassword: number }> {
  const [row] = await getDb().query(
    `SELECT count(*)::int AS total, count(password_hash)::int AS with_password FROM users`
  );
  return { total: Number(row?.total ?? 0), withPassword: Number(row?.with_password ?? 0) };
}
