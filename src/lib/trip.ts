import { authFetch } from './userAuth';

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
