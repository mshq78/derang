import { neon } from '@neondatabase/serverless';
import { ApiError } from './http.js';

export type Row = Record<string, unknown>;

export interface Statement {
  text: string;
  params?: unknown[];
}

export interface Db {
  query(text: string, params?: unknown[]): Promise<Row[]>;
  /** Runs all statements atomically (all succeed or none). */
  transaction(statements: Statement[]): Promise<void>;
}

let db: Db | null = null;

/** Lets tests swap in another Postgres-compatible implementation. */
export function setDb(next: Db | null): void {
  db = next;
}

export function getDb(): Db {
  if (db) return db;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new ApiError(500, 'config', 'اتصال پایگاه داده (DATABASE_URL) تنظیم نشده است.');
  }
  const sql = neon(url);
  db = {
    query: (text, params = []) => sql.query(text, params) as Promise<Row[]>,
    transaction: async (statements) => {
      if (statements.length === 0) return;
      await sql.transaction(statements.map((s) => sql.query(s.text, s.params ?? [])));
    },
  };
  return db;
}
