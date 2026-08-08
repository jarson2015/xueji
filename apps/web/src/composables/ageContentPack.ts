/**
 * E2 分龄内容包 — 表驱动；不新增 age_band 枚举。
 * 今日可见条数与 timeSlotPolicy 对齐，避免两套口径。
 */
import { MOOD_OPTIONS } from './eduMood'
import {
  maxVisibleInCurrentSlot,
  type AgeBand as SlotAgeBand,
} from './timeSlotPolicy'
import { pointsUnitLabel, usesStarNarrative } from './pointsNarrative'
import { WEEKEND_STEP_SECONDS } from './weekendRitual'

export type AgeBandKey = 'young' | 'general' | 'teen'

export type AgeContentPack = {
  band: AgeBandKey
  /** 今日当前窗默认可见条数（与 buildSlotWindow 一致） */
  todayDefaultVisible: number
  /** 小会内容面板下标：0 骄傲 / 1 改一件 / 2 承诺 */
  weekendPanelIndices: readonly number[]
  weekendStepSeconds: readonly number[]
  weekendLead: string
  weekendTotalHint: string
  /** 心情词表（MOOD_OPTIONS 子集） */
  moodTags: readonly string[]
  tokenNarrative: 'stars' | 'points' | 'quiet'
  proposeStripProminent: boolean
  reorderProminent: boolean
  balanceDeemphasized: boolean
  /** 家长愿望页非买物引导；null 表示不额外强调 */
  nonBuyWishHint: string | null
  celebrateTone: 'co_regulate' | 'default' | 'quiet'
  /** 家长「通过并点赞」模板 */
  approveTemplates: readonly string[]
}

const YOUNG_APPROVE = [
  '我看见你做到了',
  '今天你很努力，我在这儿',
  '我们一起慢慢来',
] as const

const GENERAL_APPROVE = [
  '这一步方法用得不错',
  '节奏稳住了，继续这样就好',
  '看到你有在想办法',
  '做完告诉我一声，我给你点赞',
] as const

const TEEN_APPROVE = [
  '这步你自己安排得清楚',
  '方法对了，比催更重要',
  '看到你有在调整节奏',
] as const

const PACKS: Record<AgeBandKey, AgeContentPack> = {
  young: {
    band: 'young',
    todayDefaultVisible: maxVisibleInCurrentSlot('young'),
    weekendPanelIndices: [0, 2],
    weekendStepSeconds: [3 * 60, 2 * 60],
    weekendLead: '两步小仪式：骄傲 · 感谢',
    weekendTotalHint: '建议一共大约 10 分钟内，能短就短',
    moodTags: ['happy', 'ok', 'tired'],
    tokenNarrative: 'stars',
    proposeStripProminent: false,
    reorderProminent: false,
    balanceDeemphasized: false,
    nonBuyWishHint: null,
    celebrateTone: 'co_regulate',
    approveTemplates: YOUNG_APPROVE,
  },
  general: {
    band: 'general',
    todayDefaultVisible: maxVisibleInCurrentSlot('general'),
    weekendPanelIndices: [0, 1, 2],
    weekendStepSeconds: [...WEEKEND_STEP_SECONDS],
    weekendLead: '三步小仪式：骄傲 · 改一件 · 陪伴承诺',
    weekendTotalHint: '每步可计时，也可跳过',
    moodTags: ['happy', 'ok', 'tired', 'hard'],
    tokenNarrative: 'points',
    proposeStripProminent: false,
    reorderProminent: false,
    balanceDeemphasized: false,
    nonBuyWishHint:
      '愿望尽量偏陪伴、体验、选择权；物品可有，但建议非买物占一半以上，少一点「用分买东西」。',
    celebrateTone: 'default',
    approveTemplates: GENERAL_APPROVE,
  },
  teen: {
    band: 'teen',
    todayDefaultVisible: maxVisibleInCurrentSlot('teen'),
    weekendPanelIndices: [0, 1, 2],
    weekendStepSeconds: [...WEEKEND_STEP_SECONDS],
    weekendLead: '三步小仪式：骄傲 · 改一件 · 下阶段约定',
    weekendTotalHint: '可双周开一次；少翻旧账，多谈下一步',
    moodTags: ['happy', 'ok', 'tired', 'hard'],
    tokenNarrative: 'quiet',
    proposeStripProminent: true,
    reorderProminent: true,
    balanceDeemphasized: true,
    nonBuyWishHint:
      '少年更适合时间与决定权类愿望；积分只是工具，别让余额抢戏。',
    celebrateTone: 'quiet',
    approveTemplates: TEEN_APPROVE,
  },
}

export function normalizeAgeBand(band?: string | null): AgeBandKey {
  if (band === 'young' || band === 'teen') return band
  return 'general'
}

export function getAgeContentPack(band?: string | null): AgeContentPack {
  return PACKS[normalizeAgeBand(band)]
}

export function moodOptionsForBand(band?: string | null) {
  const pack = getAgeContentPack(band)
  const allow = new Set(pack.moodTags)
  return MOOD_OPTIONS.filter((m) => allow.has(m.tag))
}

export function weekendStepCount(band?: string | null): number {
  return getAgeContentPack(band).weekendPanelIndices.length
}

/** 展示步下标 → 内容面板下标（骄傲/改一件/承诺） */
export function weekendPanelIndex(
  band: string | null | undefined,
  displayStep: number,
): number {
  const panels = getAgeContentPack(band).weekendPanelIndices
  const i = Math.max(0, Math.min(displayStep, panels.length - 1))
  return panels[i] ?? 0
}

export function weekendSecondsForDisplayStep(
  band: string | null | undefined,
  displayStep: number,
): number {
  const pack = getAgeContentPack(band)
  const i = Math.max(0, Math.min(displayStep, pack.weekendStepSeconds.length - 1))
  return pack.weekendStepSeconds[i] ?? 180
}

export function pointsUnitForPack(band?: string | null) {
  const b = normalizeAgeBand(band)
  if (getAgeContentPack(b).tokenNarrative === 'stars' || usesStarNarrative(b)) {
    return pointsUnitLabel('young')
  }
  return pointsUnitLabel(b)
}

export function asSlotAgeBand(band?: string | null): SlotAgeBand {
  return normalizeAgeBand(band)
}
