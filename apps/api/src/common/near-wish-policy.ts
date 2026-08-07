/** 近端愿望策略（与家长 UI 模板分值区间对齐） */
export const MAX_ACTIVE_NEAR_TERM_WISHES = 3;
export const NEAR_TERM_COST_MIN = 5;
export const NEAR_TERM_COST_MAX = 20;

export function isNearTermRoomFull(activeNearCount: number): boolean {
  return activeNearCount >= MAX_ACTIVE_NEAR_TERM_WISHES;
}

export function isNearTermCostInRange(cost: number): boolean {
  return (
    Number.isFinite(cost) &&
    cost >= NEAR_TERM_COST_MIN &&
    cost <= NEAR_TERM_COST_MAX
  );
}

/** nextWish：有近端则只在近端池选；优先「下一个够不到的」，否则池内首条。
 *  调用方应先按 costPoints ASC 排序（与 ProgressExtrasService 一致）。 */
export function pickNextWishTarget<
  T extends { costPoints: number; isNearTerm?: boolean },
>(wishes: T[], balance: number): T | null {
  if (!wishes.length) return null;
  const near = wishes.filter((w) => w.isNearTerm);
  const pool = near.length ? near : wishes;
  return pool.find((w) => w.costPoints > balance) || pool[0];
}
