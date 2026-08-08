import { describe, expect, it } from 'vitest'
import {
  HELP_RESOURCES_BODY,
  TEEN_WEAK_POINTS_NOTE,
  assertsHelpResourcesSafe,
  defaultShareReflectionWithParent,
  listPrivateReflections,
  readReflectionSharePreference,
  shouldOmitReflectionFromApi,
  stashPrivateReflection,
  writeReflectionSharePreference,
} from './teenPrivacy'

describe('teenPrivacy', () => {
  it('teen 默认不分享反思；general 默认分享', () => {
    expect(defaultShareReflectionWithParent('teen')).toBe(false)
    expect(defaultShareReflectionWithParent('general')).toBe(true)
    expect(shouldOmitReflectionFromApi('teen', false)).toBe(true)
    expect(shouldOmitReflectionFromApi('teen', true)).toBe(false)
    expect(shouldOmitReflectionFromApi('general', false)).toBe(false)
  })

  it('偏好可读写', () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v)
      },
    }
    expect(readReflectionSharePreference('teen', storage)).toBe(false)
    writeReflectionSharePreference(true, storage)
    expect(readReflectionSharePreference('teen', storage)).toBe(true)
  })

  it('私密反思可本地暂存', () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v)
      },
    }
    stashPrivateReflection({ text: ' 今天有点空 ', taskTitle: '阅读' }, storage)
    const list = listPrivateReflections(storage)
    expect(list[0]?.text).toBe('今天有点空')
    expect(list[0]?.taskTitle).toBe('阅读')
  })

  it('弱积分说明与求助文案安全', () => {
    expect(TEEN_WEAK_POINTS_NOTE).toContain('保存后才生效')
    expect(assertsHelpResourcesSafe(HELP_RESOURCES_BODY)).toBe(true)
  })
})
