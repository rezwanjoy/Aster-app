// Fee status, totals and reminder text (brief §8.8, §23: per student, per batch, per month).
import type { AppData, FeeRecord, ID, L10n, Lang } from '@/types';
import { dayInMonth, monthOf } from './dates';

export type FeeStatus = 'paid' | 'partial' | 'due' | 'overdue';
/** Fees fall due on this day of the month; after it, unpaid fees are overdue. Configurable. */
export const DEFAULT_GRACE_DAY = 10;

export const remaining = (f: FeeRecord): number => Math.max(0, f.due - f.paid);

/** paid → partial (some money in) → overdue (past the due day) → due. */
export function feeStatus(f: FeeRecord, today: string, graceDay: number = DEFAULT_GRACE_DAY): FeeStatus {
  if (f.paid >= f.due) return 'paid';
  if (f.paid > 0) return 'partial';
  return today > dayInMonth(f.month, graceDay) ? 'overdue' : 'due';
}

/** True when money is still owed for a month that has already finished (≥ 1 month late). */
export const isMonthsLate = (f: FeeRecord, today: string): boolean => remaining(f) > 0 && f.month < monthOf(today);

export interface FeeTotals {
  due: number;
  collected: number;
  owed: number;
  /** collected as a share of due, 0-100 */
  pct: number;
}

export function totals(records: FeeRecord[]): FeeTotals {
  const due = records.reduce((s, f) => s + f.due, 0);
  const collected = records.reduce((s, f) => s + Math.min(f.paid, f.due), 0);
  return { due, collected, owed: due - collected, pct: due ? Math.round((collected / due) * 100) : 0 };
}

/** Records for some batches, optionally for one month. */
export const feesFor = (d: AppData, o: { batchIds: ID[]; month?: string; studentId?: ID }): FeeRecord[] =>
  d.fees.filter((f) => o.batchIds.includes(f.batchId) && (!o.month || f.month === o.month) && (!o.studentId || f.studentId === o.studentId));

/** Every month that has fee records, newest first. */
export const feeMonths = (d: AppData): string[] => [...new Set(d.fees.map((f) => f.month))].sort().reverse();

/** Students with at least one fee that is a month or more late. */
export function studentsWithLateFees(d: AppData, batchIds: ID[], today: string): ID[] {
  return [...new Set(feesFor(d, { batchIds }).filter((f) => isMonthsLate(f, today)).map((f) => f.studentId))];
}

/** Record a payment (adds to what was paid, capped at the amount due). */
export function recordPayment(f: FeeRecord, amount: number, paidOn: string): FeeRecord {
  if (!Number.isFinite(amount) || amount <= 0) return f;
  const paid = Math.min(f.due, f.paid + amount);
  return { ...f, paid, paidOn };
}

/** Fill a reminder template: {student} {amount} {month} {center}. Unknown placeholders are left as written. */
export function buildReminder(template: L10n, lang: Lang, vars: { student: string; amount: string; month: string; center: string }): string {
  return template[lang].replace(/\{(student|amount|month|center)\}/g, (_, key: keyof typeof vars) => vars[key]);
}

/** Names inside {braces} that the reminder template cannot fill (typos like {studnet}). */
export function unknownPlaceholders(template: string): string[] {
  const known = new Set(['student', 'amount', 'month', 'center']);
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((name) => !known.has(name));
}
