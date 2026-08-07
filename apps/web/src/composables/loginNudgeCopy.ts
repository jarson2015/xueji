/** 登录码数字键可读名称 */

export function numKeyLabel(n: string): string {
  if (n === 'del') return '删除一位'
  if (n === '清空') return '清空登录码'
  return `数字 ${n}`
}

/** 轻轻提醒成功：最多一条；有 parentHint 优先用它 */
export function buildNudgeSuccessToast(
  studentName: string,
  parentHint?: string | null,
): string {
  const hint = String(parentHint || '').trim()
  if (hint) return hint
  return `已轻轻提醒 ${studentName}`
}
