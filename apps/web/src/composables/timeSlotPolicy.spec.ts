import { describe, expect, it } from 'vitest'
import {
  allowPeekOtherSlots,
  analyzeDailySlotDensity,
  buildSlotWindow,
  effectiveClockMap,
  formatOtherSlotsSummary,
  hourInRange,
  labelSlot,
  maxAnytimeVisible,
  maxVisibleInCurrentSlot,
  resolveCurrentSlot,
  resolveDefaultFocusSlot,
  slotOrderForUi,
  slotRank,
} from './timeSlotPolicy'

describe('timeSlotPolicy', () => {
  it('resolveCurrentSlot maps hours with defaults', () => {
    expect(resolveCurrentSlot(new Date(2026, 6, 11, 7))).toBe('after_wake')
    expect(resolveCurrentSlot(new Date(2026, 6, 11, 15))).toBe('after_school')
    expect(resolveCurrentSlot(new Date(2026, 6, 11, 19))).toBe('after_dinner')
    expect(resolveCurrentSlot(new Date(2026, 6, 11, 22))).toBe('bedtime')
    expect(resolveCurrentSlot(new Date(2026, 6, 11, 10))).toBe('anytime')
  })

  it('extended clock map distinguishes morning slots', () => {
    expect(
      resolveCurrentSlot(new Date(2026, 6, 11, 7, 30), {
        extendedEnabled: true,
      }),
    ).toBe('after_breakfast')
    expect(
      resolveCurrentSlot(new Date(2026, 6, 11, 8, 15), {
        extendedEnabled: true,
      }),
    ).toBe('before_school')
    expect(
      resolveCurrentSlot(new Date(2026, 6, 11, 12, 30), {
        extendedEnabled: true,
      }),
    ).toBe('after_lunch')
  })

  it('custom clock map override', () => {
    expect(
      resolveCurrentSlot(new Date(2026, 6, 11, 13), {
        clockMap: { after_school: { startHour: 12, endHour: 18 } },
      }),
    ).toBe('after_school')
  })

  it('hourInRange wraps overnight', () => {
    expect(hourInRange(22, { startHour: 21, endHour: 6 })).toBe(true)
    expect(hourInRange(3, { startHour: 21, endHour: 6 })).toBe(true)
    expect(hourInRange(10, { startHour: 21, endHour: 6 })).toBe(false)
  })

  it('slotOrderForUi toggles extended', () => {
    expect(slotOrderForUi(false)).toContain('after_wake')
    expect(slotOrderForUi(false)).not.toContain('before_school')
    expect(slotOrderForUi(true)).toContain('after_lunch')
  })

  it('slotRank uses full chronological order', () => {
    expect(slotRank('after_wake')).toBeLessThan(slotRank('after_school'))
    expect(slotRank('after_breakfast')).toBeLessThan(slotRank('before_school'))
  })

  it('age caps', () => {
    expect(maxVisibleInCurrentSlot('young')).toBe(3)
    expect(maxVisibleInCurrentSlot('general')).toBe(5)
    expect(maxAnytimeVisible('young')).toBe(1)
    expect(allowPeekOtherSlots('young')).toBe(false)
    expect(allowPeekOtherSlots('teen')).toBe(true)
  })

  it('buildSlotWindow keeps current slot + 1 carry + limited anytime', () => {
    const pending = [
      { key: 'n1', timeSlot: 'after_school' },
      { key: 'a1', timeSlot: 'after_school' },
      { key: 'a2', timeSlot: 'after_school' },
      { key: 'd1', timeSlot: 'after_dinner' },
      { key: 'd2', timeSlot: 'after_dinner' },
      { key: 'any1', timeSlot: 'anytime' },
      { key: 'any2', timeSlot: 'anytime' },
      { key: 'any3', timeSlot: 'anytime' },
      { key: 'b1', timeSlot: 'bedtime' },
    ]
    const w = buildSlotWindow({
      pending,
      nextKey: 'n1',
      focusSlot: 'after_dinner',
      ageBand: 'general',
    })
    expect(w.focusSlot).toBe('after_dinner')
    expect(w.items[0].windowKind).toBe('carry')
    expect(w.items[0].key).toBe('a1')
    const kinds = w.items.map((i) => i.windowKind)
    expect(kinds).toContain('current')
    expect(kinds.filter((k) => k === 'anytime').length).toBeLessThanOrEqual(2)
    expect(w.items.some((i) => i.key === 'n1')).toBe(false)
    expect(w.laterTotal).toBeGreaterThanOrEqual(1)
    expect(w.laterGroups.some((g) => g.slot === 'bedtime')).toBe(true)
    expect(w.laterGroups.find((g) => g.slot === 'after_school')?.relation).toBe(
      'earlier',
    )
    expect(w.otherSlotsSummary).toContain('之前未收尾')
    expect(w.otherSlotsSummary).not.toContain('到点再看')
  })

  it('young truncates and labelSlot works', () => {
    expect(labelSlot('bedtime')).toBe('睡前')
    expect(labelSlot('after_wake')).toBe('起床后')
    expect(slotRank('after_wake')).toBe(0)
    const pending = Array.from({ length: 6 }, (_, i) => ({
      key: `d${i}`,
      timeSlot: 'after_dinner',
    }))
    const w = buildSlotWindow({
      pending,
      focusSlot: 'after_dinner',
      ageBand: 'young',
    })
    expect(w.items.length).toBe(3)
    expect(w.truncatedCount).toBe(3)
  })

  it('resolveDefaultFocusSlot follows next when clock slot empty', () => {
    const pending = [
      { key: 'd1', timeSlot: 'after_dinner' },
      { key: 'b1', timeSlot: 'bedtime' },
    ]
    expect(
      resolveDefaultFocusSlot({
        clockSlot: 'after_school',
        nextItemSlot: 'after_dinner',
        pending,
      }),
    ).toBe('after_dinner')
    expect(
      resolveDefaultFocusSlot({
        clockSlot: 'after_dinner',
        nextItemSlot: 'after_dinner',
        pending,
      }),
    ).toBe('after_dinner')
  })

  it('formatOtherSlotsSummary splits earlier and later', () => {
    const s = formatOtherSlotsSummary(
      [
        { slot: 'after_school', count: 2, relation: 'earlier' },
        { slot: 'bedtime', count: 1, relation: 'later' },
      ],
      'after_dinner',
    )
    expect(s).toContain('之前未收尾 2 件')
    expect(s).toContain('稍后再做 1 件')
  })

  it('analyzeDailySlotDensity warns when one slot is crowded', () => {
    const tasks = Array.from({ length: 5 }, () => ({
      schedule: 'daily',
      timeSlot: 'after_school',
      assigns: [{ studentId: 1, student: { id: 1, name: '小明' } }],
    }))
    const r = analyzeDailySlotDensity(tasks)
    expect(r.level).toBe('warn')
    expect(r.message).toContain('小明')
    expect(r.message).toContain('放学后')
  })

  it('effectiveClockMap ignores extended overrides when off', () => {
    const map = effectiveClockMap(false, {
      before_school: { startHour: 7, endHour: 8 },
      after_school: { startHour: 13, endHour: 17 },
    })
    expect(map.before_school).toBeUndefined()
    expect(map.after_school.startHour).toBe(13)
  })
})
