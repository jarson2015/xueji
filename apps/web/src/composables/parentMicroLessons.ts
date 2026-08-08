/**
 * E5.1 家长分龄场景微课 — 只读脚手架，每则 ≤1 屏，带深链。
 * 不诊疗、不打分、不强制阅读。
 */

import type { EmotionFunctionKind } from './emotionFunctionHint'

export type AgeBandFilter = 'young' | 'general' | 'teen' | 'all'

export type MicroLessonLink = {
  label: string
  /** vue-router path */
  to: string
}

export type ParentMicroLesson = {
  id: string
  title: string
  /** 场景短名，列表用 */
  scene: string
  ageBands: AgeBandFilter[]
  /** 正文，保持短 */
  body: string
  /** 可试一句 */
  tryLine: string
  links: MicroLessonLink[]
}

export const PARENT_MICRO_LESSONS: ParentMicroLesson[] = [
  {
    id: 'wont-start',
    title: '孩子说「不想做」',
    scene: '不愿做',
    ageBands: ['all'],
    body:
      '先分清是「累了」还是「怕做不好」。少用「为什么还不做」开场；可以先陪坐一分钟，再一起选「最小一步」。',
    tryLine: '「我们先做两分钟，做完你可以说停。」',
    links: [
      { label: '去减任务', to: '/parent/tasks' },
      { label: '家庭约定', to: '/parent/family-edu' },
    ],
  },
  {
    id: 'quality-rush',
    title: '完成了但质量随便',
    scene: '质量差',
    ageBands: ['general', 'teen'],
    body:
      '「随便做完」常常是赶时间或怕被评价。先肯定「你交了」，再好奇过程：「哪一步最烦？」比「重做」更能谈标准。',
    tryLine: '「哪一步你觉得已经够了？哪一步还想再试一下？」',
    links: [
      { label: '周末小会', to: '/parent/weekend-meeting' },
      { label: '家庭说说', to: '/parent/journal' },
    ],
  },
  {
    id: 'fake-checkin',
    title: '怀疑打卡不诚实',
    scene: '说谎打卡',
    ageBands: ['all'],
    body:
      '先当关系问题，不当「抓骗子」。压力大时孩子可能用完成换安全。少盯证据，多问需要：是任务太满，还是怕你失望？',
    tryLine: '「如果今天很难交卷，你可以跟我说，我们一起改量。」',
    links: [
      { label: '去减任务', to: '/parent/tasks' },
      { label: '求助资源', to: '/parent/family-edu#help' },
    ],
  },
  {
    id: 'sibling-fair',
    title: '手足比分或抢公平',
    scene: '手足冲突',
    ageBands: ['young', 'general'],
    body:
      '并排比完成率会放大攀比。约定里强调「各有节奏」；表扬尽量说具体行为，少说「比哥哥乖」。',
    tryLine: '「你们俩今天各自完成了什么，我想分开听听。」',
    links: [
      { label: '家庭约定', to: '/parent/family-edu' },
      { label: '积分约定', to: '/parent/pacts' },
    ],
  },
  {
    id: 'exam-week',
    title: '考试周家里更紧',
    scene: '考试周',
    ageBands: ['general', 'teen'],
    body:
      '考试周适合减非必要任务与新愿望刺激。看板数字可以先收起；多留不被评价的聊天，比加练更能稳住关系。',
    tryLine: '「这周任务我们先砍一半，考完再一起看。」',
    links: [
      { label: '去减任务', to: '/parent/tasks' },
      { label: '减负与求助', to: '/parent/family-edu#help' },
    ],
  },
  {
    id: 'tired-streak',
    title: '连续说「累」',
    scene: '连续累',
    ageBands: ['all'],
    body:
      '「累」更可能是耗竭，而不是态度。先减量、先休息，再谈任务。若持续低落或兴趣明显变少，请用求助资源，而不是加码监督。',
    tryLine: '「听起来真的很累。今天哪些可以明天再说？」',
    links: [
      { label: '周末小会', to: '/parent/weekend-meeting' },
      { label: '减负与求助', to: '/parent/family-edu#help' },
    ],
  },
  {
    id: 'young-coreg',
    title: '低龄：一起慢慢来',
    scene: '共同调节',
    ageBands: ['young'],
    body:
      '低龄更需要共同调节：短指令、看得见的下一步、即时温暖。少讲大道理；小会两步（骄傲+感谢）就够。',
    tryLine: '「我们一起坐过来，先做这一小格。」',
    links: [
      { label: '周末小会', to: '/parent/weekend-meeting' },
      { label: '家庭说说', to: '/parent/journal' },
    ],
  },
  {
    id: 'teen-autonomy',
    title: '少年：少盯、多协商',
    scene: '自主协商',
    ageBands: ['teen'],
    body:
      '少年对监视更敏感。让本人选顺序、提议任务；打卡反思默认留给自己。积分节奏可试「周末一起结算」，少抢戏。',
    tryLine: '「这几件里，你想先做哪一件？」',
    links: [
      { label: '家庭约定', to: '/parent/family-edu' },
      { label: '家庭说说', to: '/parent/journal' },
    ],
  },
]

export function lessonsForAgeBand(
  ageBand?: string | null,
): ParentMicroLesson[] {
  const band = ageBand === 'young' || ageBand === 'teen' ? ageBand : 'general'
  return PARENT_MICRO_LESSONS.filter(
    (l) => l.ageBands.includes('all') || l.ageBands.includes(band),
  )
}

export function ageBandLabel(band: AgeBandFilter): string {
  if (band === 'all') return '各年龄'
  if (band === 'young') return '低龄'
  if (band === 'teen') return '少年'
  return '通用'
}

export function lessonAgeLabel(lesson: ParentMicroLesson): string {
  if (lesson.ageBands.includes('all')) return '各年龄'
  return lesson.ageBands.map(ageBandLabel).join(' · ')
}

/** 单则正文不宜过长（约 1 屏） */
export function assertsLessonShort(lesson: ParentMicroLesson): boolean {
  return lesson.body.length <= 120 && lesson.tryLine.length <= 40
}

export function assertsLessonsCoverage(): boolean {
  const scenes = new Set(PARENT_MICRO_LESSONS.map((l) => l.scene))
  const need = ['不愿做', '质量差', '说谎打卡', '手足冲突', '考试周', '连续累']
  return (
    PARENT_MICRO_LESSONS.length >= 5 &&
    PARENT_MICRO_LESSONS.length <= 10 &&
    need.every((s) => scenes.has(s)) &&
    PARENT_MICRO_LESSONS.every(assertsLessonShort)
  )
}

/** E6.4：情绪功能类 → 微课 id */
const EMOTION_LESSON: Record<EmotionFunctionKind, string> = {
  exhaustion: 'tired-streak',
  competence_threat: 'quality-rush',
  relation_threat: 'sibling-fair',
  meaning_gap: 'wont-start',
}

export function lessonIdForEmotionKind(
  kind?: EmotionFunctionKind | null,
): string | null {
  if (!kind) return null
  const id = EMOTION_LESSON[kind]
  return PARENT_MICRO_LESSONS.some((l) => l.id === id) ? id : null
}

export function familyEduLessonPath(lessonId: string): string {
  return `/parent/family-edu?lesson=${encodeURIComponent(lessonId)}#edu-tips`
}
