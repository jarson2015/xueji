/**
 * Lightweight unit tests (no jest) — run via: npx ts-node -r tsconfig-paths/register src/common/rest-day-policy.spec.ts
 */
import assert from 'assert';
import {
  isLifeHabitCategory,
  showsOnRestDay,
  streakPausesOnRestDay,
} from './rest-day-policy';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('rest-day-policy unit tests');

test('treats chore and routine as life habits', () => {
  assert.strictEqual(isLifeHabitCategory('chore'), true);
  assert.strictEqual(isLifeHabitCategory('routine'), true);
  assert.strictEqual(isLifeHabitCategory('study'), false);
});

test('legacy default: shows once and life habits; hides study recurring', () => {
  assert.strictEqual(
    showsOnRestDay({ schedule: 'once', category: 'study' }),
    true,
  );
  assert.strictEqual(
    showsOnRestDay({ schedule: 'daily', category: 'chore' }),
    true,
  );
  assert.strictEqual(
    showsOnRestDay({ schedule: 'weekly', category: 'routine' }),
    true,
  );
  assert.strictEqual(
    showsOnRestDay({ schedule: 'daily', category: 'study' }),
    false,
  );
});

test('pause categories: hide selected recurring only', () => {
  const pause = {
    pauseAll: false,
    pauseCategories: ['study', 'chore'],
  };
  assert.strictEqual(
    showsOnRestDay({ schedule: 'daily', category: 'study' }, pause),
    false,
  );
  assert.strictEqual(
    showsOnRestDay({ schedule: 'daily', category: 'chore' }, pause),
    false,
  );
  assert.strictEqual(
    showsOnRestDay({ schedule: 'daily', category: 'routine' }, pause),
    true,
  );
  assert.strictEqual(
    showsOnRestDay({ schedule: 'once', category: 'study' }, pause),
    true,
  );
});

test('pauseAll hides everything including once', () => {
  const pause = { pauseAll: true, pauseCategories: [] };
  assert.strictEqual(
    showsOnRestDay({ schedule: 'once', category: 'study' }, pause),
    false,
  );
  assert.strictEqual(
    showsOnRestDay({ schedule: 'daily', category: 'chore' }, pause),
    false,
  );
});

test('streak pauses only for paused categories (or all)', () => {
  assert.strictEqual(streakPausesOnRestDay('study'), true);
  assert.strictEqual(streakPausesOnRestDay('chore'), false);
  assert.strictEqual(
    streakPausesOnRestDay('chore', {
      pauseAll: false,
      pauseCategories: ['chore'],
    }),
    true,
  );
  assert.strictEqual(
    streakPausesOnRestDay('routine', { pauseAll: true, pauseCategories: [] }),
    true,
  );
});

console.log('all passed');
