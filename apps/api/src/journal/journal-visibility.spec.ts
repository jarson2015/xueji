/**
 * 家庭手账列表可见性补足
 * run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import { canViewerSeePost, fillVisiblePosts } from './journal-visibility';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('journal-visibility unit tests');

test('学生看不到他人仅家长帖', () => {
  assert.strictEqual(
    canViewerSeePost('parents', { isParent: false, viewerId: 2, authorId: 1 }),
    false,
  );
  assert.strictEqual(
    canViewerSeePost('parents', { isParent: false, viewerId: 1, authorId: 1 }),
    true,
  );
  assert.strictEqual(
    canViewerSeePost('family', { isParent: false, viewerId: 2, authorId: 1 }),
    true,
  );
});

test('混排时凑满 limit', () => {
  const rows = [
    { id: 10, authorId: 1, visibility: 'parents' },
    { id: 9, authorId: 1, visibility: 'parents' },
    { id: 8, authorId: 2, visibility: 'family' },
    { id: 7, authorId: 1, visibility: 'parents' },
    { id: 6, authorId: 3, visibility: 'family' },
    { id: 5, authorId: 1, visibility: 'parents' },
  ];
  const filled = fillVisiblePosts(rows, {
    isParent: false,
    viewerId: 2,
    limit: 2,
  });
  assert.strictEqual(filled.length, 2);
  assert.deepStrictEqual(
    filled.map((r) => r.id),
    [8, 6],
  );
});

console.log('journal-visibility: ok');
