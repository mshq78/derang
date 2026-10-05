import { DEFAULT_CONTENT } from '../src/data/defaultContent.js';
import { getDb } from './db.js';
import { writeBundle } from './content.js';

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS content_items (
    collection text NOT NULL,
    id text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_published boolean NOT NULL DEFAULT true,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection, id)
  )`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS content_meta (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    version text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash text PRIMARY KEY,
    username text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    ip text NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts (ip, attempted_at)`,
];

// Added after the first release; created on deployments that already have SCHEMA.
const USER_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    phone text NOT NULL UNIQUE,
    first_name text NOT NULL DEFAULT '',
    last_name text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id text PRIMARY KEY,
    phone text NOT NULL,
    code_hash text NOT NULL,
    ip text NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes (phone, created_at)`,
  `CREATE INDEX IF NOT EXISTS otp_codes_ip_idx ON otp_codes (ip, created_at)`,
];

// Admin roles, the audit log and account switches; the probe index is created last.
const ADMIN_SCHEMA: string[] = [
  // Accounts created by the admin sign in with a password (see passwordLogin).
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false',
  `CREATE TABLE IF NOT EXISTS staff_users (
    id text PRIMARY KEY,
    username text NOT NULL UNIQUE,
    display_name text NOT NULL DEFAULT '',
    role text NOT NULL,
    password_hash text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
  )`,
  "ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin'",
  'ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS staff_id text',
  `CREATE TABLE IF NOT EXISTS audit_log (
    id bigserial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    actor text NOT NULL,
    action text NOT NULL,
    target text NOT NULL DEFAULT '',
    detail text NOT NULL DEFAULT ''
  )`,
  'CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC)',
];

// The bus-trip game: which group a member belongs to, which stages are open, and what each member did.
const TRIP_SCHEDULE_TABLE = `CREATE TABLE IF NOT EXISTS trip_schedule (
  group_name text NOT NULL,
  stage_id text NOT NULL,
  open_at timestamptz NOT NULL,
  PRIMARY KEY (group_name, stage_id)
)`;

const TRIP_SCHEMA: string[] = [
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS trip_group text',
  `CREATE TABLE IF NOT EXISTS trip_stage_opens (
    group_name text NOT NULL,
    stage_id text NOT NULL,
    opened_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_name, stage_id)
  )`,
  `CREATE TABLE IF NOT EXISTS trip_progress (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id text NOT NULL,
    done_at timestamptz NOT NULL DEFAULT now(),
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (user_id, task_id)
  )`,
  'CREATE INDEX IF NOT EXISTS trip_progress_done_idx ON trip_progress (done_at)',
  TRIP_SCHEDULE_TABLE,
];

let ready: Promise<void> | null = null;

/**
 * Creates the tables on first use and seeds them with the bundled default
 * content when the database is empty. Runs once per server instance.
 */
export function ensureReady(): Promise<void> {
  if (!ready) {
    ready = init().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function init(): Promise<void> {
  const db = getDb();
  // Each group's last index is created last, so its presence means the whole group exists.
  const [probe] = await db.query(
    `SELECT to_regclass('public.login_attempts_ip_idx') AS base, to_regclass('public.otp_codes_ip_idx') AS users`
  );
  if (!probe?.base) {
    for (const statement of SCHEMA) await db.query(statement);
  }
  if (!probe?.users) {
    for (const statement of USER_SCHEMA) await db.query(statement);
  }
  const meta = await db.query('SELECT 1 FROM content_meta WHERE id = 1');
  if (meta.length === 0) {
    await writeBundle(DEFAULT_CONTENT, 'seed');
  }
  await migrate();
}

/** Runs a named data fix once per database (recorded in the `migrations` table). */
async function once(name: string, run: () => Promise<void>): Promise<void> {
  const db = getDb();
  const [first] = await db.query('INSERT INTO migrations (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id', [name]);
  if (!first) return;
  try {
    await run();
  } catch (err) {
    await db.query('DELETE FROM migrations WHERE id = $1', [name]); // try again on the next start
    throw err;
  }
}

const TRIP_VIDEOS = [
  { id: 'video-isfahan1', title: 'اصفهان ۱؛ پیش از سقوط پایتخت', url: 'https://aparat.com/v/wxehs4a', desc: 'اصفهان ۱۷۲۲؛ نشانه‌هایی که سال‌ها پیش از سقوط دیده نشدند.' },
  { id: 'video-trabant', title: 'ترابانت؛ خودرویی که منجمد شد', url: 'https://aparat.com/v/wuvhz03', desc: 'داستان ترابانت و هر «فعلاً نه» که هزینه‌اش را به آینده منتقل کرد.' },
  { id: 'video-titan', title: 'تایتان؛ زیردریایی که هشدارها را نشنید', url: 'https://aparat.com/v/pbqat3z', desc: 'منیت، ریسک و هویت در حادثه‌ی زیردریایی تایتان.' },
  { id: 'video-paloalto', title: 'پالو آلتو؛ داستانی که واقعیت را کنار زد', url: 'https://aparat.com/v/kaw75kb', desc: 'اخلاق، روایت و روابط در ماجرای ترانوس.' },
  // On the site, but not one of the trip stages.
  { id: 'video-hudson', title: 'سقوط بر روی هادسن', url: 'https://aparat.com/v/rkca7e5', desc: 'هیجان و حافظه در بحران؛ ماجرای پرواز ۱۵۴۹ و رود هادسن.' },
];

async function runOnceMigrations(): Promise<void> {
  const db = getDb();
  await db.query('CREATE TABLE IF NOT EXISTS migrations (id text PRIMARY KEY, at timestamptz NOT NULL DEFAULT now())');
  // Stages open by themselves at set times: 11:30, 13:00, 14:30, 16:00, 17:30 and 19:00 (Iran time,
  // UTC+3:30) on 5 Oct 2026 for group 1. Changeable from the admin panel (Trip control).
  await once('2026-10-trip-schedule-g1', async () => {
    const db = getDb();
    await db.query(TRIP_SCHEDULE_TABLE);
    const times = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'];
    for (let i = 0; i < times.length; i++) {
      await db.query(
        `INSERT INTO trip_schedule (group_name, stage_id, open_at) VALUES ('1', $1, $2::timestamptz) ON CONFLICT DO NOTHING`,
        [`s${i + 1}`, `2026-10-05T${times[i]}:00Z`]
      );
    }
  });
  await once('2026-10-trip-adjustments', async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS trip_adjustments (
      id bigserial PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta integer NOT NULL,
      reason text NOT NULL DEFAULT '',
      actor text NOT NULL,
      at timestamptz NOT NULL DEFAULT now()
    )`);
    await db.query('CREATE INDEX IF NOT EXISTS trip_adjustments_user_idx ON trip_adjustments (user_id)');
  });
  await once('2026-10-trip-videos', async () => {
    // The humorous opening animation is reserved for the live event: it must not be on the site.
    await db.query(`UPDATE content_items SET is_published = false WHERE collection = 'videos' AND id = 'video-sultan-hussein'`);
    let order = 100;
    for (const v of TRIP_VIDEOS) {
      order += 10;
      await db.query(
        `INSERT INTO content_items (collection, id, sort_order, is_published, data)
         VALUES ('videos', $1, $2, true, $3::jsonb) ON CONFLICT (collection, id) DO NOTHING`,
        [
          v.id,
          order,
          JSON.stringify({
            title: v.title,
            badge: 'ویدیوی تحلیلی',
            desc: v.desc,
            videoUrl: v.url,
            quote: '',
            reflectionQuestion: '',
            whyImportant: '',
            showOnStories: true,
          }),
        ]
      );
    }
    await bumpVersion();
  });
  // The first list had the links in the wrong order: set each video's title, link and text again.
  await once('2026-10-trip-videos-fix', async () => {
    let order = 100;
    for (const v of TRIP_VIDEOS) {
      order += 10;
      await db.query(
        `INSERT INTO content_items (collection, id, sort_order, is_published, data)
         VALUES ('videos', $1, $2, true, $3::jsonb)
         ON CONFLICT (collection, id) DO UPDATE SET data = content_items.data || EXCLUDED.data, updated_at = now()`,
        [v.id, order, JSON.stringify({ title: v.title, desc: v.desc, videoUrl: v.url })]
      );
    }
    await bumpVersion();
  });
}

async function bumpVersion(): Promise<void> {
  await getDb().query(
    `INSERT INTO content_meta (id, version, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, updated_at = now()`,
    [`mig-${Date.now().toString(36)}`]
  );
}

/** One-off data fixes. Each only touches rows still holding the old value. */
async function migrate(): Promise<void> {
  const [probe] = await getDb().query(`SELECT to_regclass('public.audit_log_at_idx') AS done`);
  if (!probe?.done) {
    for (const statement of ADMIN_SCHEMA) await getDb().query(statement);
  }
  await runOnceMigrations();
  const [tripProbe] = await getDb().query(`SELECT to_regclass('public.trip_progress_done_idx') AS done`);
  if (!tripProbe?.done) {
    for (const statement of TRIP_SCHEMA) await getDb().query(statement);
  }
  // Brand name spelling changed from «دِرانْـگ» to «درنگ».
  await getDb().query(
    `UPDATE site_settings SET data = jsonb_set(data, '{brandName}', to_jsonb($2::text)), updated_at = now()
     WHERE id = 1 AND data->>'brandName' = $1`,
    ['دِرانْـگ', 'درنگ']
  );
}
