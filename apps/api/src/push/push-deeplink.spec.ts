/**
 * 家长离屏推送深链回归 — 扫描调用方，防止回退到学生壳。
 * run via ts-node (see package.json test:unit)
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

function readSrc(...parts: string[]) {
  return fs.readFileSync(path.join(__dirname, ...parts), 'utf8');
}

console.log('push-deeplink unit tests');

test('PushService 默认 url 为 /（无学生今日回退）', () => {
  const src = readSrc('push.service.ts');
  assert.ok(src.includes("url: payload.url || '/'"));
  assert.ok(!src.includes("'/student/today'"));
});

test('待确认打卡 → /parent/monitor', () => {
  const src = readSrc('..', 'checkins', 'checkins.service.ts');
  assert.ok(src.includes("url: '/parent/monitor'"));
  const block = src.slice(
    src.indexOf('requireConfirm && parentIds.length'),
    src.indexOf('requireConfirm && parentIds.length') + 600,
  );
  assert.ok(block.includes("url: '/parent/monitor'"));
  assert.ok(!block.includes("'/student/today'"));
});

test('兑换申请 → /parent/wishes', () => {
  const src = readSrc('..', 'wishes', 'wishes.service.ts');
  const idx = src.indexOf("title: '兑换申请'");
  assert.ok(idx > 0);
  const block = src.slice(idx, idx + 280);
  assert.ok(block.includes("url: '/parent/wishes'"));
  assert.ok(!block.includes("'/student/today'"));
});

test('任务提议 → /parent/monitor（看板待处理）', () => {
  const src = readSrc('..', 'tasks', 'tasks.service.ts');
  const idx = src.indexOf("title: '任务提议'");
  assert.ok(idx > 0);
  const block = src.slice(idx, idx + 280);
  assert.ok(block.includes("url: '/parent/monitor'"));
  assert.ok(!block.includes("'/student/today'"));
});

test('SW 缺省 url 为 /', () => {
  const sw = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'web', 'public', 'sw.js'),
    'utf8',
  );
  assert.ok(sw.includes("url: '/'") || sw.includes('url: "/"'));
  assert.ok(sw.includes("data.url || '/'") || sw.includes('data.url || "/"'));
  assert.ok(!sw.includes("'/student/today'"));
});

console.log('push-deeplink unit tests passed');
