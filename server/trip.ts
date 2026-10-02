import { getDb } from './db.js';
import { ApiError, badRequest, conflict, notFound } from './http.js';
import { CHARACTERS, STAGES, taskId } from '../src/data/journey.js';
import { correctIndex, isCharacter, score, type Score, type TaskRow } from './tripScore.js';
import type { PublicUser } from './userAuth.js';

const GROUPS = ['1', '2'];
export const isGroup = (value: unknown): value is string => typeof value === 'string' && GROUPS.includes(value);

interface GroupData {
  opened: Record<string, number>;
  members: { id: string; name: string; short: string; rows: TaskRow[]; lastLoginAt: number | null; adjust: number }[];
}

async function loadGroup(group: string): Promise<GroupData> {
  const db = getDb();
  const [openRows, users, progress, adjustments] = await Promise.all([
    db.query('SELECT stage_id, opened_at FROM trip_stage_opens WHERE group_name = $1', [group]),
    db.query(
      `SELECT id, first_name, last_name, last_login_at FROM users WHERE trip_group = $1 AND NOT disabled ORDER BY created_at, id`,
      [group]
    ),
    db.query(
      `SELECT p.user_id, p.task_id, p.done_at, p.meta FROM trip_progress p
       JOIN users u ON u.id = p.user_id WHERE u.trip_group = $1`,
      [group]
    ),
    db.query(
      `SELECT a.user_id, sum(a.delta)::int AS total FROM trip_adjustments a
       JOIN users u ON u.id = a.user_id WHERE u.trip_group = $1 GROUP BY a.user_id`,
      [group]
    ),
  ]);
  const adjustByUser = new Map(adjustments.map((r) => [r.user_id as string, Number(r.total)]));
  const opened: Record<string, number> = {};
  for (const r of openRows) opened[r.stage_id as string] = new Date(r.opened_at as string).getTime();
  const byUser = new Map<string, TaskRow[]>();
  for (const r of progress) {
    const list = byUser.get(r.user_id as string) ?? [];
    list.push({ task_id: r.task_id as string, done_at: new Date(r.done_at as string).getTime(), meta: (r.meta as Record<string, unknown>) ?? {} });
    byUser.set(r.user_id as string, list);
  }
  return {
    opened,
    members: users.map((u) => {
      const first = u.first_name as string;
      const last = u.last_name as string;
      return {
        id: u.id as string,
        name: `${first} ${last}`.trim(),
        // On the shared board only the first name and the initial of the last name are shown.
        short: last ? `${first} ${last.charAt(0)}.` : first,
        rows: byUser.get(u.id as string) ?? [],
        lastLoginAt: u.last_login_at ? new Date(u.last_login_at as string).getTime() : null,
        adjust: adjustByUser.get(u.id as string) ?? 0,
      };
    }),
  };
}

export async function tripState(user: PublicUser) {
  const group = user.tripGroup;
  if (!isGroup(group)) return { group: null };
  const data = await loadGroup(group);
  const scored = data.members.map((m) => ({ m, s: score(m.rows, data.opened, m.adjust) }));
  scored.sort((a, b) => b.s.points - a.s.points || a.m.name.localeCompare(b.m.name, 'fa'));
  const mine = scored.find((x) => x.m.id === user.id);
  const myRows = mine?.m.rows ?? [];
  const rank = mine ? scored.findIndex((x) => x.m.id === user.id) + 1 : null;

  return {
    group,
    now: Date.now(),
    started: data.opened[STAGES[0].id] !== undefined,
    opened: data.opened,
    done: Object.fromEntries(
      myRows.map((r) => [r.task_id, { at: r.done_at, ...(r.meta.correct !== undefined ? { correct: r.meta.correct, choice: r.meta.choice } : {}), ...(r.meta.character ? { character: r.meta.character } : {}) }])
    ),
    me: mine ? { points: mine.s.points, rank, of: scored.length, badges: mine.s.badges, stages: mine.s.stages } : null,
    top: scored.slice(0, 3).map((x, i) => ({ rank: i + 1, name: x.m.short, points: x.s.points, badges: x.s.badges.length })),
  };
}

async function requireOpenStage(user: PublicUser, stageId: unknown) {
  const group = user.tripGroup;
  if (!isGroup(group)) throw new ApiError(403, 'no_group', 'برای شما سفری تعریف نشده است.');
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) throw notFound('این مرحله وجود ندارد.');
  const [row] = await getDb().query('SELECT 1 AS ok FROM trip_stage_opens WHERE group_name = $1 AND stage_id = $2', [group, stage.id]);
  if (!row) throw conflict('این مرحله هنوز باز نشده است.');
  return stage;
}

async function record(user: PublicUser, task: string, meta: Record<string, unknown> = {}, overwrite = false) {
  await getDb().query(
    `INSERT INTO trip_progress (user_id, task_id, meta) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, task_id) DO ${overwrite ? 'UPDATE SET meta = EXCLUDED.meta' : 'NOTHING'}`,
    [user.id, task, JSON.stringify(meta)]
  );
}

/** A listened/watched/cards-viewed task. Only tasks defined for the stage are accepted. */
export async function completeTask(user: PublicUser, body: unknown) {
  const { stageId, groupId, key, special } = (body ?? {}) as Record<string, unknown>;
  const stage = await requireOpenStage(user, stageId);
  if (special === 'cards') {
    if (!stage.special?.includes('cards')) throw badRequest('کار نامعتبر است.');
    await record(user, taskId.cards);
    return { ok: true };
  }
  const group = stage.groups.find((g) => g.id === groupId);
  const item = group?.items.find((i) => i.key === key);
  const isText = key === 'text' && group?.text === true;
  if (!group || (!item && !isText)) throw badRequest('کار نامعتبر است.');
  await record(user, taskId.media(stage.id, group.id, isText ? 'text' : item!.key));
  return { ok: true };
}

export async function submitTest(user: PublicUser, body: unknown) {
  const { character } = (body ?? {}) as { character?: unknown };
  if (!isCharacter(character)) throw badRequest('شخصیت انتخاب‌شده معتبر نیست.');
  await requireOpenStage(user, 's1');
  await record(user, taskId.test, { character }, true);
  return { ok: true, name: CHARACTERS.find((c) => c.id === character)!.name };
}

export async function answerQuestion(user: PublicUser, body: unknown) {
  const { stageId, questionId, choice } = (body ?? {}) as Record<string, unknown>;
  const stage = await requireOpenStage(user, stageId);
  const question = stage.quiz.find((q) => q.id === questionId);
  const correct = question ? correctIndex(stage.id, question.id) : undefined;
  if (!question || correct === undefined || typeof choice !== 'number' || !Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
    throw badRequest('پاسخ نامعتبر است.');
  }
  // The first answer counts; the correct one is shown afterwards either way.
  await record(user, taskId.quiz(stage.id, question.id), { choice, correct: choice === correct });
  const [row] = await getDb().query('SELECT meta FROM trip_progress WHERE user_id = $1 AND task_id = $2', [user.id, taskId.quiz(stage.id, question.id)]);
  const meta = (row?.meta ?? {}) as { choice?: number; correct?: boolean };
  return { choice: meta.choice, correct: meta.correct === true, correctIndex: correct };
}

// ---------------------------------------------------------------------------
// Organiser
// ---------------------------------------------------------------------------

export async function adminTrip(group: string) {
  const data = await loadGroup(group);
  const scored = data.members.map((m) => ({ m, s: score(m.rows, data.opened, m.adjust) }));
  scored.sort((a, b) => b.s.points - a.s.points || a.m.name.localeCompare(b.m.name, 'fa'));
  return {
    group,
    now: Date.now(),
    opened: data.opened,
    stages: STAGES.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      openedAt: data.opened[s.id] ?? null,
      done: scored.filter((x) => x.s.stages[s.id].complete).length,
    })),
    members: scored.map((x, i) => ({
      id: x.m.id,
      rank: i + 1,
      name: x.m.name,
      points: x.s.points,
      adjust: x.m.adjust,
      badges: x.s.badges.length,
      stagesDone: Object.values(x.s.stages).filter((st) => st.complete).length,
      everLoggedIn: x.m.lastLoginAt !== null,
    })),
    total: scored.length,
  };
}

/** Opens the next stage in order. The first call is the start of the trip. */
export async function openNextStage(group: string) {
  const db = getDb();
  const rows = await db.query('SELECT stage_id FROM trip_stage_opens WHERE group_name = $1', [group]);
  const opened = new Set(rows.map((r) => r.stage_id as string));
  const next = STAGES.find((s) => !opened.has(s.id));
  if (!next) throw conflict('همه‌ی مرحله‌ها باز شده‌اند.');
  const [done] = await db.query(
    'INSERT INTO trip_stage_opens (group_name, stage_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING stage_id',
    [group, next.id]
  );
  if (!done) throw conflict('این مرحله هم‌اکنون باز شد؛ صفحه را تازه کنید.');
  return next;
}

/** Takes back the most recent opening (for an accidental press). Progress already made is kept. */
export async function undoLastOpen(group: string) {
  const [row] = await getDb().query(
    `DELETE FROM trip_stage_opens WHERE group_name = $1 AND stage_id = (
       SELECT stage_id FROM trip_stage_opens WHERE group_name = $1 ORDER BY opened_at DESC, stage_id DESC LIMIT 1)
     RETURNING stage_id`,
    [group]
  );
  if (!row) throw conflict('مرحله‌ی بازی برای بازگرداندن نیست.');
  return STAGES.find((s) => s.id === row.stage_id) ?? null;
}

export type { Score };

export async function adjustPoints(actor: string, body: unknown) {
  const { userId, delta, reason } = (body ?? {}) as { userId?: unknown; delta?: unknown; reason?: unknown };
  if (typeof userId !== 'string' || !userId) throw badRequest('کاربر مشخص نیست.');
  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 10_000) {
    throw badRequest('امتیاز باید یک عدد صحیح غیر صفر (حداکثر ۱۰٬۰۰۰) باشد.');
  }
  const text = typeof reason === 'string' ? reason.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200) : '';
  const [member] = await getDb().query('SELECT first_name, last_name, trip_group FROM users WHERE id = $1', [userId]);
  if (!member) throw notFound('این کاربر پیدا نشد.');
  if (!isGroup(member.trip_group)) throw conflict('این کاربر در گروه سفر نیست.');
  await getDb().query('INSERT INTO trip_adjustments (user_id, delta, reason, actor) VALUES ($1, $2, $3, $4)', [userId, delta, text, actor]);
  return { name: `${member.first_name} ${member.last_name}`.trim(), delta, reason: text };
}

export async function listAdjustments(userId: string) {
  const rows = await getDb().query(
    'SELECT id, delta, reason, actor, at FROM trip_adjustments WHERE user_id = $1 ORDER BY at DESC, id DESC LIMIT 50',
    [userId]
  );
  return rows.map((r) => ({ id: Number(r.id), delta: Number(r.delta), reason: r.reason as string, actor: r.actor as string, at: new Date(r.at as string).toISOString() }));
}
