import { describe, expect, it } from 'vitest'
import {
  PARENT_MICRO_LESSONS,
  assertsLessonsCoverage,
  familyEduLessonPath,
  lessonAgeLabel,
  lessonIdForEmotionKind,
  lessonsForAgeBand,
} from './parentMicroLessons'

describe('parentMicroLessons', () => {
  it('覆盖路线图场景且篇幅可控', () => {
    expect(assertsLessonsCoverage()).toBe(true)
    expect(PARENT_MICRO_LESSONS.length).toBeGreaterThanOrEqual(5)
  })

  it('按 ageBand 过滤', () => {
    const young = lessonsForAgeBand('young')
    expect(young.some((l) => l.id === 'young-coreg')).toBe(true)
    expect(young.some((l) => l.id === 'teen-autonomy')).toBe(false)

    const teen = lessonsForAgeBand('teen')
    expect(teen.some((l) => l.id === 'teen-autonomy')).toBe(true)
    expect(teen.some((l) => l.id === 'sibling-fair')).toBe(false)

    const general = lessonsForAgeBand('general')
    expect(general.some((l) => l.id === 'wont-start')).toBe(true)
    expect(general.some((l) => l.id === 'sibling-fair')).toBe(true)
    expect(general.some((l) => l.id === 'young-coreg')).toBe(false)
    expect(general.some((l) => l.id === 'teen-autonomy')).toBe(false)
  })

  it('每则有适用标签与深链', () => {
    for (const l of PARENT_MICRO_LESSONS) {
      expect(lessonAgeLabel(l).length).toBeGreaterThan(0)
      expect(l.links.length).toBeGreaterThan(0)
      expect(l.links.every((x) => x.to.startsWith('/'))).toBe(true)
    }
  })

  it('情绪类映射到微课', () => {
    expect(lessonIdForEmotionKind('exhaustion')).toBe('tired-streak')
    expect(lessonIdForEmotionKind('relation_threat')).toBe('sibling-fair')
    expect(familyEduLessonPath('tired-streak')).toContain('lesson=tired-streak')
  })
})
