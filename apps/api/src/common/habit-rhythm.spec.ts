import { strict as assert } from 'assert';
import {
  countRhythmInWindow,
  HABIT_RHYTHM_TARGET,
  HABIT_RHYTHM_WINDOW,
} from './habit-rhythm';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

assert.equal(countRhythmInWindow(new Set()), 0);
assert.equal(
  countRhythmInWindow(
    new Set([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)]),
  ),
  5,
);
assert.equal(HABIT_RHYTHM_WINDOW, 7);
assert.equal(HABIT_RHYTHM_TARGET, 5);
console.log('habit-rhythm.spec ok');
