/** Simple Asia/Shanghai date helpers without extra deps */

export function formatDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

/** Period key for daily/weekly progress reset */
export function getPeriodKey(schedule: string, date = new Date()): string {
  const day = formatDate(date);
  if (schedule === 'daily') return `d:${day}`;
  if (schedule === 'weekly') {
    // Monday of current week in Shanghai calendar day
    const [y, mo, da] = day.split('-').map(Number);
    const utcApprox = new Date(Date.UTC(y, mo - 1, da, 4, 0, 0));
    const dow = utcApprox.getUTCDay() || 7;
    utcApprox.setUTCDate(utcApprox.getUTCDate() - dow + 1);
    const wy = utcApprox.getUTCFullYear();
    const wm = String(utcApprox.getUTCMonth() + 1).padStart(2, '0');
    const wd = String(utcApprox.getUTCDate()).padStart(2, '0');
    return `w:${wy}-${wm}-${wd}`;
  }
  return 'once';
}

export function calcPercent(progressValue: number, targetValue: number): number {
  if (!targetValue || targetValue <= 0) return progressValue > 0 ? 100 : 0;
  return Math.min(100, Math.round((progressValue / targetValue) * 1000) / 10);
}

export function todayStr(date = new Date()): string {
  return formatDate(date);
}

/** End of calendar day (Shanghai) as Date for deadline comparison */
export function endOfShanghaiDay(dateKey: string): Date {
  // Treat deadline date as inclusive through 23:59:59 Shanghai ≈ UTC+8
  return new Date(`${dateKey}T23:59:59+08:00`);
}

export function addShanghaiDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + delta, 4, 0, 0));
  const wy = utc.getUTCFullYear();
  const wm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const wd = String(utc.getUTCDate()).padStart(2, '0');
  return `${wy}-${wm}-${wd}`;
}

/** once + deadline: expired after end of deadline day (Shanghai) */
export function isOnceDeadlineExpired(
  schedule: string,
  deadline: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (schedule !== 'once' || !deadline) return false;
  const key =
    typeof deadline === 'string'
      ? deadline.slice(0, 10)
      : formatDate(deadline);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return now.getTime() > endOfShanghaiDay(key).getTime();
}

/** Previous period key for daily/weekly makeup */
export function previousPeriodKey(schedule: string, now = new Date()): string | null {
  if (schedule === 'daily') {
    return getPeriodKey('daily', new Date(now.getTime() - 24 * 60 * 60 * 1000));
  }
  if (schedule === 'weekly') {
    return getPeriodKey('weekly', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  }
  return null;
}

/** Asia/Shanghai HH:mm (zero-padded) */
export function formatShanghaiHm(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value || '00';
  const m = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/**
 * Normalize user time to HH:mm. Returns null if invalid.
 * Accepts "9:5" / "09:05" / "23:30".
 */
export function normalizeHm(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(s);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
