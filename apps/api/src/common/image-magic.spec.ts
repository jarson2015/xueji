/**
 * Lightweight unit tests — run via ts-node
 */
import assert from 'assert';
import { detectImageKind } from './image-magic';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('image-magic unit tests');

test('detects jpeg', () => {
  assert.strictEqual(detectImageKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
});

test('detects png', () => {
  assert.strictEqual(
    detectImageKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'png',
  );
});

test('detects gif89a', () => {
  assert.strictEqual(
    detectImageKind(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])),
    'gif',
  );
});

test('detects webp', () => {
  const b = Buffer.alloc(12);
  b.write('RIFF', 0);
  b.write('WEBP', 8);
  assert.strictEqual(detectImageKind(b), 'webp');
});

test('rejects random bytes', () => {
  assert.strictEqual(detectImageKind(Buffer.from([0x00, 0x01, 0x02, 0x03])), null);
});

console.log('all passed');
