import { BADGES, CHARACTERS, CONFIRM_SHARE, POINTS, SPEED_MAX, STAGES, taskId, type StageDef } from '../src/data/journey.js';
import { ANSWERS } from './tripAnswers.js';

export interface TaskRow {
  task_id: string;
  done_at: number; // epoch ms
  meta: Record<string, unknown>;
}

export interface StageScore {
  id: string;
  points: number;
  complete: boolean;
  /** When the last required part was finished (first done time of each part). */
  completedAt: number | null;
  /** When the stage counted as finished for the speed bonus (parts done and every question answered, no self-confirm); null if not eligible. */
  finishedAt: number | null;
  /** Speed bonus already included in `points` (set by addSpeedPoints). */
  speed: number;
}

export interface Score {
  points: number;
  stages: Record<string, StageScore>;
  badges: string[];
  /** Correct quiz answers in total and when the last stage was finished: tie-breakers on the board. */
  /** Part of `points` that came from badges. */
  badgePoints: number;
  /** Part of `points` that came from finishing stages earlier than others. */
  speedPoints: number;
  correct: number;
  lastAt: number | null;
}

const groupFirstDone = (stage: StageDef, rows: Map<string, TaskRow>) =>
  stage.groups.map((g) => {
    const media = g.items.map((i) => rows.get(taskId.media(stage.id, g.id, i.key))).filter(Boolean) as TaskRow[];
    // Reading the text or the guided tour count like listening; the bonus needs both audio and video.
    // The self-confirm button also finishes the part, but for a smaller share of the points.
    const others = ['text', 'tour']
      .map((k) => rows.get(taskId.media(stage.id, g.id, k)))
      .filter(Boolean) as TaskRow[];
    const confirmed = rows.get(taskId.media(stage.id, g.id, 'confirm'));
    return { group: g, done: [...media, ...others, ...(confirmed ? [confirmed] : [])], mediaDone: media.length, confirmOnly: !!confirmed && media.length + others.length === 0 };
  });

/** Pure scoring: points and badges from a member's task rows and the stage opening times (epoch ms). */
export function score(rowsList: TaskRow[], opened: Record<string, number>, adjustment = 0): Score {
  const rows = new Map(rowsList.map((r) => [r.task_id, r]));
  const result: Score = { points: 0, stages: {}, badges: [], badgePoints: 0, speedPoints: 0, correct: 0, lastAt: null };

  for (const stage of STAGES) {
    let points = 0;
    const partTimes: number[] = [];
    let allParts = true;
    let selfConfirmed = false;

    for (const { group, done, mediaDone, confirmOnly } of groupFirstDone(stage, rows)) {
      if (done.length === 0) {
        allParts = false;
        continue;
      }
      if (confirmOnly) selfConfirmed = true;
      points += confirmOnly ? Math.round(group.base * CONFIRM_SHARE) : group.base + (mediaDone > 1 ? group.bonus : 0);
      partTimes.push(Math.min(...done.map((d) => d.done_at)));
      if (mediaDone > 1 && group.bonus > 0 && !result.badges.includes(`both:${stage.id}`)) result.badges.push(`both:${stage.id}`);
    }
    for (const special of stage.special ?? []) {
      const row = rows.get(special === 'test' ? taskId.test : taskId.cards);
      if (row) {
        points += POINTS[special];
        partTimes.push(row.done_at);
      } else {
        allParts = false;
      }
    }

    let correct = 0;
    let answered = 0;
    let lastAnswerAt = 0;
    for (const q of stage.quiz) {
      const row = rows.get(taskId.quiz(stage.id, q.id));
      if (!row) continue;
      answered++;
      lastAnswerAt = Math.max(lastAnswerAt, row.done_at);
      if (row.meta.correct === true) correct++;
    }
    // Answers earn points only once the parts above them are done, so answering alone does not pay.
    const complete = allParts && stage.groups.length + (stage.special?.length ?? 0) > 0;
    if (complete) {
      points += correct * POINTS.quiz;
      result.correct += correct;
    }

    const completedAt = complete ? Math.max(...partTimes) : null;
    const finishedAt = complete && !selfConfirmed && answered === stage.quiz.length ? Math.max(completedAt!, lastAnswerAt) : null;
    result.stages[stage.id] = { id: stage.id, points, complete, completedAt, finishedAt, speed: 0 };
    result.points += points;
    if (completedAt !== null) result.lastAt = Math.max(result.lastAt ?? 0, completedAt);

    if (complete && opened[stage.id] !== undefined && completedAt! <= opened[stage.id] + stage.fastMinutes * 60_000) {
      result.badges.push(`fast:${stage.id}`);
    }
    if (complete && stage.quiz.length > 0 && correct === stage.quiz.length) result.badges.push(`perfect:${stage.id}`);
  }
  if (STAGES.every((s) => result.stages[s.id].complete)) result.badges.push('finisher');
  // Each badge adds its own points, so a person can see what it was worth.
  result.badgePoints = result.badges.reduce((sum, id) => sum + (BADGES[id]?.points ?? 0), 0);
  result.points += result.badgePoints;
  // The organiser's manual additions and deductions; the total never goes below zero.
  result.points = Math.max(0, result.points + adjustment);
  return result;
}

export const isCharacter = (id: unknown): id is (typeof CHARACTERS)[number]['id'] =>
  CHARACTERS.some((c) => c.id === id);

export const correctIndex = (stageId: string, questionId: string): number | undefined => ANSWERS[`${stageId}:${questionId}`];

export const badgeLabel = (id: string) => BADGES[id]?.label ?? id;

/** Highest points first; ties go to more correct answers, then to whoever finished sooner, then by name. */
export const byRank = <T extends { s: Score; name: string }>(a: T, b: T) =>
  b.s.points - a.s.points ||
  b.s.correct - a.s.correct ||
  (a.s.lastAt ?? Infinity) - (b.s.lastAt ?? Infinity) ||
  a.name.localeCompare(b.name, 'fa');

/**
 * Speed bonus: for each stage, those who finished it (parts done, every question answered, no
 * self-confirm) are ordered by finishing time; the first gets SPEED_MAX points, each next place one
 * less, down to none. A person's place depends only on who finished before them.
 */
export function addSpeedPoints(entries: { id: string; s: Score }[]) {
  for (const stage of STAGES) {
    const finished = entries
      .filter((e) => e.s.stages[stage.id].finishedAt !== null)
      .sort((a, b) => a.s.stages[stage.id].finishedAt! - b.s.stages[stage.id].finishedAt! || a.id.localeCompare(b.id));
    finished.forEach((e, i) => {
      const bonus = Math.max(0, SPEED_MAX - i);
      e.s.stages[stage.id].speed = bonus;
      e.s.stages[stage.id].points += bonus;
      e.s.speedPoints += bonus;
      e.s.points += bonus;
    });
  }
}
