/** 家长 More：客厅导航白话（用户可见，禁止工程口吻） */

export const LIVING_ROOM_COPY = {
  hint: '大屏办公默认是完整侧栏。',
  enable: '用客厅导航',
  disable: '恢复完整导航',
  enabledToast: '已切换客厅导航',
  disabledToast: '已恢复完整导航',
  /** U4.4：状态条白话 */
  statusOn: '当前是客厅导航（扫一眼为主）',
  statusOff: '当前是完整导航',
  statusBar: '客厅导航中',
  restoreShort: '恢复完整导航',
} as const

/** 用户可见串不得出现 URL/查询参数工程口吻 */
export function hasTvQueryJargon(text: string): boolean {
  return /\?tv=|tv=1|tv=true|URL.*tv/i.test(text)
}

export function livingRoomUserFacingTexts(): string[] {
  return Object.values(LIVING_ROOM_COPY)
}
