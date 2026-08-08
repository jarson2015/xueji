/**
 * E3 情绪功能分类 — 给家长的旁注脚手架，不对学生打分。
 * 四类：耗竭 / 能力威胁 / 关系威胁 / 意义缺失
 */

export type EmotionFunctionKind =
  | 'exhaustion'
  | 'competence_threat'
  | 'relation_threat'
  | 'meaning_gap'

export type EmotionFunctionSignals = {
  /** 打卡前「累」次数（本周等） */
  moodTired?: number
  /** 打卡前「难」次数 */
  moodHard?: number
  /** 缓做次数 */
  deferCount?: number
  /** 家长过载洞察是否亮起 */
  parentOverload?: boolean
  /** 手足公平类洞察 */
  fairnessHint?: boolean
  /** 兴趣/意义类教练提示 */
  meaningCoach?: boolean
  /** 本周模式原文（可选，用于从文案启发式） */
  weekPatternText?: string | null
}

export type EmotionFunctionHint = {
  kind: EmotionFunctionKind
  /** 含「可能」，可忽略 */
  parentNote: string
  label: string
}

const NOTES: Record<EmotionFunctionKind, { label: string; parentNote: string }> = {
  exhaustion: {
    label: '可能是耗竭',
    parentNote:
      '可能是累了或节奏太满，而不是「态度不好」。可以先减量、先休息，再谈任务。',
  },
  competence_threat: {
    label: '可能是能力受挫',
    parentNote:
      '可能是怕做错或觉得太难。适合拆成更小一步，少用「再改改」否定整个人。',
  },
  relation_threat: {
    label: '可能是关系压力',
    parentNote:
      '可能是被比较、被监视或不公平感。适合私聊、对称认错，少公开点名。',
  },
  meaning_gap: {
    label: '可能是缺少意义',
    parentNote:
      '可能不是偷懒，而是不知道「为什么值得做」。可以加一句意义，或给一点选择权。',
  },
}

function inferFromPatternText(text: string): Partial<EmotionFunctionSignals> {
  const t = text || ''
  return {
    deferCount: /缓做/.test(t) ? 3 : 0,
    moodTired: /累/.test(t) ? 2 : 0,
    moodHard: /难/.test(t) ? 2 : 0,
    meaningCoach: /反思|说说/.test(t),
  }
}

/**
 * 启发式分类：有信号才返回；多信号时按优先级取一类。
 * 优先级：耗竭 > 能力 > 关系 > 意义（先保身心与安全）。
 */
export function classifyEmotionFunction(
  raw: EmotionFunctionSignals,
): EmotionFunctionHint | null {
  const fromText = raw.weekPatternText
    ? inferFromPatternText(raw.weekPatternText)
    : {}
  const s: EmotionFunctionSignals = {
    moodTired: raw.moodTired ?? fromText.moodTired ?? 0,
    moodHard: raw.moodHard ?? fromText.moodHard ?? 0,
    deferCount: raw.deferCount ?? fromText.deferCount ?? 0,
    parentOverload: raw.parentOverload ?? false,
    fairnessHint: raw.fairnessHint ?? false,
    meaningCoach: raw.meaningCoach ?? fromText.meaningCoach ?? false,
  }

  const tired = s.moodTired || 0
  const hard = s.moodHard || 0
  const defer = s.deferCount || 0

  let kind: EmotionFunctionKind | null = null
  if (s.parentOverload || tired >= 2 || (defer >= 3 && tired >= 1)) {
    kind = 'exhaustion'
  } else if (hard >= 2 || (hard >= 1 && defer >= 2)) {
    kind = 'competence_threat'
  } else if (s.fairnessHint) {
    kind = 'relation_threat'
  } else if (s.meaningCoach || (defer >= 3 && tired < 1 && hard < 1)) {
    kind = 'meaning_gap'
  }

  if (!kind) return null
  const meta = NOTES[kind]
  return { kind, label: meta.label, parentNote: meta.parentNote }
}

/** 家长说说 / 确认芯片（每类 ≤3，禁止绩效夸） */
export const EMOTION_FUNCTION_CHIPS: Record<
  EmotionFunctionKind,
  readonly string[]
> = {
  exhaustion: ['先歇一会儿也没关系', '今天已经够了', '我在，不着急'],
  competence_threat: ['我们拆小一点试试', '不怕慢，怕羞于开口', '我陪你看哪里卡住'],
  relation_threat: ['不是在比较你们', '我想先听听你的感受', '刚才若让你难堪，对不起'],
  meaning_gap: ['这件事和你在意的…有关吗', '你想怎么安排顺序', '愿意多说一点为什么吗'],
}

export function chipsForEmotionFunction(
  kind?: EmotionFunctionKind | null,
): readonly string[] {
  if (!kind) return []
  return EMOTION_FUNCTION_CHIPS[kind]
}

export function assertsNoScoreLanguage(text: string): boolean {
  return !/评分|打分|排名|情绪分|态度分/.test(text)
}

/** 考试周 / 周末弱策略（前端日历启发式） */
export type CalendarSoftKind = 'exam_season' | 'weekend'

export function calendarSoftStrategy(
  now = new Date(),
): { kind: CalendarSoftKind; message: string } | null {
  const day = now.getDay()
  const month = now.getMonth() + 1
  if (day === 0 || day === 6) {
    return {
      kind: 'weekend',
      message:
        '周末适合少催任务、多留不被评价的聊天。看板完成率可以先收着。',
    }
  }
  // 粗启发式：期末/期中常见月份工作日
  if ([5, 6, 11, 12, 1].includes(month)) {
    return {
      kind: 'exam_season',
      message:
        '可能临近考试或学业高峰：建议减少新愿望刺激、少加任务，先保睡眠与关系。',
    }
  }
  return null
}

const KEY_CAL_DISMISS_PREFIX = 'xueji_cal_soft_'

export function calendarDismissKey(kind: CalendarSoftKind, now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  if (kind === 'weekend') return `${KEY_CAL_DISMISS_PREFIX}weekend_${y}-${m}-${d}`
  return `${KEY_CAL_DISMISS_PREFIX}exam_${y}-${m}`
}

export function isCalendarSoftDismissed(
  kind: CalendarSoftKind,
  now = new Date(),
  storage: Pick<Storage, 'getItem'> = localStorage,
): boolean {
  return storage.getItem(calendarDismissKey(kind, now)) === '1'
}

export function dismissCalendarSoft(
  kind: CalendarSoftKind,
  now = new Date(),
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(calendarDismissKey(kind, now), '1')
}
