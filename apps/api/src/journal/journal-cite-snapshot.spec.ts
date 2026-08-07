/**
 * 周末小会引用摘要截取
 * run via ts-node (see package.json test:unit)
 */
import assert from 'assert';

export function snapshotJournalSummary(
  body: string | null | undefined,
  max = 120,
): string {
  const t = (body || '').trim().slice(0, max);
  return t || '（附图）';
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('journal-cite-snapshot unit tests');

test('截取正文', () => {
  assert.strictEqual(snapshotJournalSummary('今天跳绳成功了'), '今天跳绳成功了');
});

test('空正文用附图占位', () => {
  assert.strictEqual(snapshotJournalSummary(''), '（附图）');
  assert.strictEqual(snapshotJournalSummary(null), '（附图）');
});

test('超长截断', () => {
  const long = '啊'.repeat(200);
  assert.strictEqual(snapshotJournalSummary(long).length, 120);
});

console.log('journal-cite-snapshot: ok');
