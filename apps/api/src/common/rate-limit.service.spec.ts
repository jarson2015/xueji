import assert from 'assert';
import { RateLimitService } from './rate-limit.service';
import { HttpException } from '@nestjs/common';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('rate-limit unit tests');

test('allows within limit then blocks', () => {
  const rl = new RateLimitService();
  rl.consume('t1', 2, 60_000);
  rl.consume('t1', 2, 60_000);
  let blocked = false;
  try {
    rl.consume('t1', 2, 60_000);
  } catch (e) {
    blocked = e instanceof HttpException;
  }
  assert.ok(blocked);
});

test('separate keys are independent', () => {
  const rl = new RateLimitService();
  rl.consume('a', 1, 60_000);
  rl.consume('b', 1, 60_000);
  assert.ok(rl.size() >= 2);
});

console.log('rate-limit unit tests: ok');
