/**
 * Rotate duty + shared-task fairness hints (multi-child).
 */

/** Stable non-crypto hash for period keys */
export function hashPeriodKey(periodKey: string): number {
  let h = 0;
  for (let i = 0; i < periodKey.length; i++) {
    h = (h * 31 + periodKey.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Pick today's duty student among assignees.
 * `sortedStudentIds` should already be ordered: birthOrder↑, then id↑.
 */
export function resolveRotateDutyStudentId(
  sortedStudentIds: number[],
  periodKey: string,
): number | null {
  if (!sortedStudentIds.length) return null;
  const idx = hashPeriodKey(periodKey) % sortedStudentIds.length;
  return sortedStudentIds[idx] ?? null;
}

export function sortStudentsForRotate<
  T extends { id: number; birthOrder?: number | null },
>(students: T[]): T[] {
  return [...students].sort((a, b) => {
    const ao = a.birthOrder == null ? 9999 : a.birthOrder;
    const bo = b.birthOrder == null ? 9999 : b.birthOrder;
    if (ao !== bo) return ao - bo;
    return a.id - b.id;
  });
}

export type FairnessStudent = {
  id: number;
  name: string;
  birthOrder?: number | null;
  createdAt?: Date | string | null;
};

export type SharedCompletionCount = { studentId: number; count: number };

export type FairnessHint = {
  kind: 'elder_heavy' | 'imbalance';
  message: string;
  dominantStudentId: number;
  dominantName: string;
  dominantCount: number;
  totalCount: number;
};

function eldestStudent(students: FairnessStudent[]): FairnessStudent | null {
  if (!students.length) return null;
  const withOrder = students.filter(
    (s) => s.birthOrder != null && Number(s.birthOrder) > 0,
  );
  if (withOrder.length) {
    return [...withOrder].sort(
      (a, b) => Number(a.birthOrder) - Number(b.birthOrder) || a.id - b.id,
    )[0];
  }
  return [...students].sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (at !== bt) return at - bt;
    return a.id - b.id;
  })[0];
}

/**
 * Soft parent hint when shared chores skew to one child (esp. eldest).
 */
export function buildFairnessHint(opts: {
  students: FairnessStudent[];
  completions: SharedCompletionCount[];
  minTotal?: number;
  dominantRatio?: number;
}): FairnessHint | null {
  const minTotal = opts.minTotal ?? 4;
  const dominantRatio = opts.dominantRatio ?? 0.6;
  if (opts.students.length < 2) return null;

  const byId = new Map(opts.students.map((s) => [s.id, s]));
  let total = 0;
  let top: SharedCompletionCount | null = null;
  for (const row of opts.completions) {
    if (!byId.has(row.studentId) || row.count <= 0) continue;
    total += row.count;
    if (!top || row.count > top.count) top = row;
  }
  if (!top || total < minTotal) return null;
  if (top.count / total < dominantRatio) return null;

  const person = byId.get(top.studentId);
  if (!person) return null;
  const elder = eldestStudent(opts.students);
  const isElder = !!elder && elder.id === person.id;

  if (isElder) {
    return {
      kind: 'elder_heavy',
      message: `建议给共享家务打开「按天轮值」：最近多由「${person.name}」在做，让弟弟妹妹也有主责机会。`,
      dominantStudentId: person.id,
      dominantName: person.name,
      dominantCount: top.count,
      totalCount: total,
    };
  }
  return {
    kind: 'imbalance',
    message: `建议打开「按天轮值」：最近共享家务多由「${person.name}」完成，轮值能让分工更均匀。`,
    dominantStudentId: person.id,
    dominantName: person.name,
    dominantCount: top.count,
    totalCount: total,
  };
}
