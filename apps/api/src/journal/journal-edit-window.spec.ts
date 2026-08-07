/**
 * 家庭手账短时编辑窗
 * run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import {
  JOURNAL_EDIT_WINDOW_MS,
  canEditWithinWindow,
} from './journal-edit-window';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('journal-edit-window unit tests');

test('创建后 15 分钟内可编辑', () => {
  const now = Date.now();
  assert.strictEqual(
    canEditWithinWindow(new Date(now - 5 * 60 * 1000), now),
    true,
  );
});

test('超过窗口不可编辑', () => {
  const now = Date.now();
  assert.strictEqual(
    canEditWithinWindow(new Date(now - JOURNAL_EDIT_WINDOW_MS - 1000), now),
    false,
  );
});

console.log('journal-edit-window: ok');
