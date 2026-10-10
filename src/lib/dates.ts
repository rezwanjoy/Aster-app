// Small, timezone-safe date helpers. Days are "YYYY-MM-DD", months "YYYY-MM".
// All math is done in UTC so DST never shifts a day.

const pad = (n: number) => String(n).padStart(2, '0');

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

/** Today in the device's local timezone as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const addDays = (iso: string, days: number): string => fromUtc(toUtc(iso) + days * 86_400_000);

export const diffDays = (a: string, b: string): number => Math.round((toUtc(a) - toUtc(b)) / 86_400_000);

/** 0 = Sunday … 6 = Saturday */
export const weekdayOf = (iso: string): number => new Date(toUtc(iso)).getUTCDay();

export const monthOf = (iso: string): string => iso.slice(0, 7);

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export const daysInMonth = (month: string): number => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** The date with the given day of the month (clamped to the month's length). */
export const dayInMonth = (month: string, day: number): string =>
  `${month}-${pad(Math.min(day, daysInMonth(month)))}`;

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; diffDays(d, to) <= 0; d = addDays(d, 1)) out.push(d);
  return out;
}

export const isValidISODate = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUtc(toUtc(s)) === s;
