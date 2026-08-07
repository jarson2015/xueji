/** 家长代登备份：解析失败则应登出，不可假回家长页 */

export type ParentProxyBackup = {
  token: string
  user: unknown
}

export function parseParentProxyBackup(
  raw: string | null | undefined,
): ParentProxyBackup | null {
  if (!raw) return null
  try {
    const backup = JSON.parse(raw)
    if (backup?.token && backup?.user) {
      return { token: String(backup.token), user: backup.user }
    }
  } catch {
    /* ignore */
  }
  return null
}
