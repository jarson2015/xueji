import assert from 'assert';
import {
  suggestDifficultyUpgrade,
  normalizeDifficultyLevel,
  difficultyLabel,
} from './task-difficulty';

function test(name: string, fn: () => void) {
  fn();
  console.log(`  ✓ ${name}`);
}

console.log('task-difficulty unit tests');
test('normalize defaults to practice', () => {
  assert.strictEqual(normalizeDifficultyLevel(undefined), 'practice');
});
test('suggest upgrade from intro', () => {
  const r = suggestDifficultyUpgrade(5, 'intro');
  assert.ok(r.suggest);
  assert.strictEqual(r.nextLevel, 'practice');
});
test('difficulty labels', () => {
  assert.strictEqual(difficultyLabel('intro'), '入门');
});
console.log('all passed');
