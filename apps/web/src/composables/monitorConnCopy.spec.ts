import { describe, expect, it } from 'vitest'
import {
  MONITOR_OFFLINE_REFRESH_LABEL,
  MONITOR_ONLINE_LABEL_FORBIDDEN,
  showMonitorOfflineTag,
} from './monitorConnCopy'

describe('monitorConnCopy', () => {
  it('仅非 TV 且未连接时显示离线刷新', () => {
    expect(
      showMonitorOfflineTag({ isTv: false, wsConnected: false }),
    ).toBe(true)
    expect(
      showMonitorOfflineTag({ isTv: false, wsConnected: true }),
    ).toBe(false)
    expect(
      showMonitorOfflineTag({ isTv: true, wsConnected: false }),
    ).toBe(false)
  })

  it('文案口径', () => {
    expect(MONITOR_OFFLINE_REFRESH_LABEL).toBe('离线刷新中')
    expect(MONITOR_ONLINE_LABEL_FORBIDDEN).toBe('实时已连接')
  })
})
