import { formatDate } from './date-util';

/** Rolling window: e.g. 5 completions in 7 days (not strict calendar streak) */
export const HABIT_RHYTHM_WINDOW = 7;
export const HABIT_RHYTHM_TARGET = 5;

export function countRhythmInWindow(
  dayKeys: Iterable<string>,
  windowDays = HABIT_RHYTHM_WINDOW,
  endDate = new Date(),
): number {
  const set = dayKeys instanceof Set ? dayKeys : new Set(dayKeys);
  let count = 0;
  const d = new Date(endDate);
  for (let i = 0; i < windowDays; i++) {
    if (set.has(formatDate(d))) count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

export function rhythmWeekKey(endDate = new Date()): string {
  return formatDate(endDate);
}
