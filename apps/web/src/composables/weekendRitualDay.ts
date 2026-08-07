/** 周五–日：看板周末小会横幅可见日（本地星期） */

export function isWeekendRitualDay(d: Date = new Date()): boolean {
  const day = d.getDay() // 0=日 … 5=五 6=六
  return day === 0 || day === 5 || day === 6
}
