import { journalProductName } from './journalLabels'

/** 与后端 iso 周大致对齐的本地周键（周一为一周起点） */
export function journalTipWeekKey(d = new Date()): string {
  const day = d.getDay() || 7
  const monday = new Date(d)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(d.getDate() - day + 1)
  const y = monday.getFullYear()
  const oneJan = new Date(y, 0, 1)
  const week = Math.ceil(
    ((monday.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7,
  )
  return `${y}-W${String(week).padStart(2, '0')}`
}

const tipKey = (week: string) => `xueji_journal_soft_tip_dismiss_${week}`

export function isJournalSoftTipDismissed(week = journalTipWeekKey()): boolean {
  return localStorage.getItem(tipKey(week)) === '1'
}

export function dismissJournalSoftTip(week = journalTipWeekKey()) {
  localStorage.setItem(tipKey(week), '1')
}

export function journalSoftTipCopy(
  weekPostCount: number,
  ageBand?: string,
): { title: string; message: string; action: string } | null {
  if (weekPostCount <= 0) return null
  const name = journalProductName(ageBand)
  return {
    title: `本周有 ${weekPostCount} 条${name}`,
    message: '不计分、不进待办。想看看家人写了什么吗？',
    action: `去${name}`,
  }
}
