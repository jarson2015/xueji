/**
 * Pure task lifecycle helpers — single source for expiry / makeup / period rules.
 * Used by checkins, tasks normalize, dashboard; covered by unit tests.
 */

import {
  getPeriodKey,
  isOnceDeadlineExpired,
  formatDate,
  addShanghaiDays,
} from '../common/date-util';

export type MakeupConfig = {
  enabled: boolean;
  discountPercent: number;
  windowDays: number;
};

export function calcMakeupPoints(
  pointsReward: number,
  discountPercent: number,
): number {
  return Math.max(0, Math.floor((pointsReward * discountPercent) / 100));
}

export function isExpiredOnceTask(
  schedule: string,
  deadline: Date | string | null | undefined,
  now = new Date(),
): boolean {
  return isOnceDeadlineExpired(schedule, deadline, now);
}

/** Whether a makeup period key is within the allowed window (daily/weekly). */
export function isMakeupWithinWindow(
  makeupPeriodKey: string,
  windowDays: number,
  now = new Date(),
): boolean {
  if (makeupPeriodKey === 'once') return true;
  const dayPart = makeupPeriodKey.replace(/^[dw]:/, '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayPart)) return false;
  const today = formatDate(now);
  // earliest allowed = today - windowDays
  const earliest = addShanghaiDays(today, -windowDays);
  return dayPart >= earliest && dayPart <= today;
}

export function resolveMakeupPeriodKey(
  schedule: string,
  dtoKey: string | undefined,
  isExpiredOnce: boolean,
  opts?: {
    storedPeriod?: string | null;
    currentKey?: string;
    now?: Date;
  },
): string | null {
  if (isExpiredOnce || schedule === 'once') return 'once';
  if (dtoKey) return dtoKey;
  const now = opts?.now ?? new Date();
  const current = opts?.currentKey ?? currentPeriodKey(schedule, now);
  if (opts?.storedPeriod && opts.storedPeriod !== current) {
    return opts.storedPeriod;
  }
  // No rolled period and no dto key → caller should reject
  return null;
}

export function currentPeriodKey(schedule: string, now = new Date()): string {
  return getPeriodKey(schedule, now);
}

/** Whether stored period is behind the current calendar period */
export function isPeriodRolled(
  schedule: string,
  storedPeriod: string | null | undefined,
  now = new Date(),
): boolean {
  if (schedule === 'once' || !storedPeriod) return false;
  return storedPeriod !== currentPeriodKey(schedule, now);
}

/**
 * Single source for list/UI makeup eligibility (tasks normalize, wishes chores).
 */
export function resolveMakeupEligibility(opts: {
  schedule: string;
  storedPeriod: string | null | undefined;
  progressPercent: number;
  status: string;
  deadline: Date | string | null | undefined;
  /** Already completed for current period (after rollover reset) */
  done: boolean;
  now?: Date;
}): {
  isExpired: boolean;
  canMakeup: boolean;
  makeupPeriodKey: string | null;
  rolled: boolean;
  currentKey: string;
} {
  const now = opts.now ?? new Date();
  const currentKey = currentPeriodKey(opts.schedule, now);
  const rolled = isPeriodRolled(opts.schedule, opts.storedPeriod, now);
  const isExpired =
    !opts.done && isExpiredOnceTask(opts.schedule, opts.deadline, now);
  let canMakeup = isExpired;
  let makeupPeriodKey: string | null = isExpired ? 'once' : null;
  if (
    !isExpired &&
    rolled &&
    opts.storedPeriod &&
    opts.progressPercent < 100 &&
    opts.status !== 'completed'
  ) {
    canMakeup = true;
    makeupPeriodKey = opts.storedPeriod;
  }
  return { isExpired, canMakeup, makeupPeriodKey, rolled, currentKey };
}

/** Should normal (non-makeup) checkin be blocked due to expiry? */
export function shouldBlockNormalCheckinForExpiry(
  schedule: string,
  deadline: Date | string | null | undefined,
  isMakeup: boolean,
  now = new Date(),
): boolean {
  if (isMakeup) return false;
  return isExpiredOnceTask(schedule, deadline, now);
}

/**
 * Reward fade: whether to award points this time.
 * - always: yes
 * - random: ~55% chance (encourage fading extrinsic reward)
 * - weekly_digest: no per-checkin points (settled on weekend / report)
 */
export function shouldAwardPointsNow(
  rewardMode: string,
  opts?: { randomRoll?: number },
): boolean {
  if (rewardMode === 'weekly_digest') return false;
  if (rewardMode === 'random') {
    const roll = opts?.randomRoll ?? Math.random();
    return roll < 0.55;
  }
  return true;
}

/** Shanghai weekday 0=Sun … 6=Sat */
export function shanghaiWeekday(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
  }).formatToParts(date);
  const w = parts.find((p) => p.type === 'weekday')?.value || '';
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[w] ?? date.getDay();
}

/** Auto-settle weekly_digest on Sat / Sun / Mon so kids are not blocked on opening report */
export function shouldAutoSettleWeeklyDigest(date = new Date()): boolean {
  const dow = shanghaiWeekday(date);
  return dow === 0 || dow === 1 || dow === 6;
}

export type RewardFadeHint = {
  show: boolean;
  message: string;
  suggestMode: 'random' | 'weekly_digest';
};

/**
 * Suggest fading from always after ~14 days of family settings or strong streak.
 */
function familySettingsAgeDays(
  settingsCreatedAt: Date | string | null | undefined,
  now: Date,
): number {
  if (!settingsCreatedAt) return 0;
  const created = new Date(settingsCreatedAt);
  return Math.floor(
    (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000),
  );
}

export function buildRewardFadeHint(
  rewardMode: string,
  settingsCreatedAt: Date | string | null | undefined,
  opts?: { streak?: number; now?: Date },
): RewardFadeHint | null {
  if (rewardMode !== 'always') return null;
  const now = opts?.now ?? new Date();
  const ageDays = familySettingsAgeDays(settingsCreatedAt, now);
  const streak = opts?.streak ?? 0;
  if (ageDays < 7 && streak < 7) return null;
  return {
    show: true,
    suggestMode: streak >= 21 || ageDays >= 28 ? 'weekly_digest' : 'random',
    message:
      streak >= 21 || ageDays >= 28
        ? '习惯已经很稳了。可以试试「周末一起结算」：日常先庆祝，周末一起看故事和积分，少一点为分而做。'
        : '已经坚持一段时间了。可以试试「有时加分」：完成仍庆祝，积分偶尔惊喜出现。',
  };
}

/**
 * 渐进日程第二步：random → weekly_digest（新家庭默认 random 后的下一阶段）。
 */
export function buildGradualRewardFadeHint(
  rewardMode: string,
  settingsCreatedAt: Date | string | null | undefined,
  opts?: { streak?: number; now?: Date },
): RewardFadeHint | null {
  if (rewardMode !== 'random') return null;
  const now = opts?.now ?? new Date();
  const ageDays = familySettingsAgeDays(settingsCreatedAt, now);
  const streak = opts?.streak ?? 0;
  if (ageDays < 14 && streak < 14) return null;
  return {
    show: true,
    suggestMode: 'weekly_digest',
    message:
      '「有时加分」已经陪你们走了一段路。可以试试「周末一起结算」：平日先庆祝完成，周末一起回顾本周故事。',
  };
}

/** always → random → weekly_digest 链式淡出建议 */
export function resolveRewardFadeHint(
  rewardMode: string,
  settingsCreatedAt: Date | string | null | undefined,
  opts?: { streak?: number; now?: Date },
): RewardFadeHint | null {
  return (
    buildRewardFadeHint(rewardMode, settingsCreatedAt, opts) ||
    buildGradualRewardFadeHint(rewardMode, settingsCreatedAt, opts)
  );
}

/** 约定页展示的渐进日程说明（只读文案） */
export function rewardFadeScheduleNote(rewardMode: string): string | null {
  if (rewardMode === 'always') {
    return '建议路线：先庆祝完成 → 约 1 周后试「有时加分」→ 习惯稳住后试「周末一起结算」。';
  }
  if (rewardMode === 'random') {
    return '当前是「有时加分」：完成仍庆祝，积分偶尔惊喜。稳住后可试「周末一起结算」。';
  }
  if (rewardMode === 'weekly_digest') {
    return '当前是「周末一起结算」：平日专注过程，周末一起看积分故事。';
  }
  return null;
}

/** EQ / SEL tasks tagged via sourceTemplateId eq-* */
export function isEqSourceTemplate(
  sourceTemplateId: string | null | undefined,
): boolean {
  return !!sourceTemplateId && sourceTemplateId.startsWith('eq-');
}

export const REFLECTION_PROMPTS = [
  '哪一步最难？',
  '下次可以怎么做？',
  '今天有什么值得感谢的？',
  '完成时心情怎么样？',
];

/** Younger kids: short emotion / sensory prompts */
export const REFLECTION_PROMPTS_YOUNG = [
  '完成时心情怎么样？',
  '今天有什么值得感谢的？',
  '哪一步最难？',
];

/** Teens: strategy / autonomy */
export const REFLECTION_PROMPTS_TEEN = [
  '下次可以怎么做？',
  '哪一步最难？你打算怎么解决？',
  '有没有想过找谁帮忙？',
  '这件事对你自己有什么用？',
];

export function pickReflectionPrompt(
  ageBand: string,
  salt: number,
): string {
  const list =
    ageBand === 'teen'
      ? REFLECTION_PROMPTS_TEEN
      : ageBand === 'young'
        ? REFLECTION_PROMPTS_YOUNG
        : REFLECTION_PROMPTS;
  const i = Math.abs(salt) % list.length;
  return list[i];
}

/**
 * 过程/成长归因句：庆祝时放在积分之前，强化胜任感而非分数。
 */
export function buildGrowthHint(opts: {
  ageBand?: string;
  isMakeup?: boolean;
  requireConfirm?: boolean;
  rewardSkipped?: boolean;
  streak?: number;
  usedFocus?: boolean;
  hadSkipQuotaLeft?: boolean;
  skipsUsedToday?: number;
  isInterest?: boolean;
}): string {
  if (opts.isMakeup) {
    return opts.ageBand === 'young'
      ? '特殊情况也收了尾，真棒'
      : '特殊情况也把事情收了尾，这很负责';
  }
  if (opts.isInterest) {
    return opts.ageBand === 'teen'
      ? '今天把兴趣坚持了一轮，好奇本身就很珍贵'
      : opts.ageBand === 'young'
        ? '你认真探索了，真棒'
        : '你认真投入了兴趣，这比分数更珍贵';
  }
  if (opts.usedFocus) {
    return opts.ageBand === 'teen'
      ? '你专注做完了一轮，节奏感不错'
      : '你专注做完了一轮，为自己鼓鼓掌';
  }
  if (opts.requireConfirm) {
    return '你认真做完了，先为自己鼓鼓掌';
  }
  const streak = opts.streak || 0;
  if (streak >= 7) {
    return '这阵子节奏很稳，继续按自己的步调来';
  }
  if (streak >= 3) {
    return '最近几天都有在坚持，节奏在变稳';
  }
  if (opts.rewardSkipped) {
    return '做完本身就很好，分数只是顺便的';
  }
  if ((opts.skipsUsedToday || 0) === 0 && opts.hadSkipQuotaLeft !== false) {
    return opts.ageBand === 'young'
      ? '今天没有先放着，直接做完啦'
      : '今天没用缓做就做完，对自己说话算数';
  }
  return opts.ageBand === 'young'
    ? '这件事你做到了'
    : '这件事你靠自己完成了';
}