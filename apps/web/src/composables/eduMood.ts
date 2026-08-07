/** 打卡前情绪 — 与后端 mood-policy 对齐 */

export const MOOD_OPTIONS = [
  { tag: 'happy', emoji: '😊', label: '开心' },
  { tag: 'ok', emoji: '🙂', label: '还行' },
  { tag: 'tired', emoji: '😮‍💨', label: '有点累' },
  { tag: 'hard', emoji: '😣', label: '有点难' },
] as const

export const REPAIR_REJECT_TEMPLATES = [
  '今天已经努力了，我们明天再试一小步',
  '这次没通过没关系，一起看看哪里可以改',
  '我相信你能做好，我们慢慢来',
  '先休息一会儿，晚点我们再补一小步',
]
