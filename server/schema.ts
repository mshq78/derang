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

/** One-off data fixes. Each only touches rows still holding the old value. */
async function migrate(): Promise<void> {
  // Brand name spelling changed from «دِرانْـگ» to «درنگ».
  await getDb().query(
    `UPDATE site_settings SET data = jsonb_set(data, '{brandName}', to_jsonb($2::text)), updated_at = now()
     WHERE id = 1 AND data->>'brandName' = $1`,
    ['دِرانْـگ', 'درنگ']
  );
}
