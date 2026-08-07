/** 学生 More / 关功能空态：少死路 */

export function showStudentOptionalSection(flags: {
  allowance?: boolean
  pacts?: boolean
}): boolean {
  return !!(flags.allowance || flags.pacts)
}

export const DISABLED_ALLOWANCE_CTA = {
  label: '去愿望商店',
  path: '/student/rewards',
} as const

export const DISABLED_PACTS_CTA = {
  label: '回到今日',
  path: '/student/today',
} as const

/** 关功能空态不得指向公约（教育设置才是开启处） */
export function isDeadEndCovenantPath(path: string): boolean {
  return /\/student\/covenant/.test(path)
}
