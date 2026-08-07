/**
 * 低龄展示层「星星」叙事：底层仍是积分，不改 ledger。
 */
export function usesStarNarrative(ageBand: string) {
  return ageBand === 'young'
}

export function pointsUnitLabel(ageBand: string) {
  return usesStarNarrative(ageBand) ? '星星' : '积分'
}

export function pointsBalanceLabel(ageBand: string) {
  return usesStarNarrative(ageBand) ? '我的星星' : '当前积分'
}

export function pointsAwardLabel(ageBand: string, n: number) {
  const unit = pointsUnitLabel(ageBand)
  if (usesStarNarrative(ageBand)) return `顺便点亮 +${n} ${unit}`
  return `顺便得到 +${n} ${unit}`
}

export function formatBalance(ageBand: string, n: number) {
  return `${n} ${pointsUnitLabel(ageBand)}`
}
