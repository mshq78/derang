import { BADGES, CHARACTERS, POINTS, STAGES, taskId, type StageDef } from '../src/data/journey.js';
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
}

export interface Score {
  points: number;
  stages: Record<string, StageScore>;
  badges: string[];
}

const groupFirstDone = (stage: StageDef, rows: Map<string, TaskRow>) =>
  stage.groups.map((g) => {
    const done = g.items.map((i) => rows.get(taskId.media(stage.id, g.id, i.key))).filter(Boolean) as TaskRow[];
    return { group: g, done };
  });

/** Pure scoring: points and badges from a member's task rows and the stage opening times (epoch ms). */
export function score(rowsList: TaskRow[], opened: Record<string, number>): Score {
  const rows = new Map(rowsList.map((r) => [r.task_id, r]));
  const result: Score = { points: 0, stages: {}, badges: [] };

  for (const stage of STAGES) {
    let points = 0;
    const partTimes: number[] = [];
    let allParts = true;

    for (const { group, done } of groupFirstDone(stage, rows)) {
      if (done.length === 0) {
        allParts = false;
        continue;
      }
      points += group.base + (done.length > 1 ? group.bonus : 0);
      partTimes.push(Math.min(...done.map((d) => d.done_at)));
      if (done.length > 1 && group.bonus > 0) result.badges.push(`both:${stage.id}`);
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
    for (const q of stage.quiz) {
      const row = rows.get(taskId.quiz(stage.id, q.id));
      if (row && row.meta.correct === true) correct++;
    }
    points += correct * POINTS.quiz;

    const complete = allParts && stage.groups.length + (stage.special?.length ?? 0) > 0;
    const completedAt = complete ? Math.max(...partTimes) : null;
    result.stages[stage.id] = { id: stage.id, points, complete, completedAt };
    result.points += points;

    if (complete && opened[stage.id] !== undefined && completedAt! <= opened[stage.id] + stage.fastMinutes * 60_000) {
      result.badges.push(`fast:${stage.id}`);
    }
    if (stage.quiz.length > 0 && correct === stage.quiz.length) result.badges.push(`perfect:${stage.id}`);
  }
  if (STAGES.every((s) => result.stages[s.id].complete)) result.badges.push('finisher');
  return result;
}

export const isCharacter = (id: unknown): id is (typeof CHARACTERS)[number]['id'] =>
  CHARACTERS.some((c) => c.id === id);

export const correctIndex = (stageId: string, questionId: string): number | undefined => ANSWERS[`${stageId}:${questionId}`];

export const badgeLabel = (id: string) => BADGES[id]?.label ?? id;
