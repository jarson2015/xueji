/** 看板连接态：正常连接不刷工程态；仅断线提示 */

export const MONITOR_OFFLINE_REFRESH_LABEL = '离线刷新中'
export const MONITOR_ONLINE_LABEL_FORBIDDEN = '实时已连接'

export function showMonitorOfflineTag(opts: {
  isTv: boolean
  wsConnected: boolean
}): boolean {
  return !opts.isTv && !opts.wsConnected
}
