/**
 * gift-math unit tests
 */
import assert from 'assert';
import { PointGiftReason } from '../common/enums';
import {
  giftNoteOk,
  isValidGiftReason,
  needsParentGate,
  shanghaiWeekStart,
} from './gift-math';
import { runTests, test } from '../test/sqlite-memory';

async function main() {
  await runTests('gift-math unit tests', [
    test('needsParentGate mirrors pact gate', () => {
      assert.strictEqual(needsParentGate(10, 10), true);
      assert.strictEqual(needsParentGate(9, 10), false);
      assert.strictEqual(needsParentGate(100, 0), false);
    }),
    test('isValidGiftReason whitelist', () => {
      assert.ok(isValidGiftReason(PointGiftReason.CHEER));
      assert.ok(!isValidGiftReason('red_packet'));
    }),
    test('giftNoteOk requires note for other', () => {
      assert.ok(giftNoteOk(PointGiftReason.CHEER, ''));
      assert.ok(!giftNoteOk(PointGiftReason.OTHER, 'a'));
      assert.ok(giftNoteOk(PointGiftReason.OTHER, '祝贺'));
    }),
    test('shanghaiWeekStart returns Monday', () => {
      // 2026-07-12 is Sunday → week start 2026-07-06
      assert.strictEqual(shanghaiWeekStart('2026-07-12'), '2026-07-06');
      // Monday stays
      assert.strictEqual(shanghaiWeekStart('2026-07-06'), '2026-07-06');
    }),
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
