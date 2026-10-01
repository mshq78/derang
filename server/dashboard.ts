import { getDb } from './db.js';
import { COLLECTIONS } from './validate.js';
import { smsStatus } from './sms.js';

/** Numbers for the panel's home page. */
export async function dashboard() {
  const db = getDb();
  const [members] = await db.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE disabled)::int AS disabled,
            count(*) FILTER (WHERE password_hash IS NOT NULL)::int AS with_password,
            count(*) FILTER (WHERE last_login_at IS NOT NULL)::int AS ever_logged_in,
            count(*) FILTER (WHERE last_login_at > now() - interval '7 days')::int AS active_week,
            count(*) FILTER (WHERE last_login_at > now() - interval '1 day')::int AS active_day
     FROM users`
  );
  const content = await db.query(
    `SELECT collection, count(*)::int AS total, count(*) FILTER (WHERE is_published)::int AS published
     FROM content_items GROUP BY collection`
  );
  const [staff] = await db.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE active)::int AS active FROM staff_users`);
  const [site] = await db.query(
    `SELECT data->>'phoneLoginEnabled' AS sms, data->>'passwordLoginEnabled' AS password, data->>'openAccess' AS open
     FROM site_settings WHERE id = 1`
  );
  const byCollection = new Map(content.map((r) => [r.collection as string, r]));
  return {
    members: {
      total: Number(members?.total ?? 0),
      disabled: Number(members?.disabled ?? 0),
      withPassword: Number(members?.with_password ?? 0),
      everLoggedIn: Number(members?.ever_logged_in ?? 0),
      activeWeek: Number(members?.active_week ?? 0),
      activeDay: Number(members?.active_day ?? 0),
    },
    content: COLLECTIONS.map((c) => ({
      collection: c,
      total: Number(byCollection.get(c)?.total ?? 0),
      published: Number(byCollection.get(c)?.published ?? 0),
    })),
    staff: { total: Number(staff?.total ?? 0), active: Number(staff?.active ?? 0) },
    access: {
      openAccess: site?.open === 'true',
      passwordLogin: site?.password === 'true',
      smsLogin: site?.sms === 'true',
      smsConfigured: smsStatus().configured,
    },
  };
}
