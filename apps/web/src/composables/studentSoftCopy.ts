/** 家长学生管理：刷新登录码 / 重置密码 SoftPrompt 文案 */

export type StudentSoftCopy = {
  title: string
  message: string
  confirmText: string
  showInput: boolean
  requireNote: boolean
  placeholder: string
  hint: string
}

export function buildRefreshCodeSoftCopy(name: string): StudentSoftCopy {
  return {
    title: '刷新登录码',
    message: `刷新后「${name}」的旧登录码会立刻失效，需要用新码才能进入。确定刷新吗？`,
    confirmText: '刷新',
    showInput: false,
    requireNote: false,
    placeholder: '',
    hint: '',
  }
}

export function buildResetPasswordSoftCopy(name: string): StudentSoftCopy {
  return {
    title: `重置「${name}」的密码`,
    message: '请设置一个新密码（建议至少 6 位）。孩子用账号密码登录时会用到。',
    confirmText: '重置',
    showInput: true,
    requireNote: true,
    placeholder: '输入新密码',
    hint: '请勿使用过于简单的密码',
  }
}
