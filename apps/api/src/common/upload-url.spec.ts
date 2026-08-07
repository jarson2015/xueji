/**
 * Lightweight unit tests — run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import {
  normalizeUploadPath,
  signUploadPath,
  verifyUploadAccess,
  generateNumericLoginCode,
  randomInviteAlphabetCode,
  signUploadUrlsInData,
  requireSafeUploadPath,
} from './upload-url';

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

console.log('upload-url unit tests');

test('normalizes and signs upload paths', () => {
  const now = Math.floor(Date.now() / 1000);
  const signed = signUploadPath('/uploads/a.jpg', 60, now);
  assert.ok(signed.startsWith('/uploads/a.jpg?exp='));
  assert.ok(signed.includes('sig='));
  const u = new URL(signed, 'http://local');
  assert.strictEqual(
    verifyUploadAccess(
      '/uploads/a.jpg',
      u.searchParams.get('exp') || undefined,
      u.searchParams.get('sig') || undefined,
    ),
    true,
  );
});

test('rejects missing or bad signatures', () => {
  assert.strictEqual(verifyUploadAccess('/uploads/a.jpg', undefined, undefined), false);
  assert.strictEqual(
    verifyUploadAccess('/uploads/a.jpg', '9999999999', 'ab'.repeat(32)),
    false,
  );
});

test('rejects path traversal in normalize', () => {
  assert.strictEqual(normalizeUploadPath('/uploads/../etc/passwd'), null);
  assert.strictEqual(normalizeUploadPath('/uploads/a/b.jpg'), null);
});

test('requireSafeUploadPath accepts local uploads and rejects external', () => {
  assert.strictEqual(
    requireSafeUploadPath('/uploads/a.jpg?exp=1&sig=x'),
    '/uploads/a.jpg',
  );
  let blocked = false;
  try {
    requireSafeUploadPath('https://evil.example/x.png');
  } catch {
    blocked = true;
  }
  assert.ok(blocked);
  blocked = false;
  try {
    requireSafeUploadPath('/uploads/../etc/passwd');
  } catch {
    blocked = true;
  }
  assert.ok(blocked);
});

test('generateNumericLoginCode is 6 digits', () => {
  for (let i = 0; i < 20; i++) {
    const c = generateNumericLoginCode();
    assert.ok(/^\d{6}$/.test(c));
  }
});

test('invite codes use safe alphabet', () => {
  const c = randomInviteAlphabetCode(6);
  assert.strictEqual(c.length, 6);
  assert.ok(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(c));
});

test('signUploadUrlsInData signs nested imageUrl', () => {
  const out = signUploadUrlsInData({
    imageUrl: '/uploads/x.png',
    nested: [{ imageUrl: '/uploads/y.jpg' }],
  });
  assert.ok(String(out.imageUrl).includes('sig='));
  assert.ok(String(out.nested[0].imageUrl).includes('sig='));
});

process.env.JWT_SECRET = prev;
console.log('all passed');
