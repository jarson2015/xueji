import assert from 'node:assert/strict';
import {
  effectiveSlotClockMap,
  sanitizeSlotClockMap,
} from './slot-clock';

assert.equal(sanitizeSlotClockMap(null), null);
assert.equal(sanitizeSlotClockMap({ bogus: { startHour: 1, endHour: 2 } }), null);

const cleaned = sanitizeSlotClockMap({
  after_school: { startHour: 15, endHour: 19 },
  anytime: { startHour: 0, endHour: 1 },
  bad: { startHour: 99, endHour: 1 },
});
assert.deepEqual(cleaned, {
  after_school: { startHour: 15, endHour: 19 },
});

const base = effectiveSlotClockMap(false, null);
assert.equal(base.after_wake.startHour, 6);
assert.equal(base.after_wake.endHour, 9);
assert.equal(base.after_breakfast, undefined);

const ext = effectiveSlotClockMap(true, {
  after_school: { startHour: 15, endHour: 18 },
});
assert.equal(ext.before_school.startHour, 8);
assert.equal(ext.after_school.startHour, 15);

console.log('slot-clock.spec.ts ok');
