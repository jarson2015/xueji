/** Format cents as ¥x.xx (no float math on display path beyond /100). */
export function formatYuan(cents: number | null | undefined): string {
  const n = Number(cents) || 0
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const yuan = Math.floor(abs / 100)
  const fen = abs % 100
  return `${sign}¥${yuan}.${fen.toString().padStart(2, '0')}`
}

export function yuanToCents(yuan: number): number {
  return Math.round(Number(yuan) * 100)
}

export const ALLOWANCE_CATEGORY_LABELS: Record<string, string> = {
  snack: '零食',
  stationery: '文具',
  play: '玩乐',
  gift: '礼物',
  transport: '交通',
  save: '储蓄',
  other: '其他',
}

export const ALLOWANCE_KIND_LABELS: Record<string, string> = {
  pocket_money: '零花钱',
  bonus: '奖励',
  gift_in: '收到礼金',
  spend: '支出',
  save: '存入目标',
  unsave: '取出目标',
  adjust: '校正',
}
