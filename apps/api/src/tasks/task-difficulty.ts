/** 任务难度阶梯 — 纯函数 */

export const DIFFICULTY_LEVELS = ['intro', 'practice', 'challenge'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  intro: '入门',
  practice: '熟练',
  challenge: '挑战',
};

export function normalizeDifficultyLevel(
  level: string | null | undefined,
): DifficultyLevel {
  if (level === 'intro' || level === 'challenge') return level;
  return 'practice';
}

/** 完成次数达标时建议升一档（仅 intro→practice、practice→challenge） */
export function suggestDifficultyUpgrade(
  completions: number,
  level: string | null | undefined,
): { suggest: boolean; nextLevel: DifficultyLevel | null; message: string | null } {
  const cur = normalizeDifficultyLevel(level);
  if (cur === 'intro' && completions >= 5) {
    return {
      suggest: true,
      nextLevel: 'practice',
      message: '已经稳定完成入门档，可以试试「熟练」难度',
    };
  }
  if (cur === 'practice' && completions >= 10) {
    return {
      suggest: true,
      nextLevel: 'challenge',
      message: '节奏很稳，可以试「挑战」档加一点点难度',
    };
  }
  return { suggest: false, nextLevel: null, message: null };
}

export function difficultyLabel(level: string | null | undefined): string {
  return DIFFICULTY_LABELS[normalizeDifficultyLevel(level)];
}
