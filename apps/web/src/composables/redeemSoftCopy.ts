export type RedeemSoftMode = 'finger' | 'pact' | 'normal'

export type RedeemSoftCopy = {
  title: string
  message: string
  confirmText: string
  cancelText: string
}

export function buildRedeemSoftCopy(
  mode: RedeemSoftMode,
  w: { title: string; costPoints: number },
  opts?: { pactOwed?: number; balance?: number },
): RedeemSoftCopy {
  if (mode === 'finger') {
    return {
      title: '确认兑换家庭互助卡',
      message: `家庭互助卡「${w.title}」会先扣 ${w.costPoints} 积分交由家长保管；兑现后可先缓缓一件家务，不是买免做。确定兑换吗？`,
      confirmText: '提交并交由家长保管',
      cancelText: '再想想',
    }
  }
  if (mode === 'pact') {
    const owed = opts?.pactOwed ?? 0
    const balance = opts?.balance ?? 0
    const left = balance - w.costPoints
    return {
      title: '积分约定提醒',
      message:
        `这是约定中的积分，请留够还回。` +
        `你还有 ${owed} 积分约定未还回；兑换会再扣 ${w.costPoints} 分` +
        (left < owed
          ? `，兑换后余额约 ${Math.max(0, left)}，可能不够还约定。`
          : `，兑换后约剩 ${left} 分。`) +
        `确定仍要兑换吗？`,
      confirmText: '仍要兑换',
      cancelText: '先留着还回',
    }
  }
  return {
    title: '确认兑换',
    message: `将用 ${w.costPoints} 积分兑换「${w.title}」。积分先交给家长保管，兑现后愿望生效。确定吗？`,
    confirmText: '提交并交由家长保管',
    cancelText: '再想想',
  }
}

export function buildRedeemStayMessage(wishType?: string): string {
  return wishType === 'golden_finger'
    ? '已提交家庭互助卡，积分先由家长保管，等待兑现'
    : '已提交，积分先由家长保管，等待兑现'
}

export function buildAckStayMessage(): string {
  return '已告诉家长你收到了'
}
