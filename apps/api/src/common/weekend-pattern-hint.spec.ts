/**
 * 周末小会本周模式一句 — run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import { buildWeekendPatternHint } from './weekend-pattern-hint';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('weekend-pattern-hint unit tests');

test('全零 → null', () => {
  assert.strictEqual(
    buildWeekendPatternHint({
      deferCount: 0,
      moodTiredOrHard: 0,
      reflectionCount: 0,
      journalWeekCount: 0,
    }),
    null,
  );
});

test('阈值与截断两段', () => {
  const h = buildWeekendPatternHint({
    deferCount: 3,
    moodTiredOrHard: 2,
    reflectionCount: 2,
    journalWeekCount: 1,
  });
  assert.ok(h);
  assert.ok(h!.includes('缓做'));
  assert.ok(h!.includes('累/难'));
  assert.ok(!h!.includes('反思'));
  assert.ok(h!.includes('小会里可以只挑一件聊聊'));
});

test('仅说说也出句', () => {
  const h = buildWeekendPatternHint({
    deferCount: 0,
    moodTiredOrHard: 0,
    reflectionCount: 0,
    journalWeekCount: 1,
  });
  assert.ok(h!.includes('家庭说说本周有 1 条'));
});

console.log('weekend-pattern-hint unit tests passed');
