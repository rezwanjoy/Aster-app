// Attendance rates and weekly series (brief §8.3, §23: 4 weeks / 8 weeks / term).
import type { AppData, ID, Term } from '@/types';
import { addDays, diffDays } from './dates';

export type AttendanceRange = '4w' | '8w' | 'term';

/** First day of the range, ending today (inclusive). */
export function rangeStart(range: AttendanceRange, today: string, term?: Term): string {
  if (range === '4w') return addDays(today, -27);
  if (range === '8w') return addDays(today, -55);
  return term ? term.startDate : addDays(today, -55);
}

/** Number of weekly buckets a range shows (the term is capped at 26 weeks). */
export function weeksIn(range: AttendanceRange, today: string, term?: Term): number {
  if (range === '4w') return 4;
  if (range === '8w') return 8;
  const days = term ? Math.max(1, diffDays(today, term.startDate) + 1) : 56;
  return Math.min(26, Math.max(1, Math.ceil(days / 7)));
}

export interface Rate {
  attended: number;
  total: number;
  /** 0-100, or null when there were no classes in the range */
  pct: number | null;
}

/** "Late" counts as attended. With `studentId` only that student's entries count. */
export function attendanceRate(d: AppData, o: { batchIds: ID[]; from: string; to: string; studentId?: ID }): Rate {
  let attended = 0;
  let total = 0;
  for (const s of d.sessions) {
    if (!o.batchIds.includes(s.batchId) || s.date < o.from || s.date > o.to) continue;
    for (const [id, status] of Object.entries(s.attendance)) {
      if (o.studentId && id !== o.studentId) continue;
      total += 1;
      if (status !== 'absent') attended += 1;
    }
  }
  return { attended, total, pct: total ? Math.round((attended / total) * 100) : null };
}

export interface WeekBucket {
  weekStart: string;
  weekEnd: string;
  pct: number | null;
  total: number;
}

/** Seven-day buckets ending today, oldest first. */
export function weeklyAttendance(d: AppData, batchIds: ID[], today: string, weeks: number): WeekBucket[] {
  return Array.from({ length: weeks }, (_, i) => {
    const weekEnd = addDays(today, -7 * (weeks - 1 - i));
    const weekStart = addDays(weekEnd, -6);
    const r = attendanceRate(d, { batchIds, from: weekStart, to: weekEnd });
    return { weekStart, weekEnd, pct: r.pct, total: r.total };
  });
}
