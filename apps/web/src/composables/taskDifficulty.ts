/** 任务难度阶梯 — 与后端 task-difficulty 对齐 */

export const DIFFICULTY_OPTIONS = [
  { value: 'intro', label: '入门' },
  { value: 'practice', label: '熟练' },
  { value: 'challenge', label: '挑战' },
] as const

export function difficultyLabel(level: string | null | undefined): string {
  const hit = DIFFICULTY_OPTIONS.find((o) => o.value === level)
  return hit?.label || '熟练'
}
