/** 家庭日记 SoftPrompt / 话术芯片文案（产品名随年龄） */

import {
  journalDeleteTitle,
  journalProductName,
} from './journalLabels'

export type SoftCopy = {
  title: string
  message: string
  confirmText: string
  cancelText: string
}

export type JournalSoftOpts = {
  ageBand?: string
  productName?: string
}

function resolveProduct(opts?: JournalSoftOpts): string {
  return opts?.productName ?? journalProductName(opts?.ageBand)
}

/** SoftPrompt 内短称：幼龄用「悄悄话」，其余「私密日记」 */
function privateShort(ageBand?: string): string {
  return ageBand === 'young' ? '悄悄话' : '私密日记'
}

export function buildEnablePrivateDiaryCopy(ageBand?: string): SoftCopy {
  const name = privateShort(ageBand)
  return {
    title: `自愿开启${name}`,
    message:
      `${name}只有你本人能看、能写。家长和其他家人看不到原文；代登家长也不能打开。` +
      '你随时可以只在自己这边写，不必分享。确定自愿开启吗？',
    confirmText: '自愿开启',
    cancelText: '再想想',
  }
}

export function buildClosePrivateDiaryCopy(ageBand?: string): SoftCopy {
  const name = privateShort(ageBand)
  return {
    title: `关闭${name}？`,
    message:
      `关闭后不能再写新的${name}，也不能分享或删除。已有内容仍只留给你只读查看，不会开放给家长。需要时可以再自愿开启。`,
    confirmText: '确认关闭',
    cancelText: '保持开启',
  }
}

export function buildDeletePostCopy(
  preview?: string,
  opts?: { deletingOthers?: boolean } & JournalSoftOpts,
): SoftCopy {
  const product = resolveProduct(opts)
  const tip = preview?.trim()
    ? `将删除「${preview.trim().slice(0, 24)}${preview.trim().length > 24 ? '…' : ''}」。`
    : `将删除这条${product}。`
  const extra = opts?.deletingOthers
    ? '这是家人写下的表达，删除后家人就看不见了。'
    : '删除后家人就看不见了。'
  return {
    title: journalDeleteTitle(opts?.ageBand),
    message: `${tip}${extra}`,
    confirmText: '确认删除',
    cancelText: '保留',
  }
}

export function buildDeleteDiaryCopy(
  preview?: string,
  ageBand?: string,
): SoftCopy {
  const name = privateShort(ageBand)
  const tip = preview?.trim()
    ? `将删除「${preview.trim().slice(0, 24)}${preview.trim().length > 24 ? '…' : ''}」。`
    : `将删除这条${name}。`
  return {
    title: `删除${name}？`,
    message: `${tip}仅你自己能看到的内容也会从这里消失。`,
    confirmText: '确认删除',
    cancelText: '保留',
  }
}

export function buildDeleteCommentCopy(): SoftCopy {
  return {
    title: '删除这条回应？',
    message: '删除后家人就看不见这句回应了。',
    confirmText: '确认删除',
    cancelText: '保留',
  }
}

export function buildShareLayer1Copy(
  summary: string,
  opts?: JournalSoftOpts,
): SoftCopy {
  const product = resolveProduct(opts)
  const priv = privateShort(opts?.ageBand)
  const clip = summary.trim().slice(0, 80)
  const more = summary.trim().length > 80 ? '…' : ''
  return {
    title: `分享到${product}？`,
    message:
      `将把下面内容的一份副本发到本家庭的「${product}」。` +
      `原${priv}仍只有你能看，不会把私密权限开放给家长。` +
      `\n\n摘要：${clip}${more}`,
    confirmText: '下一步',
    cancelText: '取消',
  }
}

export function buildShareLayer2Copy(
  visibility: 'family' | 'parents' = 'family',
  opts?: JournalSoftOpts,
): SoftCopy {
  const product = resolveProduct(opts)
  const priv = privateShort(opts?.ageBand)
  const who = visibility === 'parents' ? '仅家长可见' : '全家可见'
  return {
    title: `确认发布到${product}`,
    message:
      `确认后将直接在本「${product}」发一条新帖（${who}），不经过剪贴板。你可以继续在${priv}里保留原文。`,
    confirmText: '确认发布',
    cancelText: '再想想',
  }
}

export function buildShareForceCopy(opts?: JournalSoftOpts): SoftCopy {
  const product = resolveProduct(opts)
  const priv = privateShort(opts?.ageBand)
  return {
    title: '已经分享过',
    message:
      `这条${priv}已经发到${product}过。再发会多一条副本，原文仍只有你能看。确定仍要再发吗？`,
    confirmText: '仍要再发',
    cancelText: '不用了',
  }
}

export function buildProxyComposeHint(): string {
  return '代登发言会记在当前孩子名下。'
}

/** 发帖可选话术（非强制） */
export const JOURNAL_POST_PROMPTS = [
  '今天骄傲的一件小事',
  '想被抱抱的一句',
  '今天有点难，但…',
  '谢谢家人帮我…',
] as const

/** 学生回应：温暖陪伴 */
export const JOURNAL_COMMENT_PROMPTS = [
  '看见你了',
  '辛苦了',
  '我们一起慢慢来',
  '为你开心',
] as const

/**
 * 家长回应：情绪教练脚手架（感受—好奇—陪伴）
 * 刻意避免「又完成了真棒」类绩效夸
 */
export const JOURNAL_PARENT_COMMENT_PROMPTS = [
  '听起来你有点…',
  '愿意多说一点吗？',
  '我在，不着急',
  '谢谢你告诉我',
] as const

export function journalCommentPromptsForRole(
  role: 'parent' | 'student' | string | undefined,
): readonly string[] {
  return role === 'parent'
    ? JOURNAL_PARENT_COMMENT_PROMPTS
    : JOURNAL_COMMENT_PROMPTS
}

export function shareCopyAssertsNoPrivateLeak(layer1: SoftCopy, layer2: SoftCopy): boolean {
  const blob = `${layer1.message}${layer2.message}`
  return (
    blob.includes('不会把私密权限开放给家长') &&
    blob.includes('仍只有你能看') &&
    blob.includes('不经过剪贴板') &&
    !/剪贴板复制|复制到剪贴板/.test(blob)
  )
}
