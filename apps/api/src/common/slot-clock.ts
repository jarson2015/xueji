/**
 * Family slot clock map — sanitize + defaults (整点 [start,end)，可跨夜).
 * Kept in sync with apps/web timeSlotPolicy defaults.
 */

export type SlotHourRange = { startHour: number; endHour: number };
export type SlotClockMap = Record<string, SlotHourRange>;

export const BASE_SLOT_KEYS = [
  'after_wake',
  'after_school',
  'after_dinner',
  'bedtime',
  'anytime',
] as const;

export const EXTENDED_SLOT_KEYS = [
  'before_school',
  'after_breakfast',
  'after_lunch',
] as const;

export const ALL_TIMED_SLOT_KEYS = [
  'after_wake',
  'after_breakfast',
  'before_school',
  'after_lunch',
  'after_school',
  'after_dinner',
  'bedtime',
] as const;

export const DEFAULT_CLOCK_BASE: SlotClockMap = {
  after_wake: { startHour: 6, endHour: 9 },
  after_school: { startHour: 14, endHour: 18 },
  after_dinner: { startHour: 18, endHour: 21 },
  bedtime: { startHour: 21, endHour: 6 },
};

export const DEFAULT_CLOCK_EXTENDED: SlotClockMap = {
  after_wake: { startHour: 6, endHour: 7 },
  after_breakfast: { startHour: 7, endHour: 8 },
  before_school: { startHour: 8, endHour: 9 },
  after_lunch: { startHour: 12, endHour: 14 },
  after_school: { startHour: 14, endHour: 18 },
  after_dinner: { startHour: 18, endHour: 21 },
  bedtime: { startHour: 21, endHour: 6 },
};

function clampHour(n: unknown): number | null {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const h = Math.floor(v);
  if (h < 0 || h > 23) return null;
  return h;
}

/** Normalize partial user overrides; drop invalid keys/ranges. */
export function sanitizeSlotClockMap(
  raw: unknown,
): SlotClockMap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: SlotClockMap = {};
  const allowed = new Set<string>(ALL_TIMED_SLOT_KEYS);
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(k)) continue;
    if (!v || typeof v !== 'object') continue;
    const row = v as Record<string, unknown>;
    const startHour = clampHour(row.startHour);
    const endHour = clampHour(row.endHour);
    if (startHour == null || endHour == null) continue;
    if (startHour === endHour) continue;
    out[k] = { startHour, endHour };
  }
  return Object.keys(out).length ? out : null;
}

export function effectiveSlotClockMap(
  extended: boolean,
  override?: SlotClockMap | null,
): SlotClockMap {
  const base = {
    ...(extended ? DEFAULT_CLOCK_EXTENDED : DEFAULT_CLOCK_BASE),
  };
  if (!override) return base;
  for (const [k, v] of Object.entries(override)) {
    if (!(ALL_TIMED_SLOT_KEYS as readonly string[]).includes(k)) continue;
    if (!extended && (EXTENDED_SLOT_KEYS as readonly string[]).includes(k)) {
      continue;
    }
    base[k] = v;
  }
  return base;
}

export function isKnownTimeSlot(s: string): boolean {
  return (
    (BASE_SLOT_KEYS as readonly string[]).includes(s) ||
    (EXTENDED_SLOT_KEYS as readonly string[]).includes(s)
  );
}
