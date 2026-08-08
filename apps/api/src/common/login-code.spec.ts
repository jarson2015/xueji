import assert from 'assert';
import {
  generateLoginCode,
  hashLoginCode,
  isValidLoginCodeFormat,
  loginCodeHint,
  LOGIN_CODE_LENGTH,
  normalizeLoginCodeInput,
} from './login-code';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

const prev = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'test-secret-key-at-least-24chars!!';

console.log('login-code unit tests');

test('generateLoginCode is 8 digits', () => {
  for (let i = 0; i < 20; i++) {
    const c = generateLoginCode();
    assert.strictEqual(c.length, LOGIN_CODE_LENGTH);
    assert.ok(/^\d{8}$/.test(c));
  }
});

test('hashLoginCode is stable and not plaintext', () => {
  const a = hashLoginCode('10293847');
  const b = hashLoginCode('10293847');
  assert.strictEqual(a, b);
  assert.strictEqual(a.length, 64);
  assert.ok(!a.includes('10293847'));
  assert.notStrictEqual(hashLoginCode('10293848'), a);
});

test('normalize and validate accept 6–8 digits', () => {
  assert.strictEqual(normalizeLoginCodeInput(' 12-34-56 '), '123456');
  assert.ok(isValidLoginCodeFormat('123456'));
  assert.ok(isValidLoginCodeFormat('12345678'));
  assert.ok(!isValidLoginCodeFormat('12345'));
  assert.ok(!isValidLoginCodeFormat('123456789'));
});

test('loginCodeHint is last two digits', () => {
  assert.strictEqual(loginCodeHint('10293847'), '47');
});

process.env.JWT_SECRET = prev;
console.log('all passed');
