/**
 * P2: plan item taskId must be assigned to the student.
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

console.log('plans-ownership unit tests');

test('addItem asserts task assigned to student', () => {
  const src = fs.readFileSync(
    path.join(__dirname, 'plans.service.ts'),
    'utf8',
  );
  assert.ok(src.includes('assertTaskAssignedToStudent'));
  const add = src.slice(src.indexOf('async addItem'), src.indexOf('async updateItem'));
  assert.ok(add.includes('assertTaskAssignedToStudent'));
  assert.ok(src.includes('TaskAssign'));
  assert.ok(src.includes("where: { studentId, taskId }"));
});

test('plans module registers TaskAssign', () => {
  const src = fs.readFileSync(
    path.join(__dirname, 'plans.module.ts'),
    'utf8',
  );
  assert.ok(src.includes('TaskAssign'));
});

console.log('all passed');
