/** 用户可见名称；API 枚举仍为 golden_finger */
export const FAMILY_HELP_CARD_LABEL = '家庭互助卡'

export function isFamilyHelpCard(type?: string | null): boolean {
  return type === 'golden_finger'
}

export function familyHelpCardShort(): string {
  return FAMILY_HELP_CARD_LABEL
}
