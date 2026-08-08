/**
 * E4 Teen 隐私 / 弱积分引导 — 前端偏好，不写库改配置。
 */

export type ReflectionShareMode = 'self' | 'parent'

const KEY_SHARE = 'xueji_teen_reflection_share'

/** teen 默认不把反思交给家长即时看见 */
export function defaultShareReflectionWithParent(ageBand?: string | null): boolean {
  return ageBand !== 'teen'
}

export function readReflectionSharePreference(
  ageBand?: string | null,
  storage: Pick<Storage, 'getItem'> = localStorage,
): boolean {
  if (ageBand !== 'teen') return true
  const v = storage.getItem(KEY_SHARE)
  if (v === 'parent') return true
  if (v === 'self') return false
  return defaultShareReflectionWithParent(ageBand)
}

export function writeReflectionSharePreference(
  shareWithParent: boolean,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(KEY_SHARE, shareWithParent ? 'parent' : 'self')
}

/** 未勾选分享时：不把反思写入打卡 API */
export function shouldOmitReflectionFromApi(
  ageBand: string | null | undefined,
  shareWithParent: boolean,
): boolean {
  return ageBand === 'teen' && !shareWithParent
}

export function stashPrivateReflection(
  entry: { text: string; taskTitle?: string; at?: number },
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): void {
  const text = (entry.text || '').trim()
  if (!text) return
  const key = 'xueji_private_reflections'
  const list = listPrivateReflections(storage)
  list.unshift({
    text: text.slice(0, 200),
    taskTitle: entry.taskTitle,
    at: entry.at || Date.now(),
  })
  storage.setItem(key, JSON.stringify(list.slice(0, 40)))
}

export type PrivateReflectionEntry = {
  text: string
  taskTitle?: string
  at: number
}

/** E6.1：仅本机、只读回看 */
export function listPrivateReflections(
  storage: Pick<Storage, 'getItem'> = localStorage,
): PrivateReflectionEntry[] {
  const key = 'xueji_private_reflections'
  try {
    const list = JSON.parse(storage.getItem(key) || '[]')
    if (!Array.isArray(list)) return []
    return list
      .filter((x) => x && typeof x.text === 'string' && x.text.trim())
      .map((x) => ({
        text: String(x.text).slice(0, 200),
        taskTitle: x.taskTitle ? String(x.taskTitle) : undefined,
        at: typeof x.at === 'number' ? x.at : 0,
      }))
  } catch {
    return []
  }
}

export const PRIVATE_REFLECTIONS_HINT =
  '这些句子只留在这台设备上，不会同步给家长。换手机就看不到了。'

export const TEEN_REFLECTION_SHARE_HINT =
  '少年默认：这句话先留给自己。勾选后，家长在确认打卡时可能看见。'

export const TEEN_WEAK_POINTS_NOTE =
  '家庭里若有少年档孩子：加分节奏建议用「有时加分」或「周末一起结算」，少让积分抢戏。' +
  '这是家庭级设置，保存后才生效，不会悄悄改。'

export const TEEN_WEAK_POINTS_STUDENT_TIP =
  '积分只是工具。若觉得「为分而做」太累，可以跟家长说说「周末再一起看」。'

/** 危机转介（静态资源列表，非诊疗、非自动报警） */
export const HELP_RESOURCES_TITLE = '减负与求助资源'

export const HELP_RESOURCES_BODY =
  '学迹不能替代专业帮助，也不会自动报警或做诊疗判断。\n\n' +
  '可以先试：减少本周必做、暂停新愿望刺激、留一段不被评价的聊天。\n\n' +
  '若持续情绪低落、兴趣明显变少、或你担心安全：\n' +
  '· 联系学校心理老师 / 班主任\n' +
  '· 当地精神卫生中心或正规心理咨询机构\n' +
  '· 紧急情况请拨打当地急救电话\n\n' +
  '以下为国内常见公益热线（号码可能变更，请以官方公布为准）：\n' +
  '· 希望24热线：400-161-9995\n' +
  '· 北京心理危机研究与干预中心：010-82951332'

export function assertsHelpResourcesSafe(text: string): boolean {
  return (
    text.includes('不能替代专业帮助') &&
    text.includes('不会自动报警') &&
    !/诊断为|确诊为|抑郁症/.test(text) &&
    text.includes('热线')
  )
}
