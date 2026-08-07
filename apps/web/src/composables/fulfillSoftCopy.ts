/** 家长愿望兑现 SoftPrompt 文案 */

export type FulfillSoftCopy = {
  title: string
  message: string
  confirmText: string
  cancelText: string
  showInput: boolean
  requireNote: boolean
  templates: string[]
  hint: string
  placeholder: string
  mode: 'normal' | 'finger' | 'fingerPick' | 'fingerEmpty'
}

export function buildNormalFulfillSoftCopy(row: {
  wish?: { title?: string }
  student?: { name?: string }
}): FulfillSoftCopy {
  return {
    mode: 'normal',
    title: '兑现',
    message: `确认已把「${row.wish?.title}」给到 ${row.student?.name}？积分已在申请时扣除。`,
    confirmText: '已给到',
    cancelText: '取消',
    showInput: false,
    requireNote: false,
    templates: [],
    hint: '',
    placeholder: '',
  }
}

export function buildFingerFulfillSoftCopy(
  row: { wish?: { title?: string } },
  chores: { title: string }[],
): FulfillSoftCopy {
  if (chores.length > 1) {
    return {
      mode: 'fingerPick',
      title: '兑现家庭互助卡',
      message:
        '点选要先缓缓的一件家务。免做不是责任消失：可以改日补做、换一件力所能及的事，或和家人一起分担。积分已在申请时扣除。',
      confirmText: '兑现并免家务',
      cancelText: '取消',
      showInput: true,
      requireNote: true,
      templates: chores.map((c) => c.title),
      hint: '请点选一件家务',
      placeholder: '点上方芯片选一件',
    }
  }
  if (chores.length === 1) {
    return {
      mode: 'finger',
      title: '兑现家庭互助卡',
      message: `确认兑现家庭互助卡？将免掉「${chores[0].title}」。积分已在申请时扣除。\n\n免做不是责任消失：可以改日补做、换一件力所能及的事，或和家人一起分担。`,
      confirmText: '兑现',
      cancelText: '取消',
      showInput: false,
      requireNote: false,
      templates: [],
      hint: '',
      placeholder: '',
    }
  }
  return {
    mode: 'fingerEmpty',
    title: '兑现家庭互助卡',
    message: `确认兑现「${row.wish?.title}」？当前没有可免的家务，仍会标记已兑现。\n\n免做不是责任消失，下次有家务时再和家人商量。`,
    confirmText: '已给到',
    cancelText: '取消',
    showInput: false,
    requireNote: false,
    templates: [],
    hint: '',
    placeholder: '',
  }
}

/** 芯片标题或 1-based 序号 → 家务行 */
export function matchChoreByNote<T extends { title: string }>(
  note: string,
  chores: T[],
): T | null {
  const trimmed = note.trim()
  const byTitle = chores.find((c) => c.title === trimmed)
  if (byTitle) return byTitle
  const n = Number(trimmed)
  if (Number.isInteger(n) && n >= 1 && n <= chores.length) {
    return chores[n - 1]
  }
  return null
}
