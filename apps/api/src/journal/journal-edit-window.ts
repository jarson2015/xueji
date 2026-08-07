/** 短时编辑窗：创建后 EDIT_WINDOW_MS 内作者可改 */
export const JOURNAL_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function canEditWithinWindow(
  createdAt: Date | string | null | undefined,
  nowMs = Date.now(),
  windowMs = JOURNAL_EDIT_WINDOW_MS,
): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  return nowMs - t <= windowMs && nowMs >= t;
}
