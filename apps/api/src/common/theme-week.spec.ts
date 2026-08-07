/**
 * 主题周预设与软建议 — 与 web themeWeek 对齐。
 * run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import {
  THEME_WEEK_PRESETS,
  THEME_TASK_SUGGESTIONS,
  resolveThemeTitle,
  isValidThemePreset,
  suggestionsForThemePreset,
} from './theme-week';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('theme-week unit tests');

test('预设至少 6 个（含 custom）', () => {
  assert.ok(THEME_WEEK_PRESETS.length >= 6);
  const codes = THEME_WEEK_PRESETS.map((p) => p.code);
  for (const c of ['on_time', 'gratitude', 'tidy', 'kindness', 'focus', 'custom']) {
    assert.ok(codes.includes(c as any), `missing ${c}`);
  }
});

test('resolveThemeTitle：显式标题优先，否则用预设名', () => {
  assert.strictEqual(resolveThemeTitle('tidy', '我家整理周'), '我家整理周');
  assert.strictEqual(resolveThemeTitle('tidy', ''), '小整理');
  assert.strictEqual(resolveThemeTitle('custom', ''), '自己定');
  assert.strictEqual(resolveThemeTitle('', ''), '');
});

test('isValidThemePreset', () => {
  assert.strictEqual(isValidThemePreset(''), true);
  assert.strictEqual(isValidThemePreset('focus'), true);
  assert.strictEqual(isValidThemePreset('nope'), false);
});

test('suggestionsForThemePreset：已知预设有芯片，custom/空无', () => {
  assert.ok(suggestionsForThemePreset('tidy').length > 0);
  assert.deepStrictEqual(suggestionsForThemePreset('custom'), []);
  assert.deepStrictEqual(suggestionsForThemePreset(''), []);
  for (const key of Object.keys(THEME_TASK_SUGGESTIONS)) {
    assert.ok(suggestionsForThemePreset(key).length >= 2);
  }
});

console.log('theme-week unit tests passed');
