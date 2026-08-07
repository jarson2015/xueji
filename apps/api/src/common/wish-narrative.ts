import { WishType } from './enums';

/** 用户可见名称（展示层）；库表仍用 golden_finger */
export const FAMILY_HELP_CARD_LABEL = '家庭互助卡';

export function isFamilyHelpCard(type?: string | null): boolean {
  return type === WishType.GOLDEN_FINGER;
}

export function defaultFamilyHelpCardTitle(): string {
  return `${FAMILY_HELP_CARD_LABEL}（先缓缓做家务）`;
}
