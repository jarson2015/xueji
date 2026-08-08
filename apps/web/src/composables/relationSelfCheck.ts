/**
 * E5.2 月度自愿关系自检 — 本地、可跳过、不打分不上榜。
 */

export type SelfCheckAnswer = 'yes' | 'partial' | 'no' | 'skip'

export type SelfCheckQuestion = {
  id: string
  text: string
}

export const RELATION_SELF_CHECK_QUESTIONS: SelfCheckQuestion[] = [
  {
    id: 'chat',
    text: '这个月，有没有一次不被评价的聊天（不谈分数、不谈对错）？',
  },
  {
    id: 'order',
    text: '孩子有没有自己选过「先做哪一件」或提议过一件小事？',
  },
  {
    id: 'reduce',
    text: '任务太满时，有没有真的减过量，而不是只口头说说？',
  },
  {
    id: 'praise',
    text: '表扬时，有没有至少一次说具体过程，而不是只说「真棒」？',
  },
  {
    id: 'rest',
    text: '家里有没有留出不被任务占满的休息或一起玩的时间？',
  },
]

const KEY_PREFIX = 'xueji_relation_selfcheck_'

export function currentMonthKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export type SelfCheckRecord = {
  month: string
  /** questionId → answer；未答可缺省 */
  answers: Record<string, SelfCheckAnswer>
  /** 整月跳过 */
  skipped?: boolean
  updatedAt: number
}

export function storageKey(month = currentMonthKey()): string {
  return `${KEY_PREFIX}${month}`
}

export function readSelfCheck(
  month = currentMonthKey(),
  storage: Pick<Storage, 'getItem'> = localStorage,
): SelfCheckRecord | null {
  try {
    const raw = storage.getItem(storageKey(month))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SelfCheckRecord
    if (!parsed || parsed.month !== month) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSelfCheck(
  record: SelfCheckRecord,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(storageKey(record.month), JSON.stringify(record))
}

export function skipSelfCheckThisMonth(
  month = currentMonthKey(),
  storage: Pick<Storage, 'setItem' | 'getItem'> = localStorage,
): SelfCheckRecord {
  const record: SelfCheckRecord = {
    month,
    answers: {},
    skipped: true,
    updatedAt: Date.now(),
  }
  writeSelfCheck(record, storage)
  return record
}

export function saveSelfCheckAnswers(
  answers: Record<string, SelfCheckAnswer>,
  month = currentMonthKey(),
  storage: Pick<Storage, 'setItem'> = localStorage,
): SelfCheckRecord {
  const record: SelfCheckRecord = {
    month,
    answers: { ...answers },
    skipped: false,
    updatedAt: Date.now(),
  }
  writeSelfCheck(record, storage)
  return record
}

/** 不产生分数、排行或等级 */
export function assertsNoScoringCopy(text: string): boolean {
  return !/得分|排名|排行|等级|合格|不及格|家庭分/.test(text)
}

export const SELF_CHECK_DISCLAIMER =
  '自愿填写，可随时跳过。只留给你自己看，不算分、不上榜、不上传。'

export const SELF_CHECK_DONE_NOTE =
  '已记下本月自检。没有对错分，有一两项「还没有」也很正常——选一件小事试试就好。'
