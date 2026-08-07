/** 家长教练型洞察 — 基于模式，非打分 */

export type ParentCoachInsight = {
  kind: string;
  message: string;
  suggestion: string;
};

export function buildParentCoachInsights(opts: {
  moodTiredCount: number;
  moodHardCount: number;
  deferCount: number;
  focusUsedCount: number;
  confirmRate: number;
  slotDoneRates: { slot: string; rate: number }[];
  reflectionCount: number;
}): ParentCoachInsight[] {
  const out: ParentCoachInsight[] = [];

  if (opts.moodTiredCount >= 2 || opts.moodHardCount >= 2) {
    out.push({
      kind: 'mood',
      message: '这周打卡前情绪里「累/难」出现得比较多',
      suggestion: '可以少排一两件，或把难的任务拆成更小的一步',
    });
  }

  if (opts.deferCount >= 3) {
    out.push({
      kind: 'defer',
      message: '缓做用得比较勤，说明节奏可能偏紧',
      suggestion: '试试合并相似任务，或把确认闸只留给争议项',
    });
  }

  const bestSlot = [...opts.slotDoneRates].sort((a, b) => b.rate - a.rate)[0];
  if (bestSlot && bestSlot.rate >= 0.6 && opts.slotDoneRates.length >= 2) {
    out.push({
      kind: 'slot',
      message: `「${slotLabel(bestSlot.slot)}」时段完成率更高`,
      suggestion: '把新习惯尽量放在这个时段，更容易坚持',
    });
  }

  if (opts.confirmRate >= 0.4) {
    out.push({
      kind: 'confirm',
      message: '需要家长确认的任务占比较高',
      suggestion: '日常习惯建议信任闭环；确认留给家务或大额争议项',
    });
  }

  if (opts.focusUsedCount >= 2 && opts.reflectionCount >= 2) {
    out.push({
      kind: 'focus',
      message: '孩子有在用专注计时并写反思',
      suggestion: '可以少催、多问「今天哪一步最有帮助」',
    });
  }

  return out.slice(0, 3);
}

function slotLabel(slot: string): string {
  const map: Record<string, string> = {
    after_wake: '起床后',
    after_school: '放学后',
    after_dinner: '晚饭后',
    bedtime: '睡前',
    anytime: '随时',
    before_school: '上学前',
    after_breakfast: '早餐后',
    after_lunch: '午餐后',
  };
  return map[slot] || slot;
}
