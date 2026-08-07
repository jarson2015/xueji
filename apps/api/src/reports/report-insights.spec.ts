/**
 * Lightweight unit tests — run via npm run test:unit (add to script if needed)
 */
import assert from 'assert';
import {
  buildEmotionWordCloud,
  buildParentEncouragementHighlight,
  extractEmotionTags,
} from './report-insights';

function test(name: string, fn: () => void) {
  fn();
  console.log(`  ✓ ${name}`);
}

console.log('report-insights unit tests');

test('extractEmotionTags from chips and mood words', () => {
  const tags = extractEmotionTags('今天状态不错，做完好开心');
  assert.ok(tags.includes('今天状态不错'));
  assert.ok(tags.includes('开心'));
});

test('buildEmotionWordCloud aggregates', () => {
  const cloud = buildEmotionWordCloud([
    '有点难但挺住了',
    '今天状态不错',
    '有点难但挺住了',
  ]);
  assert.ok(cloud.length >= 2);
  assert.strictEqual(cloud[0].word, '有点难但挺住了');
});

test('buildParentEncouragementHighlight picks latest with comment', () => {
  const row = buildParentEncouragementHighlight([
    {
      id: 2,
      createdAt: '2026-07-10',
      studentId: 1,
      studentName: '小明',
      taskTitle: '阅读',
      parentComment: '今天读得很投入',
      parentLiked: true,
    },
    {
      id: 1,
      createdAt: '2026-07-09',
      studentId: 1,
      parentComment: '旧留言',
    },
  ]);
  assert.strictEqual(row?.comment, '今天读得很投入');
});

console.log('report-insights.spec.ts ok');
