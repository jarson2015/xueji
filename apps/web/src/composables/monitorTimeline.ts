import type { MonitorEvent } from '../types/monitor'

const KIND_LABELS: Record<string, string> = {
  checkin_submitted: '提交打卡',
  checkin_approved: '已通过',
  checkin_rejected: '已退回',
  checkin_auto: '完成记录',
  plan_completed: '计划完成',
  deferred_today: '今日缓做',
  nudge_sent: '轻轻提醒',
  redeem_requested: '申请兑换',
}

export function timelineKindLabel(kind: string) {
  return KIND_LABELS[kind] || '动态'
}

/** One-line summary for feed rows */
export function timelineSummary(ev: MonitorEvent) {
  const label = timelineKindLabel(ev.kind)
  if (ev.kind === 'nudge_sent') {
    return ev.note || ev.title || label
  }
  if (ev.kind === 'redeem_requested') {
    const pts = ev.note ? `（${ev.note}）` : ''
    return `${label}：${ev.title}${pts}`
  }
  if (ev.kind === 'deferred_today') {
    return `${label}：${ev.title}`
  }
  return `${label} · ${ev.title}`
}

/** Shorter label for per-child timeline under cards */
export function timelineRowText(ev: MonitorEvent) {
  if (ev.kind === 'nudge_sent') {
    return ev.note || ev.title
  }
  if (ev.kind === 'redeem_requested') {
    return `兑换 ${ev.title}`
  }
  return ev.title
}

export function timelineRowHint(ev: MonitorEvent) {
  return timelineKindLabel(ev.kind)
}
