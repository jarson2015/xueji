/**
 * Student JWT session epoch helpers + source guards (SEC PR2).
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { studentSessionEpochOk } from './session-epoch';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('session-epoch unit tests');

test('studentSessionEpochOk matches pe to db epoch', () => {
  assert.ok(studentSessionEpochOk(0, 0));
  assert.ok(studentSessionEpochOk(undefined, 0));
  assert.ok(studentSessionEpochOk(3, 3));
  assert.ok(!studentSessionEpochOk(2, 3));
  assert.ok(!studentSessionEpochOk(undefined, 1));
});

test('issueToken binds pe for students; no plaintext loginCode fallback', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'auth', 'auth.service.ts'),
    'utf8',
  );
  assert.ok(src.includes('UserRole.STUDENT'));
  assert.ok(src.includes('payload.pe = user.proxyEpoch'));
  assert.ok(!src.includes('where: { loginCode: code }'));
  const find = src.slice(
    src.indexOf('findStudentByLoginCode'),
    src.indexOf('async loginByCode'),
  );
  assert.ok(find.includes('loginCodeHash'));
  assert.ok(!find.includes('loginCode:'));
});

test('jwt strategy validates student pe', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'auth', 'jwt.strategy.ts'),
    'utf8',
  );
  assert.ok(src.includes('studentSessionEpochOk'));
  assert.ok(src.includes('UserRole.STUDENT'));
});

test('password change bumps session epoch', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'students', 'students.service.ts'),
    'utf8',
  );
  const block = src.slice(
    src.indexOf('async update('),
    src.indexOf('async refreshLoginCode'),
  );
  assert.ok(block.includes('bumpSessionEpoch'));
  assert.ok(block.includes('dto.password'));
});

console.log('all passed');
