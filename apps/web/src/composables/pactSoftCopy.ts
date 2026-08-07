/** 学生约定：借出 / 心意 / 还回 SoftPrompt 文案 */

export type PactSoftCopy = {
  title: string
  message: string
  confirmText: string
  cancelText: string
}

export function buildAcceptPactSoftCopy(p: {
  amountPoints: number
  borrowerName: string
  dueDate: string
}): PactSoftCopy {
  return {
    title: '确认借出',
    message: `同意后将借出 ${p.amountPoints} 积分给 ${p.borrowerName}，约定 ${p.dueDate} 还回。积分不是钱。`,
    confirmText: '同意借出',
    cancelText: '再想想',
  }
}

export function buildAcceptGiftSoftCopy(g: {
  fromName: string
  amountPoints: number
}): PactSoftCopy {
  return {
    title: '收下心意',
    message: `收下后，${g.fromName} 分享的 ${g.amountPoints} 积分会加到你的余额。这是心意，不是借的。`,
    confirmText: '收下',
    cancelText: '再想想',
  }
}

export function buildRepayPactSoftCopy(p: {
  amountDue?: number
  amountPoints: number
  lenderName: string
  overdueExtraDue?: number
}): PactSoftCopy {
  const due = p.amountDue || p.amountPoints
  return {
    title: '按约定还回',
    message:
      `将还回合计 ${due} 积分给 ${p.lenderName}` +
      (p.overdueExtraDue ? `（含逾期补分 ${p.overdueExtraDue}）` : '') +
      '。说到做到！',
    confirmText: '还回积分',
    cancelText: '再等等',
  }
}
