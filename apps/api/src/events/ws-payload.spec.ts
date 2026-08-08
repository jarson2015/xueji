/**
 * P2: WS events use thin DTOs; ping does not echo body.
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

const apiSrc = (...p: string[]) =>
  fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

console.log('ws-payload unit tests');

test('wish:proposed emits thin payload', () => {
  const src = apiSrc('wishes', 'wishes.service.ts');
  const i = src.indexOf("wish:proposed'");
  assert.ok(i > 0);
  const block = src.slice(i, i + 280);
  assert.ok(block.includes('wishId:'));
  assert.ok(!block.includes('wish,'));
});

test('task:proposed emits thin payload', () => {
  const src = apiSrc('tasks', 'tasks.service.ts');
  const i = src.indexOf("task:proposed'");
  assert.ok(i > 0);
  const block = src.slice(i, i + 280);
  assert.ok(block.includes('proposalId:'));
  assert.ok(!block.includes('proposal: row'));
});

test('redeem:requested emits thin redeem/wish', () => {
  const src = apiSrc('wishes', 'wishes.service.ts');
  const i = src.indexOf("redeem:requested'");
  assert.ok(i > 0);
  const block = src.slice(i, i + 400);
  assert.ok(block.includes('redeem: {'));
  assert.ok(block.includes('wish: { title:'));
});

test('ping does not echo client body', () => {
  const src = apiSrc('events', 'events.gateway.ts');
  const i = src.indexOf("SubscribeMessage('ping')");
  assert.ok(i > 0);
  const block = src.slice(i, i + 200);
  assert.ok(block.includes('ok: true'));
  assert.ok(!block.includes('data: body'));
});

console.log('all passed');
