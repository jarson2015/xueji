/** 家务 / 生活习惯：休息日仍出现、仍计连续打卡 */
export function isLifeHabitCategory(category: string | null | undefined): boolean {
  return category === 'chore' || category === 'routine'
}

/** 休息日是否仍要求/展示该任务（与后端 rest-day-policy 对齐） */
export function showsOnRestDay(task: {
  schedule?: string
  category?: string | null
}): boolean {
  if (task.schedule === 'once') return true
  return isLifeHabitCategory(task.category)
}
