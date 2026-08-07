import { TaskCategory } from './enums';

/** 休息日暂停策略（仅在 isRestDay=true 时参与过滤） */
export type RestPausePolicy = {
  /** 暂停全部任务（含一次性） */
  pauseAll: boolean;
  /** 暂停的循环任务类别；pauseAll 为 true 时忽略 */
  pauseCategories: string[];
};

/** 家务 / 生活习惯（旧语义辅助） */
export function isLifeHabitCategory(
  category: string | null | undefined,
): boolean {
  return (
    category === TaskCategory.CHORE || category === TaskCategory.ROUTINE
  );
}

const DEFAULT_PAUSE: RestPausePolicy = {
  pauseAll: false,
  pauseCategories: [TaskCategory.STUDY],
};

/**
 * 休息日是否仍展示该任务。
 * - pauseAll：全部不展示
 * - 一次性：非 pauseAll 时始终展示（减少截止惊吓）
 * - 循环：类别在 pauseCategories 中则隐藏
 */
export function showsOnRestDay(
  task: {
    schedule: string;
    category?: string | null;
  },
  pause: RestPausePolicy = DEFAULT_PAUSE,
): boolean {
  if (pause.pauseAll) return false;
  if (task.schedule === 'once') return true;
  const cat = task.category || TaskCategory.STUDY;
  const cats = pause.pauseCategories?.length
    ? pause.pauseCategories
    : DEFAULT_PAUSE.pauseCategories;
  return !cats.includes(cat);
}

/** 连续打卡是否因休息日「暂停不断」——仅对已暂停类别生效 */
export function streakPausesOnRestDay(
  category: string | null | undefined,
  pause: RestPausePolicy = DEFAULT_PAUSE,
): boolean {
  if (pause.pauseAll) return true;
  const cat = category || TaskCategory.STUDY;
  const cats = pause.pauseCategories?.length
    ? pause.pauseCategories
    : DEFAULT_PAUSE.pauseCategories;
  return cats.includes(cat);
}

export function normalizePauseCategories(
  raw: string[] | null | undefined,
): string[] {
  const allowed = new Set<string>([
    TaskCategory.STUDY,
    TaskCategory.CHORE,
    TaskCategory.ROUTINE,
  ]);
  const list = (raw || [])
    .map((c) => String(c || '').trim())
    .filter((c) => allowed.has(c));
  return [...new Set(list)];
}
