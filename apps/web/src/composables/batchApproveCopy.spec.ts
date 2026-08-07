import { describe, expect, it } from 'vitest'
import {
  buildBatchApprovePromptMessage,
  buildBatchApproveStayMessage,
} from './batchApproveCopy'

describe('batchApproveCopy', () => {
  it('prompt：仅普通条数', () => {
    expect(buildBatchApprovePromptMessage(2, 0)).toBe(
      '批量通过并点赞 2 条？ 将使用默认鼓励，不再逐条填写。',
    )
  })

  it('prompt：含跳过补上', () => {
    expect(buildBatchApprovePromptMessage(1, 2)).toContain('已跳过 2 条补上进度')
    expect(buildBatchApprovePromptMessage(1, 2)).toContain('批量通过并点赞 1 条？')
  })

  it('prompt：无普通条返回空', () => {
    expect(buildBatchApprovePromptMessage(0, 3)).toBe('')
  })

  it('stay：成功条数', () => {
    expect(buildBatchApproveStayMessage(3)).toBe(
      '已通过并点赞 3 条，孩子会收到鼓励',
    )
    expect(buildBatchApproveStayMessage(0)).toBe('')
  })
})
