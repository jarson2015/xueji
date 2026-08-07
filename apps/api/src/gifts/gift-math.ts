import { PointGiftReason } from '../common/enums';
import { needsParentGate } from '../pacts/pact-math';
import { addShanghaiDays, todayStr } from '../common/date-util';

export { needsParentGate };

export const GIFT_REASON_CODES: PointGiftReason[] = [
  PointGiftReason.CHEER,
  PointGiftReason.WISH_HELP,
  PointGiftReason.THANKS,
  PointGiftReason.OTHER,
];

export function isValidGiftReason(code: string): code is PointGiftReason {
  return (GIFT_REASON_CODES as string[]).includes(code);
}

/** 上海日历当周周一 YYYY-MM-DD */
export function shanghaiWeekStart(today = todayStr()): string {
  const [y, mo, da] = today.split('-').map(Number);
  const utcApprox = new Date(Date.UTC(y, mo - 1, da, 4, 0, 0));
  const dow = utcApprox.getUTCDay() || 7;
  utcApprox.setUTCDate(utcApprox.getUTCDate() - dow + 1);
  const wy = utcApprox.getUTCFullYear();
  const wm = String(utcApprox.getUTCMonth() + 1).padStart(2, '0');
  const wd = String(utcApprox.getUTCDate()).padStart(2, '0');
  return `${wy}-${wm}-${wd}`;
}

export function shanghaiWeekEnd(today = todayStr()): string {
  return addShanghaiDays(shanghaiWeekStart(today), 6);
}

/** other 时 note 至少 2 字（去空白） */
export function giftNoteOk(reasonCode: string, note?: string | null): boolean {
  if (reasonCode !== PointGiftReason.OTHER) return true;
  return !!(note && note.trim().length >= 2);
}
