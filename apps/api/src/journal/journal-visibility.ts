/**
 * 可见性过滤后凑满 limit（避免「仅家长」帖挤占学生端一页）
 */
export function canViewerSeePost(
  visibility: string,
  opts: { isParent: boolean; viewerId: number; authorId: number },
): boolean {
  if (visibility === 'family') return true;
  if (visibility === 'parents') {
    return opts.isParent || opts.authorId === opts.viewerId;
  }
  return false;
}

export function fillVisiblePosts<T extends { visibility: string; authorId: number; id: number }>(
  candidates: T[],
  opts: { isParent: boolean; viewerId: number; limit: number },
): T[] {
  const out: T[] = [];
  for (const p of candidates) {
    if (
      canViewerSeePost(p.visibility, {
        isParent: opts.isParent,
        viewerId: opts.viewerId,
        authorId: p.authorId,
      })
    ) {
      out.push(p);
      if (out.length >= opts.limit) break;
    }
  }
  return out;
}
