import assert from 'assert';
import { clientIp } from './client-ip';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('client-ip unit tests');

test('uses req.ip when present', () => {
  assert.strictEqual(clientIp({ ip: '203.0.113.9' }), '203.0.113.9');
});

test('strips ipv6-mapped prefix', () => {
  assert.strictEqual(clientIp({ ip: '::ffff:10.0.0.2' }), '10.0.0.2');
});

test('falls back to socket', () => {
  assert.strictEqual(
    clientIp({ socket: { remoteAddress: '198.51.100.1' } }),
    '198.51.100.1',
  );
});

test('unknown when empty', () => {
  assert.strictEqual(clientIp({}), 'unknown');
});

test('does not trust spoofed forwarded headers on the helper itself', () => {
  const spoofed = {
    ip: '203.0.113.9',
    headers: { 'x-forwarded-for': '1.2.3.4' },
  } as any;
  assert.strictEqual(clientIp(spoofed), '203.0.113.9');
});

console.log('client-ip unit tests: ok');
