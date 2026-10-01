import { getDb } from './db.js';
import type { AdminSession } from './auth.js';

/** Writes one line to the activity log; a logging failure never blocks the action itself. */
export async function audit(actor: AdminSession | string, action: string, target = '', detail = ''): Promise<void> {
  try {
    await getDb().query('INSERT INTO audit_log (actor, action, target, detail) VALUES ($1, $2, $3, $4)', [
      typeof actor === 'string' ? actor : actor.username,
      action,
      target.slice(0, 200),
      detail.slice(0, 500),
    ]);
  } catch (err) {
    console.error('[audit] failed', err);
  }
}

export async function listAudit(limit: number, offset = 0) {
  const rows = await getDb().query(
    'SELECT id, at, actor, action, target, detail FROM audit_log ORDER BY at DESC, id DESC LIMIT $1 OFFSET $2',
    [Math.min(Math.max(limit, 1), 200), Math.max(offset, 0)]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    at: new Date(r.at as string).toISOString(),
    actor: r.actor as string,
    action: r.action as string,
    target: r.target as string,
    detail: r.detail as string,
  }));
}
