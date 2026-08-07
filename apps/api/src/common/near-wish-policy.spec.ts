/**
 * 近端愿望策略 unit — run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import {
  MAX_ACTIVE_NEAR_TERM_WISHES,
  NEAR_TERM_COST_MIN,
  NEAR_TERM_COST_MAX,
  isNearTermRoomFull,
  isNearTermCostInRange,
  pickNextWishTarget,
} from './near-wish-policy';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('near-wish-policy unit tests');

test('近端在架上限为 3', () => {
  assert.strictEqual(MAX_ACTIVE_NEAR_TERM_WISHES, 3);
  assert.strictEqual(isNearTermRoomFull(2), false);
  assert.strictEqual(isNearTermRoomFull(3), true);
  assert.strictEqual(isNearTermRoomFull(4), true);
});

test('近端建议分值 5–20', () => {
  assert.strictEqual(NEAR_TERM_COST_MIN, 5);
  assert.strictEqual(NEAR_TERM_COST_MAX, 20);
  assert.strictEqual(isNearTermCostInRange(10), true);
  assert.strictEqual(isNearTermCostInRange(4), false);
  assert.strictEqual(isNearTermCostInRange(21), false);
});

test('pickNextWishTarget 优先近端池（输入应按 cost ASC）', () => {
  const list = [
    { id: 1, costPoints: 5, isNearTerm: false },
    { id: 2, costPoints: 15, isNearTerm: true },
    { id: 3, costPoints: 10, isNearTerm: true },
  ].sort((a, b) => a.costPoints - b.costPoints)

  const hit = pickNextWishTarget(list, 0)
  assert.ok(hit)
  assert.strictEqual(hit!.id, 3) // 近端里最便宜且 >0

  const hit3 = pickNextWishTarget(list, 12)
  assert.strictEqual(hit3!.id, 2) // 15 > 12

  const hit4 = pickNextWishTarget(list, 100)
  assert.strictEqual(hit4!.id, 3) // 全够 → 近端最便宜
})

test('无近端时回退全池', () => {
  const list = [
    { id: 1, costPoints: 30, isNearTerm: false },
    { id: 2, costPoints: 10, isNearTerm: false },
  ].sort((a, b) => a.costPoints - b.costPoints);
  const hit = pickNextWishTarget(list, 0);
  assert.strictEqual(hit!.id, 2);
});

console.log('near-wish-policy unit tests passed');
