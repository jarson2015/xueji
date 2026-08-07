/** 学迹家庭日记年龄感知文案（模块码仍为 journal） */

function isYoung(ageBand?: string): boolean {
  return ageBand === 'young'
}

/** 产品名：幼龄「给家人看」；其余「家庭说说」 */
export function journalProductName(ageBand?: string): string {
  return isYoung(ageBand) ? '给家人看' : '家庭说说'
}

/** 私密区：幼龄「我的悄悄话」；其余「我的私密日记」 */
export function journalPrivateName(ageBand?: string): string {
  return isYoung(ageBand) ? '我的悄悄话' : '我的私密日记'
}

/** 页副标题 */
export function journalLead(ageBand?: string): string {
  return isYoung(ageBand)
    ? '写给家人看的小事 · 不计分'
    : '我们的成长记录 · 不计分、不进待办'
}

export function journalEmptyTitle(ageBand?: string): string {
  return isYoung(ageBand) ? '还没有写给家人看的话' : '还没有家庭说说'
}

export function journalComposeTitle(ageBand?: string): string {
  return isYoung(ageBand) ? '写给家人看' : '写一条说说'
}

export function journalShareAction(ageBand?: string): string {
  return isYoung(ageBand) ? '分享到给家人看' : '分享到家庭说说'
}

export function journalDeleteTitle(ageBand?: string): string {
  return isYoung(ageBand) ? '删除这条给家人看？' : '删除这条说说？'
}
