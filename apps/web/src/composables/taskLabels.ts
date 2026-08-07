/** Shared task/schedule/category labels for student + parent views */

const SCHEDULE_LABELS: Record<string, string> = {
  once: '一次性',
  daily: '每天',
  weekly: '每周',
}

/** Parent task list historically used 每日 */
const SCHEDULE_LABELS_LIST: Record<string, string> = {
  once: '一次性',
  daily: '每日',
  weekly: '每周',
}

const CATEGORY_LABELS: Record<string, string> = {
  study: '学习',
  chore: '家务',
  routine: '习惯',
  eq: '情商',
}

export function labelSchedule(schedule: string, style: 'plain' | 'list' = 'plain') {
  const map = style === 'list' ? SCHEDULE_LABELS_LIST : SCHEDULE_LABELS
  return map[schedule] || schedule
}

export function labelCategory(category: string) {
  return CATEGORY_LABELS[category] || '学习'
}

export function labelTarget(t: {
  targetType?: string
  targetValue?: number
}) {
  if (t.targetType === 'once') return '完成一次'
  if (t.targetType === 'count') return `${t.targetValue ?? 0} 次`
  if (t.targetType === 'duration') return `${t.targetValue ?? 0} 分钟`
  return String(t.targetValue ?? '')
}
