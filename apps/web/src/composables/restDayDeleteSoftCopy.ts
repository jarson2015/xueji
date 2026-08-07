/** 休息日「拿到今日」与家长单条删任务 SoftPrompt 文案 */

export function buildRestDayBringSoftMessage(): string {
  return '今天是家庭休息日，学习类任务先不催你。想做也可以自愿拿到今日；不想做就先休息。'
}

export function buildDeleteTaskSoftMessage(title: string): string {
  return `确定永久删除「${title}」？孩子将立刻看不到该任务；历史打卡与积分记录会保留。`
}

export const REST_DAY_SOFT = {
  title: '休息日',
  confirmText: '拿到今日',
  cancelText: '先休息',
} as const

export const DELETE_TASK_SOFT = {
  title: '删除任务',
  confirmText: '删除',
  cancelText: '取消',
} as const
