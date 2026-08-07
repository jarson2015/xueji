/**
 * 邀请码接受限流 — run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import { HttpException } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import {
  INVITE_ACCEPT_IP_LIMIT,
  INVITE_ACCEPT_USER_LIMIT,
  INVITE_ACCEPT_WINDOW_MS,
  inviteAcceptIpKey,
  inviteAcceptUserKey,
} from './invite-rate-policy';
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

console.log('invite-rate unit tests');

test('配额：IP 10 / 用户 8 / 窗 15min', () => {
  assert.strictEqual(INVITE_ACCEPT_IP_LIMIT, 10);
  assert.strictEqual(INVITE_ACCEPT_USER_LIMIT, 8);
  assert.strictEqual(INVITE_ACCEPT_WINDOW_MS, 15 * 60 * 1000);
});

test('IP 桶超限抛 429', () => {
  const rl = new RateLimitService();
  const key = inviteAcceptIpKey('127.0.0.1');
  for (let i = 0; i < INVITE_ACCEPT_IP_LIMIT; i++) {
    rl.consume(key, INVITE_ACCEPT_IP_LIMIT, INVITE_ACCEPT_WINDOW_MS);
  }
  let status = 0;
  try {
    rl.consume(key, INVITE_ACCEPT_IP_LIMIT, INVITE_ACCEPT_WINDOW_MS);
  } catch (e: any) {
    status = e?.status || e?.getStatus?.() || 0;
    assert.ok(e instanceof HttpException);
    assert.ok(String(e.message).includes('太频繁'));
  }
  assert.strictEqual(status, 429);
});

test('用户桶与 IP 桶独立', () => {
  const rl = new RateLimitService();
  const ipKey = inviteAcceptIpKey('10.0.0.1');
  const userKey = inviteAcceptUserKey(42);
  for (let i = 0; i < INVITE_ACCEPT_USER_LIMIT; i++) {
    rl.consume(userKey, INVITE_ACCEPT_USER_LIMIT, INVITE_ACCEPT_WINDOW_MS);
  }
  // 用户已满，IP 仍可
  rl.consume(ipKey, INVITE_ACCEPT_IP_LIMIT, INVITE_ACCEPT_WINDOW_MS);
  let blocked = false;
  try {
    rl.consume(userKey, INVITE_ACCEPT_USER_LIMIT, INVITE_ACCEPT_WINDOW_MS);
  } catch {
    blocked = true;
  }
  assert.ok(blocked);
});

test('family.controller 使用策略常量与 key', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'family', 'family.controller.ts'),
    'utf8',
  );
  assert.ok(src.includes('inviteAcceptIpKey'));
  assert.ok(src.includes('inviteAcceptUserKey'));
  assert.ok(src.includes('INVITE_ACCEPT_IP_LIMIT'));
  assert.ok(src.includes('INVITE_ACCEPT_USER_LIMIT'));
});

console.log('invite-rate unit tests passed');
