import { describe, expect, it } from 'vitest';
import { addDays, addMonths, dayInMonth, daysInMonth, diffDays, eachDay, isValidISODate, monthOf, todayISO, weekdayOf } from '../src/lib/dates';

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('is not affected by DST', () => {
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });
  it('diffs days and finds weekdays', () => {
    expect(diffDays('2026-10-08', '2026-10-01')).toBe(7);
    expect(weekdayOf('2026-10-08')).toBe(4); // Thursday
  });
  it('handles months', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(daysInMonth('2028-02')).toBe(29);
    expect(dayInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(monthOf('2026-10-08')).toBe('2026-10');
  });
  it('lists each day inclusively', () => {
    expect(eachDay('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-10-08')).toBe(true);
    expect(isValidISODate('08/10/2026')).toBe(false);
  });
  it('formats today in local time', () => {
    expect(todayISO(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08');
  });
});
