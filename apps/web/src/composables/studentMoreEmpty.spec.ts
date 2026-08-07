import { describe, expect, it } from 'vitest'
import {
  DISABLED_ALLOWANCE_CTA,
  DISABLED_PACTS_CTA,
  isDeadEndCovenantPath,
  showStudentOptionalSection,
} from './studentMoreEmpty'

describe('studentMoreEmpty', () => {
  it('仅当零花或约定开启时显示可选段', () => {
    expect(showStudentOptionalSection({ allowance: false, pacts: false })).toBe(
      false,
    )
    expect(showStudentOptionalSection({ allowance: true, pacts: false })).toBe(
      true,
    )
    expect(showStudentOptionalSection({ allowance: false, pacts: true })).toBe(
      true,
    )
  })

  it('关功能 CTA 不去公约', () => {
    expect(isDeadEndCovenantPath(DISABLED_ALLOWANCE_CTA.path)).toBe(false)
    expect(isDeadEndCovenantPath(DISABLED_PACTS_CTA.path)).toBe(false)
    expect(isDeadEndCovenantPath('/student/covenant')).toBe(true)
    expect(DISABLED_ALLOWANCE_CTA.path).toBe('/student/rewards')
    expect(DISABLED_PACTS_CTA.path).toBe('/student/today')
  })
})
