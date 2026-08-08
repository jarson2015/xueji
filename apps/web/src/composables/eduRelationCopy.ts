/** E1 关系优先 / 防工具化 · 共享文案与纯函数（不写库） */

/** 模式句 / 词云用途声明（unit 锁关键字） */
export const NOT_SCORE_DISCLAIMER = '用来聊聊，不是评分。'

export function assertsNotScoreDisclaimer(text: string): boolean {
  return text.includes('用来聊聊') && text.includes('不是评分')
}

/** 家长教育设置：加分三阶段共见契约 */
export const FADE_PACT_STAGES_NOTE =
  '家庭加分三阶段：① 每次加分（建习惯）→ ② 有时加分 → ③ 周末一起看故事结算。改节奏后孩子端会看到「我们家在练习少靠积分」。保存后才生效，不会悄悄改。'

/** 学生可见一句（可 dismiss） */
export const FADE_PACT_STUDENT_LINE = '我们家在练习少靠积分'

const KEY_FADE_PACT_DISMISS = 'xueji_fade_pact_banner_dismiss'

export function isFadedRewardMode(mode?: string | null): boolean {
  return mode === 'random' || mode === 'weekly_digest'
}

export function shouldShowFadePactBanner(
  rewardMode?: string | null,
  storage: Pick<Storage, 'getItem'> = localStorage,
): boolean {
  if (!isFadedRewardMode(rewardMode)) return false
  return storage.getItem(KEY_FADE_PACT_DISMISS) !== '1'
}

export function dismissFadePactBanner(
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(KEY_FADE_PACT_DISMISS, '1')
}

export function clearFadePactBannerDismiss(
  storage: Pick<Storage, 'removeItem'> = localStorage,
): void {
  storage.removeItem(KEY_FADE_PACT_DISMISS)
}

/** 兴趣任务勾选时建议积分 */
export const INTEREST_SUGGESTED_POINTS = 0

export const INTEREST_ZERO_HINT =
  '兴趣探索建议 0 分：先保护好奇与投入；若需要仍可改回正分。'

/** 家长过载 · 求助资源（静态，非诊疗；E4.4 与 teenPrivacy 同源） */
export {
  HELP_RESOURCES_TITLE as RELIEF_HELP_TITLE,
  HELP_RESOURCES_BODY as RELIEF_HELP_MESSAGE,
} from './teenPrivacy'
