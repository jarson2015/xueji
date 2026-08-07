/**
 * Run: npx ts-node -r tsconfig-paths/register src/common/edu-policy-math.spec.ts
 */
import assert from 'assert';
import {
  requiredSaveCents,
  canSpendAfterSaveFirst,
  mergeRewardModes,
  suggestedPactApproveAbove,
  buildParentOverloadHint,
} from './edu-policy-math';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('edu-policy-math unit tests');

test('requiredSaveCents zero when percent off', () => {
  assert.strictEqual(requiredSaveCents(5000, 0), 0);
});

test('requiredSaveCents floors percent of weekly', () => {
  assert.strictEqual(requiredSaveCents(5000, 20), 1000);
});

test('requiredSaveCents asks at least 1 when weekly unset but percent on', () => {
  assert.strictEqual(requiredSaveCents(null, 20), 1);
});

test('canSpendAfterSaveFirst blocks until saved', () => {
  assert.deepStrictEqual(canSpendAfterSaveFirst(0, 1000), {
    ok: false,
    lackCents: 1000,
  });
  assert.deepStrictEqual(canSpendAfterSaveFirst(1000, 1000), {
    ok: true,
    lackCents: 0,
  });
});

test('mergeRewardModes prefers weekly_digest over always', () => {
  assert.strictEqual(mergeRewardModes(['always', 'weekly_digest']), 'weekly_digest');
  assert.strictEqual(mergeRewardModes(['always', 'random']), 'random');
  assert.strictEqual(mergeRewardModes(['always']), 'always');
});

test('suggestedPactApproveAbove by age', () => {
  assert.strictEqual(suggestedPactApproveAbove('young'), 10);
  assert.strictEqual(suggestedPactApproveAbove('teen'), 30);
  assert.strictEqual(suggestedPactApproveAbove('general'), 20);
});

test('buildParentOverloadHint triggers on density', () => {
  const hint = buildParentOverloadHint({
    maxDailyDue: 10,
    activeTaskCount: 10,
    confirmTaskCount: 5,
    pendingConfirms: 6,
  });
  assert.ok(hint?.show);
  assert.ok(hint!.suggestions.length >= 2);
  assert.strictEqual(
    buildParentOverloadHint({
      maxDailyDue: 3,
      activeTaskCount: 3,
      confirmTaskCount: 0,
      pendingConfirms: 0,
    }),
    null,
  );
});

console.log('all passed');
