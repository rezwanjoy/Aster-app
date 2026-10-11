// A small local counter for the "free plan: N AI insights a month" copy (brief §9.5).
// It never blocks: past the limit the card shows the calculated insight (and the "unlimited is planned for Tutor Pro" notice).

export interface Usage {
  month: string;
  count: number;
}

export const FREE_AI_PER_MONTH = 15;

/** This month's count (a new month starts again from zero). */
export function usedThisMonth(u: Usage, now: Date = new Date()): number {
  return u.month === monthKey(now) ? u.count : 0;
}

export const monthKey = (now: Date): string => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const bumpUsage = (u: Usage, now: Date = new Date()): Usage => ({ month: monthKey(now), count: usedThisMonth(u, now) + 1 });

export const overFreeLimit = (u: Usage, now: Date = new Date()): boolean => usedThisMonth(u, now) >= FREE_AI_PER_MONTH;
