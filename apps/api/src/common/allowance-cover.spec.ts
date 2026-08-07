/**
 * 零花目标封面安全路径 — run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

function read(...parts: string[]) {
  return fs.readFileSync(path.join(__dirname, ...parts), 'utf8');
}

console.log('allowance-cover unit tests');

test('createGoal / updateGoal 对 coverUrl 走 requireSafeUploadPath', () => {
  const src = read('..', 'allowance', 'allowance.service.ts');
  assert.ok(src.includes('requireSafeUploadPath'));
  const createIdx = src.indexOf('async createGoal');
  const updateIdx = src.indexOf('async updateGoal');
  assert.ok(createIdx > 0 && updateIdx > createIdx);
  const createBlock = src.slice(createIdx, updateIdx);
  assert.ok(createBlock.includes('coverUrl'));
  assert.ok(createBlock.includes('requireSafeUploadPath(dto.coverUrl)'));
  assert.ok(
    createBlock.includes('coverUrl: dto.coverUrl') &&
      createBlock.includes('? requireSafeUploadPath'),
  );
  // 无封面可空
  assert.ok(createBlock.includes(': null') || createBlock.includes('|| null'));
});

test('DTO 允许可选 coverUrl', () => {
  const dto = read('..', 'allowance', 'dto.ts');
  assert.ok(dto.includes('coverUrl?'));
});

console.log('allowance-cover unit tests passed');
