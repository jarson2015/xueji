/** 打卡前情绪与修复式拒绝文案 */

export const MOOD_TAGS = ['happy', 'ok', 'tired', 'hard'] as const;
export type MoodTag = (typeof MOOD_TAGS)[number];

export function isValidMoodTag(tag: string | null | undefined): tag is MoodTag {
  return !!tag && (MOOD_TAGS as readonly string[]).includes(tag);
}

export const MOOD_LABELS: Record<MoodTag, string> = {
  happy: '开心',
  ok: '还行',
  tired: '有点累',
  hard: '有点难',
};

export const MOOD_EMOJI: Record<MoodTag, string> = {
  happy: '😊',
  ok: '🙂',
  tired: '😮‍💨',
  hard: '😣',
};

/** 家长拒绝时可一键选用的修复式话术 */
export const REPAIR_REJECT_TEMPLATES = [
  '今天已经努力了，我们明天再试一小步',
  '这次没通过没关系，一起看看哪里可以改',
  '我相信你能做好，我们慢慢来',
  '先休息一会儿，晚点我们再补一小步',
];

export function buildRepairMessage(parentComment: string | null): string {
  const c = parentComment?.trim();
  if (c) return c;
  return '家长想和你再商量一下，不是否定你的努力';
}
