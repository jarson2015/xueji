/**
 * SEC PR3: @ForbidProxy coverage on sensitive student writes.
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

/** Handler block must contain @ForbidProxy near the route. */
function assertForbidNear(src: string, routeMarker: string) {
  const i = src.indexOf(routeMarker);
  assert.ok(i >= 0, `missing ${routeMarker}`);
  const window = src.slice(Math.max(0, i - 200), i + 120);
  assert.ok(
    window.includes('@ForbidProxy()') || window.includes('@ForbidProxy('),
    `${routeMarker} should have @ForbidProxy nearby`,
  );
}

console.log('forbid-proxy unit tests');

test('wishes propose/redeem/ack forbid proxy', () => {
  const src = apiSrc('wishes', 'wishes.controller.ts');
  assert.ok(src.includes('ForbidProxyGuard'));
  assertForbidNear(src, "Post('wishes/propose')");
  assertForbidNear(src, "Post('wishes/:id/redeem')");
  assertForbidNear(src, "Post('my/redeems/:id/ack')");
});

test('tasks propose and defer-today forbid proxy', () => {
  const src = apiSrc('tasks', 'tasks.controller.ts');
  assert.ok(src.includes('ForbidProxyGuard'));
  assertForbidNear(src, "Post('tasks/propose')");
  assertForbidNear(src, "Post('my/assigns/:id/defer-today')");
});

test('student weekly-goal and weekend-review writes forbid proxy', () => {
  const src = apiSrc('students', 'student-me.controller.ts');
  assert.ok(src.includes('ForbidProxyGuard'));
  assertForbidNear(src, "Put('my/weekly-goal')");
  assertForbidNear(src, "Put('my/weekend-review')");
  // daily-focus intentionally allows proxy assist
  const focus = src.slice(
    src.indexOf("Put('my/daily-focus')"),
    src.indexOf("Get('my/weekend-review')"),
  );
  assert.ok(!focus.includes('@ForbidProxy'));
});

test('checkins create intentionally allows proxy (shared-device代登)', () => {
  const src = apiSrc('checkins', 'checkins.controller.ts');
  const block = src.slice(
    src.indexOf("Post('checkins')"),
    src.indexOf("Get('checkins')"),
  );
  assert.ok(!block.includes('@ForbidProxy'));
});

test('gifts/pacts student writes use ForbidProxy', () => {
  assert.ok(apiSrc('gifts', 'gifts.controller.ts').includes('@ForbidProxy()'));
  assert.ok(apiSrc('pacts', 'pacts.controller.ts').includes('@ForbidProxy()'));
});

console.log('all passed');
