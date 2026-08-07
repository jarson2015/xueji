/**
 * Allowance save-first helpers — pure functions for unit tests.
 */

/** Yuan cents required to save this week before free spend. */
export function requiredSaveCents(
  allowanceWeeklyCents: number | null | undefined,
  savePercent: number,
): number {
  const pct = Math.max(0, Math.min(50, savePercent || 0));
  if (pct <= 0) return 0;
  const weekly = Math.max(0, allowanceWeeklyCents ?? 0);
  if (weekly <= 0) return 1; // at least 1 cent = "save something"
  return Math.floor((weekly * pct) / 100);
}

/**
 * Whether student may spend now under save-first policy.
 * Parents bypass this at the service layer.
 */
export function canSpendAfterSaveFirst(
  weekSavedCents: number,
  requiredCents: number,
): { ok: boolean; lackCents: number } {
  if (requiredCents <= 0) return { ok: true, lackCents: 0 };
  const lack = Math.max(0, requiredCents - Math.max(0, weekSavedCents));
  return { ok: lack === 0, lackCents: lack };
}

/** Prefer less extrinsic reward when co-parents disagree. */
export function mergeRewardModes(modes: string[]): string {
  const rank: Record<string, number> = {
    weekly_digest: 0,
    random: 1,
    always: 2,
  };
  let best = 'always';
  let bestRank = 99;
  for (const m of modes) {
    const key = m || 'always';
    const r = rank[key] ?? 2;
    if (r < bestRank) {
      bestRank = r;
      best = key;
    }
  }
  return best;
}

/** Suggested parent-gate threshold by age band (lower = stricter). */
export function suggestedPactApproveAbove(ageBand: string): number {
  if (ageBand === 'young') return 10;
  if (ageBand === 'teen') return 30;
  return 20;
}

export type ParentOverloadHint = {
  show: boolean;
  message: string;
  suggestions: string[];
};

/**
 * 家长过载软提示：任务偏多、确认闸过重、待办堆积。
 */
export function buildParentOverloadHint(opts: {
  maxDailyDue: number;
  activeTaskCount: number;
  confirmTaskCount: number;
  pendingConfirms: number;
}): ParentOverloadHint | null {
  const suggestions: string[] = [];
  const confirmRatio =
    opts.activeTaskCount > 0
      ? opts.confirmTaskCount / opts.activeTaskCount
      : 0;

  if (opts.maxDailyDue > 8) {
    suggestions.push('今日待办偏多，试试合并相似任务或先下架几件');
  }
  if (opts.activeTaskCount >= 4 && confirmRatio > 0.4) {
    suggestions.push('需要确认的任务超过四成，日常习惯建议关掉确认闸，信任完成闭环');
  }
  if (opts.pendingConfirms >= 5) {
    suggestions.push('待确认打卡较多，可先批量处理，或减量减轻双方负担');
  }
  if (!suggestions.length) return null;

  return {
    show: true,
    message: '看起来任务或确认有点多，孩子更需要「教练」而不是「监工」',
    suggestions,
  };
}
