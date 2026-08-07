/**
 * 家庭手账私密访问：代登 / 非学生拒绝
 * run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import { ForbiddenException } from '@nestjs/common';
import { assertJournalPrivateAccess } from './journal-privacy';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('journal-privacy unit tests');

test('学生本人可通过', () => {
  assert.doesNotThrow(() =>
    assertJournalPrivateAccess({ role: 'student', isProxy: false }),
  );
});

test('代登拒绝', () => {
  assert.throws(
    () => assertJournalPrivateAccess({ role: 'student', isProxy: true }),
    (e: unknown) => e instanceof ForbiddenException,
  );
});

test('家长拒绝', () => {
  assert.throws(
    () => assertJournalPrivateAccess({ role: 'parent', isProxy: false }),
    (e: unknown) => e instanceof ForbiddenException,
  );
});

console.log('journal-privacy: ok');
