/** 执行意图（if-then）文案组装 */

export function formatImplementationIntention(
  cue: string | null | undefined,
  when: string | null | undefined,
): string | null {
  const c = cue?.trim();
  const w = when?.trim();
  if (!c && !w) return null;
  if (c && w) return `做完「${c}」之后，我就${w}`;
  if (c) return `做完「${c}」之后，我就做这件事`;
  return `到点我就${w}`;
}

export function normalizeIntentionFields(
  cue?: string | null,
  when?: string | null,
): { intentionCue: string | null; intentionWhen: string | null } {
  return {
    intentionCue: cue?.trim().slice(0, 120) || null,
    intentionWhen: when?.trim().slice(0, 120) || null,
  };
}
