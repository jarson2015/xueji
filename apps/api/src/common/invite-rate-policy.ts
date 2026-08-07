/** 家长接受家庭邀请码限流（与 family.controller acceptInvite 对齐） */
export const INVITE_ACCEPT_IP_LIMIT = 10;
export const INVITE_ACCEPT_USER_LIMIT = 8;
export const INVITE_ACCEPT_WINDOW_MS = 15 * 60 * 1000;

export function inviteAcceptIpKey(ip: string) {
  return `invite-accept:${ip || 'unknown'}`;
}

export function inviteAcceptUserKey(userId: number) {
  return `invite-accept-user:${userId}`;
}
