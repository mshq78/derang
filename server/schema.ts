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
  // The index is created last, so its presence means the whole schema exists.
  const [probe] = await db.query(`SELECT to_regclass('public.login_attempts_ip_idx') AS t`);
  if (!probe?.t) {
    for (const statement of SCHEMA) await db.query(statement);
  }
  const meta = await db.query('SELECT 1 FROM content_meta WHERE id = 1');
  if (meta.length === 0) {
    await writeBundle(DEFAULT_CONTENT, 'seed');
  }
}
