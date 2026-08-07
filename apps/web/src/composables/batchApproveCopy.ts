/** 看板批量通过 SoftPrompt / SoftStay 文案 */

export function buildBatchApprovePromptMessage(
  normalCount: number,
  makeupSkipped: number,
): string {
  if (normalCount <= 0) return ''
  return (
    `批量通过并点赞 ${normalCount} 条？` +
    (makeupSkipped
      ? `（已跳过 ${makeupSkipped} 条补上进度，请单条处理）`
      : '') +
    ' 将使用默认鼓励，不再逐条填写。'
  )
}

export function buildBatchApproveStayMessage(okCount: number): string {
  if (okCount <= 0) return ''
  return `已通过并点赞 ${okCount} 条，孩子会收到鼓励`
}
