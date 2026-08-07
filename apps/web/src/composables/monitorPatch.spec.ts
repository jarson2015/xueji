import { describe, expect, it } from 'vitest'
import {
  mergeTimelines,
  patchCheckinCreated,
  patchCheckinReviewed,
  patchNudgeSent,
  patchProgressChanged,
  patchRedeemRequested,
  syncFamilySummary,
} from './monitorPatch'
import type { MonitorResponse } from '../types/monitor'

function baseMonitor(): MonitorResponse {
  return {
    date: '2026-07-14',
    family: { headline: '今天完成 0/2', totalDue: 2, totalDone: 0 },
    children: [
      {
        studentId: 1,
        name: '小明',
        isRestDay: false,
        stats: { due: 2, done: 0, pendingConfirms: 0, pointsBalance: 10, streak: 3 },
        byCategory: { study: { due: 2, done: 0 } },
        todayTasks: [
          {
            kind: 'task',
            id: 10,
            title: '数学练习',
            category: 'study',
            progressPercent: 0,
            status: 'todo',
          },
          {
            kind: 'task',
            id: 11,
            title: '整理书桌',
            category: 'study',
            progressPercent: 50,
            status: 'in_progress',
          },
        ],
        timeline: [],
      },
    ],
    pendingConfirms: [],
    hints: {},
  }
}

describe('monitorPatch', () => {
  it('patchCheckinCreated adds pending confirm and updates task', () => {
    const m = baseMonitor()
    const ok = patchCheckinCreated(m, {
      checkin: {
        id: 99,
        studentId: 1,
        studentName: '小明',
        assignId: 10,
        taskTitle: '数学练习',
        confirmStatus: 'pending',
        createdAt: '2026-07-14T10:00:00+08:00',
      },
      progress: null,
    })
    expect(ok).toBe(true)
    expect(m.pendingConfirms).toHaveLength(1)
    expect(m.children[0].todayTasks[0].status).toBe('pending_confirm')
    expect(m.children[0].stats.pendingConfirms).toBe(1)
    expect(m.children[0].timeline?.[0].kind).toBe('checkin_submitted')
  })

  it('patchProgressChanged marks task done', () => {
    const m = baseMonitor()
    const ok = patchProgressChanged(m, {
      assignId: 11,
      studentId: 1,
      progressPercent: 100,
      status: 'completed',
    })
    expect(ok).toBe(true)
    const task = m.children[0].todayTasks.find((t) => t.id === 11)
    expect(task?.status).toBe('done')
    expect(m.family.totalDone).toBe(1)
  })

  it('patchProgressChanged moves task to deferredToday', () => {
    const m = baseMonitor()
    patchProgressChanged(m, {
      assignId: 10,
      studentId: 1,
      deferredToday: true,
      title: '数学练习',
    })
    expect(m.children[0].todayTasks.some((t) => t.id === 10)).toBe(false)
    expect(m.children[0].deferredToday?.some((t) => t.id === 10)).toBe(true)
    expect(m.family.totalDue).toBe(1)
  })

  it('patchCheckinReviewed removes pending and approves task', () => {
    const m = baseMonitor()
    patchCheckinCreated(m, {
      checkin: {
        id: 99,
        studentId: 1,
        assignId: 10,
        taskTitle: '数学练习',
        confirmStatus: 'pending',
        createdAt: '2026-07-14T10:00:00+08:00',
      },
    })
    patchCheckinReviewed(m, {
      checkinId: 99,
      studentId: 1,
      assignId: 10,
      taskTitle: '数学练习',
      action: 'approve',
      confirmStatus: 'approved',
      at: '2026-07-14T10:05:00+08:00',
      progress: {
        assignId: 10,
        studentId: 1,
        progressPercent: 100,
        status: 'completed',
      },
    })
    expect(m.pendingConfirms).toHaveLength(0)
    const task = m.children[0].todayTasks.find((t) => t.id === 10)
    expect(task?.status).toBe('done')
    expect(m.children[0].timeline?.[0].kind).toBe('checkin_approved')
  })

  it('mergeTimelines dedupes by id', () => {
    const merged = mergeTimelines(
      [{ id: 'a:1', kind: 'checkin_auto', studentId: 1, studentName: '小明', at: '2026-07-14T09:00:00+08:00', title: 'A', confirmStatus: 'none' }],
      [{ id: 'a:1', kind: 'checkin_auto', studentId: 1, studentName: '小明', at: '2026-07-14T09:00:00+08:00', title: 'A2', confirmStatus: 'none' }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].title).toBe('A')
  })

  it('syncFamilySummary updates totals', () => {
    const m = baseMonitor()
    m.children[0].todayTasks[0].status = 'done'
    m.children[0].stats.done = 1
    syncFamilySummary(m)
    expect(m.family.totalDone).toBe(1)
  })

  it('patchNudgeSent prepends timeline', () => {
    const m = baseMonitor()
    expect(patchNudgeSent(m, {
      studentId: 1,
      message: '先做第一件',
      fromName: '妈妈',
      at: '2026-07-14T10:00:00+08:00',
    })).toBe(true)
    expect(m.children[0].timeline?.[0].kind).toBe('nudge_sent')
  })

  it('patchRedeemRequested prepends timeline', () => {
    const m = baseMonitor()
    expect(patchRedeemRequested(m, {
      redeem: { id: 5, studentId: 1, costPoints: 80, createdAt: '2026-07-14T09:00:00+08:00' },
      wish: { title: '电影票' },
      studentName: '小明',
    })).toBe(true)
    expect(m.children[0].timeline?.[0].kind).toBe('redeem_requested')
  })
})
