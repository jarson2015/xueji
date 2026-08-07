/**
 * 手机看板「动态与洞察」默认展开策略。
 * @returns 应设置的 senseOpen；`null` 表示不自动改（非手机或用户已手动点过）
 */
export function defaultSenseOpen(opts: {
  isPhone: boolean
  userTouched: boolean
  insightCount: number
  pendingCount: number
}): boolean | null {
  if (opts.userTouched || !opts.isPhone) return null
  if (opts.pendingCount > 0) return false
  return opts.insightCount > 0
}
