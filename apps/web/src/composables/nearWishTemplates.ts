import {
  NEAR_TERM_COST_MAX,
  NEAR_TERM_COST_MIN,
} from './nearWishPolicy'

/** 家长添加愿望：近端快捷模板（体验 / 陪伴 / 选择权） */
export const NEAR_TERM_TEMPLATES = [
  { title: '多陪 10 分钟', kind: 'company' as const, costPoints: 10 },
  { title: '选今晚故事', kind: 'choice' as const, costPoints: 10 },
  { title: '周末多玩一会儿', kind: 'experience' as const, costPoints: 15 },
  { title: '一起散步 15 分钟', kind: 'company' as const, costPoints: 15 },
  { title: '决定今晚加餐小点心', kind: 'choice' as const, costPoints: 10 },
  { title: '公园玩一圈', kind: 'experience' as const, costPoints: 20 },
  { title: '家长陪做一件兴趣事', kind: 'company' as const, costPoints: 15 },
  { title: '今晚晚睡 15 分钟', kind: 'choice' as const, costPoints: 15 },
] as const

export const NEAR_TERM_PRICE_CHIPS = [5, 10, 15, 20] as const

export function nearTermTemplatesValid(
  templates: ReadonlyArray<{ costPoints: number }> = NEAR_TERM_TEMPLATES,
): boolean {
  if (templates.length < 6) return false
  return templates.every(
    (t) =>
      t.costPoints >= NEAR_TERM_COST_MIN && t.costPoints <= NEAR_TERM_COST_MAX,
  )
}
