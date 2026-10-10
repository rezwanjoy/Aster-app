// Fake-door interest tracking (brief §11): which premium features tutors look at, ask about, and would pay for.
import type { AppData, InterestEvent } from '@/types';

/** Add one interest event (the time is filled in here). */
export function recordInterest(d: AppData, e: Omit<InterestEvent, 'at'>, now: Date = new Date()): AppData {
  return { ...d, interest: [...d.interest, { ...e, at: now.toISOString() }] };
}

export interface InterestSummary {
  feature: string;
  views: number;
  notify: number;
  wouldPay: number;
  /** how often each price was chosen */
  prices: Record<string, number>;
}

/** One row per feature, the most wanted first (would pay, then notify, then views). */
export function summarizeInterest(events: InterestEvent[]): InterestSummary[] {
  const map = new Map<string, InterestSummary>();
  for (const e of events) {
    const row = map.get(e.feature) ?? { feature: e.feature, views: 0, notify: 0, wouldPay: 0, prices: {} };
    if (e.type === 'view') row.views += 1;
    else if (e.type === 'tap_unlock') row.notify += 1;
    else {
      row.wouldPay += 1;
      if (e.priceChoice) row.prices[e.priceChoice] = (row.prices[e.priceChoice] ?? 0) + 1;
    }
    map.set(e.feature, row);
  }
  return [...map.values()].sort((a, b) => b.wouldPay - a.wouldPay || b.notify - a.notify || b.views - a.views || a.feature.localeCompare(b.feature));
}

const csvCell = (v: string | undefined) => {
  const s = v ?? '';
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** CSV the founder can open in a spreadsheet: one line per event. */
export function interestToCsv(events: InterestEvent[]): string {
  return ['feature,type,at,priceChoice', ...events.map((e) => [e.feature, e.type, e.at, e.priceChoice].map(csvCell).join(','))].join('\n');
}

/** JSON with a small header so files from several tutors can be told apart and merged. */
export function interestToJson(events: InterestEvent[], exportedAt: Date = new Date()): string {
  return JSON.stringify({ app: 'aster', kind: 'interest', exportedAt: exportedAt.toISOString(), events, summary: summarizeInterest(events) }, null, 2);
}

export const clearInterest = (d: AppData): AppData => ({ ...d, interest: [] });
