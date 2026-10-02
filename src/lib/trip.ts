import { AuthError, authFetch } from './userAuth';
import { taskId } from '../data/journey';

export interface TripTaskDone {
  at: number;
  correct?: boolean;
  choice?: number;
  character?: string;
}

export interface StageScoreView {
  id: string;
  points: number;
  complete: boolean;
  completedAt: number | null;
}

export interface TripState {
  group: string | null;
  now?: number;
  started?: boolean;
  opened?: Record<string, number>;
  done?: Record<string, TripTaskDone>;
  me?: {
    points: number;
    rank: number | null;
    of: number;
    badges: string[];
    stages: Record<string, StageScoreView>;
  } | null;
  top?: { rank: number; name: string; points: number; badges: number }[];
}

export const fetchTripState = () => authFetch<TripState>('/trip/state');

export const completeTripTask = (body: { stageId: string; groupId?: string; key?: string; special?: 'cards' }) =>
  authFetch<{ ok: true }>('/trip/complete', { method: 'POST', body: JSON.stringify(body) });

export const submitTripTest = (character: string) =>
  authFetch<{ ok: true; name: string }>('/trip/test', { method: 'POST', body: JSON.stringify({ character }) });

export const answerTripQuestion = (stageId: string, questionId: string, choice: number) =>
  authFetch<{ choice: number; correct: boolean; correctIndex: number }>('/trip/answer', {
    method: 'POST',
    body: JSON.stringify({ stageId, questionId, choice }),
  });

// ---------------------------------------------------------------------------
// Finished parts are kept on the phone while there is no connection and sent later.
// ---------------------------------------------------------------------------

export type CompleteBody = { stageId: string; groupId?: string; key?: string; special?: 'cards' };

const outboxKey = (userId: string) => `derang_trip_outbox:${userId}`;

export function loadOutbox(userId: string): CompleteBody[] {
  try {
    const list = JSON.parse(localStorage.getItem(outboxKey(userId)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const saveOutbox = (userId: string, list: CompleteBody[]) => {
  try {
    localStorage.setItem(outboxKey(userId), JSON.stringify(list));
  } catch {
    // storage unavailable: the part is simply sent when it is finished again
  }
};

export const bodyTaskId = (b: CompleteBody) =>
  b.special === 'cards' ? taskId.cards : taskId.media(b.stageId, b.groupId ?? '', b.key ?? '');

const isOffline = (err: unknown) => err instanceof AuthError && (err.code === 'network' || err.code === 'timeout');

/** Sends a finished part; with no connection it is queued. Returns whether it was sent. */
export async function completeOrQueue(userId: string, body: CompleteBody): Promise<'sent' | 'queued'> {
  try {
    await completeTripTask(body);
    return 'sent';
  } catch (err) {
    if (!isOffline(err)) throw err;
    const list = loadOutbox(userId);
    if (!list.some((x) => bodyTaskId(x) === bodyTaskId(body))) saveOutbox(userId, [...list, body]);
    return 'queued';
  }
}

/** Sends queued parts in order; stops at the first connection problem. Returns how many are still waiting. */
export async function flushOutbox(userId: string): Promise<number> {
  let list = loadOutbox(userId);
  while (list.length > 0) {
    try {
      await completeTripTask(list[0]);
    } catch (err) {
      if (isOffline(err)) break;
      // the server refused it (stage closed, unknown part): it cannot succeed later, so drop it
    }
    list = list.slice(1);
    saveOutbox(userId, list);
  }
  return list.length;
}
