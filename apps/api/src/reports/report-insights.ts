/**
 * 周报洞察：情绪词云与家长鼓励 — 纯函数，便于单测。
 */

export const REFLECTION_CHIP_WORDS = [
  '今天状态不错',
  '有点难但挺住了',
  '做完好开心',
  '下次想提前开始',
];

const EMOTION_RULES: { word: string; patterns: RegExp[] }[] = [
  { word: '开心', patterns: [/开心/, /高兴/, /不错/, /好开心/, /棒/] },
  { word: '有点难', patterns: [/难/, /挑战/, /挺住/, /不容易/] },
  { word: '累', patterns: [/累/, /疲惫/, /困/, /没精神/] },
  { word: '感谢', patterns: [/感谢/, /谢谢/, /感恩/] },
  { word: '专注', patterns: [/专注/, /认真/, /投入/] },
  { word: '期待', patterns: [/期待/, /想试/, /下次/] },
];

export function extractEmotionTags(text: string | null | undefined): string[] {
  const t = (text || '').trim();
  if (!t) return [];
  const tags = new Set<string>();
  for (const chip of REFLECTION_CHIP_WORDS) {
    if (t.includes(chip)) tags.add(chip);
  }
  for (const rule of EMOTION_RULES) {
    if (rule.patterns.some((p) => p.test(t))) tags.add(rule.word);
  }
  return [...tags];
}

export function buildEmotionWordCloud(
  texts: (string | null | undefined)[],
): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of texts) {
    for (const tag of extractEmotionTags(raw)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export type ParentEncouragementHighlight = {
  checkinId: number;
  date: string;
  studentId: number;
  studentName?: string;
  taskTitle: string;
  comment: string;
  liked: boolean;
};

export function buildParentEncouragementHighlight(
  rows: {
    id: number;
    createdAt: Date | string;
    studentId: number;
    studentName?: string;
    taskTitle?: string;
    parentComment?: string | null;
    parentLiked?: boolean;
  }[],
): ParentEncouragementHighlight | null {
  for (const r of rows) {
    const comment = r.parentComment?.trim();
    if (!comment && !r.parentLiked) continue;
    const date =
      typeof r.createdAt === 'string'
        ? r.createdAt.slice(0, 10)
        : new Date(r.createdAt).toISOString().slice(0, 10);
    return {
      checkinId: r.id,
      date,
      studentId: r.studentId,
      studentName: r.studentName,
      taskTitle: r.taskTitle || '打卡',
      comment: comment || '家长为你点了赞',
      liked: !!r.parentLiked,
    };
  }
  return null;
}
