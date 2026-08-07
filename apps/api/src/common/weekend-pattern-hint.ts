/**
 * 周末小会本周模式一句（API 侧）
 * run via ts-node in unit suite if needed; mirrored on web
 */
export function buildWeekendPatternHint(opts: {
  deferCount: number;
  moodTiredOrHard: number;
  reflectionCount: number;
  journalWeekCount: number;
}): string | null {
  const parts: string[] = [];
  if (opts.deferCount >= 3) {
    parts.push('这周缓做用得比较多，节奏可能偏紧');
  }
  if (opts.moodTiredOrHard >= 2) {
    parts.push('打卡前「累/难」出现得较多');
  }
  if (opts.reflectionCount >= 2) {
    parts.push('有留下反思，值得一起听听');
  }
  if (opts.journalWeekCount >= 1) {
    parts.push(`家庭说说本周有 ${opts.journalWeekCount} 条`);
  }
  if (!parts.length) return null;
  return parts.slice(0, 2).join('；') + '。小会里可以只挑一件聊聊。';
}
