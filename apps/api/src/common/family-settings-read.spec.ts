/**
 * Guard: GET settings path must not imply silent rewardMode writes.
 * Static check on family.service source (see package.json test:unit).
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

const src = fs.readFileSync(
  path.join(__dirname, '..', 'family', 'family.service.ts'),
  'utf8',
);

console.log('family-settings-read unit tests');

test('getOrCreate uses virtualDefaults and does not save on miss', () => {
  assert.ok(src.includes('virtualDefaults'));
  assert.ok(src.includes('Does NOT insert'));
  const getBlock = src.slice(
    src.indexOf('async getOrCreate'),
    src.indexOf('async update'),
  );
  assert.ok(!getBlock.includes('this.settings.save'));
  assert.ok(getBlock.includes('virtualDefaults'));
});

test('first persist defaults rewardMode to always', () => {
  assert.ok(src.includes("rewardMode: 'always'"));
  assert.ok(src.includes("avoid column default 'random'"));
});

console.log('all passed');
