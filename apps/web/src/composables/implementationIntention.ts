/** 执行意图文案 — 与后端 implementation-intention 对齐 */

export function formatImplementationIntention(
  cue: string | null | undefined,
  when: string | null | undefined,
): string | null {
  const c = cue?.trim()
  const w = when?.trim()
  if (!c && !w) return null
  if (c && w) return `做完「${c}」之后，我就${w}`
  if (c) return `做完「${c}」之后，我就做这件事`
  return `到点我就${w}`
}
