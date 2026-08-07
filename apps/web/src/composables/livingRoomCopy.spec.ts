import { describe, expect, it } from 'vitest'
import {
  hasTvQueryJargon,
  livingRoomUserFacingTexts,
  LIVING_ROOM_COPY,
} from './livingRoomCopy'

describe('livingRoomCopy', () => {
  it('白话开关文案可读且无 ?tv= 口吻', () => {
    expect(LIVING_ROOM_COPY.enable).toBe('用客厅导航')
    expect(LIVING_ROOM_COPY.disable).toBe('恢复完整导航')
    for (const t of livingRoomUserFacingTexts()) {
      expect(hasTvQueryJargon(t)).toBe(false)
    }
  })

  it('hasTvQueryJargon 能识别工程口吻', () => {
    expect(hasTvQueryJargon('加 ?tv=1 打开')).toBe(true)
    expect(hasTvQueryJargon('用客厅导航')).toBe(false)
  })
})
