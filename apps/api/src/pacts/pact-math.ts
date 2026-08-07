import { addShanghaiDays, todayStr } from '../common/date-util';

/** 日历日差：end - start（YYYY-MM-DD，上海日历语义） */
export function shanghaiDayDiff(start: string, end: string): number {
  if (end <= start) return 0;
  let n = 0;
  let d = addShanghaiDays(start, 1);
  while (d <= end) {
    n++;
    if (n > 400) break;
    d = addShanghaiDays(d, 1);
  }
  return n;
}

/**
 * 逾期天数：约定还回日当天不算逾期；次日起每天 +1。
 * 目标逾期补分 = min(逾期天数, maxExtra)
 */
export function targetOverdueExtra(
  dueDate: string,
  maxExtra: number,
  today = todayStr(),
): number {
  const days = shanghaiDayDiff(dueDate, today);
  if (days <= 0 || maxExtra <= 0) return 0;
  return Math.min(days, maxExtra);
}

/** 大额家长闸：approveAbove=0 关闭；否则 amount >= 阈值需家长先同意 */
export function needsParentGate(
  amountPoints: number,
  approveAbove: number,
): boolean {
  return approveAbove > 0 && amountPoints >= approveAbove;
}

/**
 * 逾期展示用：列表只读计算，不写库。
 * 持久化计提请走 accrue（还回/详情打开时）。
 */
export function displayOverdueExtra(
  dueDate: string,
  accrued: number,
  paid: number,
  maxExtra: number,
  today = todayStr(),
): { displayAccrued: number; extraDue: number } {
  const target = targetOverdueExtra(dueDate, maxExtra, today);
  const displayAccrued = Math.max(accrued || 0, target);
  const extraDue = Math.max(0, displayAccrued - (paid || 0));
  return { displayAccrued, extraDue };
}

/** 按时还回：还回日当天及之前，且无逾期补分 */
export function isPactOnTime(
  dueDate: string,
  extraDue: number,
  today = todayStr(),
): boolean {
  return today <= dueDate && extraDue <= 0;
}
