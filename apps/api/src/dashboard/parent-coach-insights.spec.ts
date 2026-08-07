import assert from 'assert';
import { buildParentCoachInsights } from './parent-coach-insights';

function test(name: string, fn: () => void) {
  fn();
  console.log(`  ✓ ${name}`);
}

console.log('parent-coach-insights unit tests');
test('returns mood insight when tired count high', () => {
  const r = buildParentCoachInsights({
    moodTiredCount: 3,
    moodHardCount: 0,
    deferCount: 0,
    focusUsedCount: 0,
    confirmRate: 0,
    slotDoneRates: [],
    reflectionCount: 0,
  });
  assert.ok(r.some((x) => x.kind === 'mood'));
});
test('caps at 3 insights', () => {
  const r = buildParentCoachInsights({
    moodTiredCount: 5,
    moodHardCount: 5,
    deferCount: 5,
    focusUsedCount: 5,
    confirmRate: 0.5,
    slotDoneRates: [
      { slot: 'after_dinner', rate: 0.8 },
      { slot: 'after_school', rate: 0.3 },
    ],
    reflectionCount: 5,
  });
  assert.ok(r.length <= 3);
});
console.log('all passed');
