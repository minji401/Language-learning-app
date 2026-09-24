import type { ReviewGrade } from "../shared";

export interface SrsState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string;
}

interface SrsSnapshot {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

function roundEase(value: number) {
  return Math.round(value * 100) / 100;
}

export function applyGrade(state: SrsSnapshot, grade: ReviewGrade, now = new Date()): SrsState {
  let ease = state.easeFactor;
  let interval = state.intervalDays;
  let repetitions = state.repetitions;

  if (grade === "again") {
    repetitions = 0;
    interval = 0;
  } else if (grade === "hard") {
    repetitions += 1;
    ease = Math.max(1.3, ease - 0.15);
    interval = Math.max(1, Math.round(interval * 1.2) || 1);
  } else if (grade === "good") {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.max(1, Math.round(interval * ease));
  } else {
    repetitions += 1;
    ease += 0.15;
    interval = repetitions === 1 ? 2 : Math.max(1, Math.round(interval * ease * 1.3));
  }

  const next = new Date(now);
  if (grade === "again") next.setMinutes(next.getMinutes() + 10);
  else next.setDate(next.getDate() + interval);

  return {
    easeFactor: roundEase(ease),
    intervalDays: interval,
    repetitions,
    nextReviewAt: next.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}
