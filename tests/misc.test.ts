import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { buildReminder, feeMonths, feeStatus, feesFor, isMonthsLate, recordPayment, remaining, studentsWithLateFees, totals } from '../src/lib/fees';
import { DEFAULT_GRADE_BANDS, formatGrade, letterToPercent, percentToGrade, validateBands } from '../src/lib/grading';
import { normalizePhone, whatsappLink } from '../src/lib/whatsapp';
import { completedDays, currentStreak, longestStreak, studentTasks, weekDots, weeklyMinutes, weekStartOf } from '../src/lib/streak';
import { formatMonth } from '../src/i18n/format';
import type { FeeRecord } from '../src/types';

const REF = '2026-10-08'; // Thursday
const seed = generateSeed(REF);
const rec = (over: Partial<FeeRecord>): FeeRecord => ({ id: 'f', studentId: 's', batchId: 'b', month: '2026-10', due: 1500, paid: 0, ...over });

describe('grading', () => {
  it('maps percentages to the bands at the edges', () => {
    expect(percentToGrade(80).letter).toBe('A+');
    expect(percentToGrade(79.9).letter).toBe('A');
    expect(percentToGrade(70).letter).toBe('A');
    expect(percentToGrade(60).letter).toBe('A-');
    expect(percentToGrade(50).letter).toBe('B');
    expect(percentToGrade(40).letter).toBe('C');
    expect(percentToGrade(33).letter).toBe('D');
    expect(percentToGrade(32.9).letter).toBe('F');
    expect(percentToGrade(0).gpa).toBe(0);
  });
  it('clamps out-of-range input', () => {
    expect(percentToGrade(140).letter).toBe('A+');
    expect(percentToGrade(-5).letter).toBe('F');
  });
  it('formats in each scale', () => {
    expect(formatGrade(72.4, 'percent')).toBe('72%');
    expect(formatGrade(72.4, 'gpa5')).toBe('4.00');
    expect(formatGrade(72.4, 'letter')).toBe('A');
    expect(formatGrade(85, 'gpa5')).toBe('5.00');
  });
  it('finds the percentage a letter needs', () => {
    expect(letterToPercent('A+')).toBe(80);
    expect(letterToPercent(' a ')).toBe(70);
    expect(letterToPercent('Z')).toBeNull();
  });
  it('works with edited bands', () => {
    const custom = [{ min: 90, letter: 'Top', gpa: 4 }, { min: 0, letter: 'Rest', gpa: 0 }];
    expect(percentToGrade(95, custom).letter).toBe('Top');
    expect(percentToGrade(89, custom).letter).toBe('Rest');
  });
  it('validates the default and rejects broken bands', () => {
    expect(validateBands(DEFAULT_GRADE_BANDS)).toEqual([]);
    expect(validateBands([{ min: 10, letter: 'A', gpa: 4 }])).toContain('The lowest grade must start at 0%');
    expect(validateBands([{ min: 0, letter: 'A', gpa: 4 }, { min: 0, letter: 'B', gpa: 3 }])).toContain('Two grades start at the same percentage');
    expect(validateBands([{ min: 50, letter: 'A', gpa: 1 }, { min: 0, letter: 'B', gpa: 3 }])).toHaveLength(1);
  });
});

describe('fees', () => {
  it('paid, partial, due and overdue (grace day 10)', () => {
    expect(feeStatus(rec({ paid: 1500 }), '2026-10-20')).toBe('paid');
    expect(feeStatus(rec({ paid: 2000 }), '2026-10-20')).toBe('paid');
    expect(feeStatus(rec({ paid: 800 }), '2026-10-20')).toBe('partial');
    expect(feeStatus(rec({ paid: 0 }), '2026-10-10')).toBe('due'); // still on the grace day
    expect(feeStatus(rec({ paid: 0 }), '2026-10-11')).toBe('overdue');
    expect(feeStatus(rec({ month: '2026-09' }), '2026-10-01')).toBe('overdue');
  });
  it('honours a different grace day', () => {
    expect(feeStatus(rec({}), '2026-10-15', 20)).toBe('due');
    expect(feeStatus(rec({}), '2026-10-21', 20)).toBe('overdue');
  });
  it('knows what is left and what is a month late', () => {
    expect(remaining(rec({ paid: 800 }))).toBe(700);
    expect(remaining(rec({ paid: 3000 }))).toBe(0);
    expect(isMonthsLate(rec({ month: '2026-09' }), REF)).toBe(true);
    expect(isMonthsLate(rec({ month: '2026-10' }), REF)).toBe(false);
    expect(isMonthsLate(rec({ month: '2026-09', paid: 1500 }), REF)).toBe(false);
  });
  it('totals due, collected and owed', () => {
    const t = totals([rec({ paid: 1500 }), rec({ paid: 500 }), rec({ paid: 0 })]);
    expect(t).toEqual({ due: 4500, collected: 2000, owed: 2500, pct: 44 });
    expect(totals([])).toEqual({ due: 0, collected: 0, owed: 0, pct: 0 });
  });
  it('records payments, capped at the amount due', () => {
    expect(recordPayment(rec({ paid: 800 }), 400, REF)).toMatchObject({ paid: 1200, paidOn: REF });
    expect(recordPayment(rec({ paid: 800 }), 5000, REF).paid).toBe(1500);
    const f = rec({ paid: 800 });
    expect(recordPayment(f, -5, REF)).toBe(f);
    expect(recordPayment(f, Number.NaN, REF)).toBe(f);
  });
  it('lists fees by batch and month, with months newest first', () => {
    const math = feesFor(seed, { batchIds: ['b_math10'], month: '2026-10' });
    expect(math).toHaveLength(12);
    expect(feeMonths(seed)).toEqual(['2026-10', '2026-09']);
  });
  it('finds the two students who are a month late', () => {
    const late = studentsWithLateFees(seed, ['b_math10', 'b_phy9', 'b_eng10'], REF);
    const names = seed.students.filter((s) => late.includes(s.id)).map((s) => s.name).sort();
    expect(names).toEqual(['Sabbir Khan', 'Tanvir Hasan']);
  });
  it('fills the reminder template in both languages', () => {
    const template = { en: 'Hi {student}: {amount} for {month} at {center}. {unknown}', bn: '{student}-এর {month} মাসের {amount} ({center})' };
    const vars = { student: 'Rafi', amount: '৳1,500', month: 'October 2026', center: 'Aster' };
    expect(buildReminder(template, 'en', vars)).toBe('Hi Rafi: ৳1,500 for October 2026 at Aster. {unknown}');
    expect(buildReminder(template, 'bn', vars)).toBe('Rafi-এর October 2026 মাসের ৳1,500 (Aster)');
  });
  it('formats month names', () => {
    expect(formatMonth('2026-10', 'en', false)).toBe('October 2026');
    expect(formatMonth('2026-10', 'bn', true)).toMatch(/^[^\d]+ [০-৯]{4}$/);
    expect(formatMonth('2026-10', 'bn', false)).toMatch(/2026/);
  });
});

describe('whatsapp links', () => {
  it('normalises Bangladesh numbers', () => {
    expect(normalizePhone('01712-345678')).toBe('8801712345678');
    expect(normalizePhone('+880 1712 345678')).toBe('8801712345678');
    expect(normalizePhone('8801712345678')).toBe('8801712345678');
    expect(normalizePhone('008801712345678')).toBe('8801712345678');
    expect(normalizePhone('1712345678')).toBe('8801712345678');
    expect(normalizePhone('01000-000001')).toBe('8801000000001');
  });
  it('rejects things that are not phone numbers', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('12')).toBeNull();
  });
  it('encodes spaces, punctuation and Bangla text', () => {
    const text = 'Hello & welcome! রাফি ?=#';
    const link = whatsappLink('01712-345678', text);
    expect(link.startsWith('https://wa.me/8801712345678?text=')).toBe(true);
    expect(decodeURIComponent(link.split('?text=')[1])).toBe(text);
    expect(link).not.toContain(' ');
    expect(link.split('?text=')[1]).not.toMatch(/[&?#= ]/);
  });
  it('lets the user pick the contact when there is no number', () => {
    expect(whatsappLink(undefined, 'Hi')).toBe('https://wa.me/?text=Hi');
  });
});

describe('streaks', () => {
  const study = [0, 1, 2, 3, 4]; // Sun–Thu; Fri and Sat are rest days
  const days = (...d: string[]) => new Set(d);

  it('counts consecutive completed days', () => {
    expect(currentStreak(days('2026-10-06', '2026-10-07', '2026-10-08'), study, REF)).toBe(3);
  });
  it('does not break the streak while today is still open', () => {
    expect(currentStreak(days('2026-10-06', '2026-10-07'), study, REF)).toBe(2);
  });
  it('breaks on a missed study day', () => {
    expect(currentStreak(days('2026-10-05', '2026-10-08'), study, REF)).toBe(1); // Tue 6 and Wed 7 missed
    expect(currentStreak(days('2026-10-04', '2026-10-05'), study, '2026-10-07')).toBe(0); // Tue 6 missed, today Wed open
  });
  it('rest days neither count nor break it', () => {
    // Thu 8, (Fri 9 + Sat 10 rest), Sun 11: done Thu and Sun
    expect(currentStreak(days('2026-10-08', '2026-10-11'), study, '2026-10-11')).toBe(2);
  });
  it('is zero with no activity', () => {
    expect(currentStreak(new Set(), study, REF)).toBe(0);
  });
  it('finds the longest run', () => {
    const done = days('2026-10-01', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-08');
    // Thu 1 (alone: Fri 2 and Sat 3 are rest), Sun 4, Mon 5, Tue 6 → 4 in a row; Wed 7 missed; Thu 8
    expect(longestStreak(done, study, REF)).toBe(4);
    expect(longestStreak(new Set(), study, REF)).toBe(0);
  });
  it('matches the demo: Rafi has a 3-day streak', () => {
    const done = completedDays(seed.plans, 's_01');
    expect(currentStreak(done, [0, 1, 2, 3, 4], REF)).toBe(3);
    expect(longestStreak(done, [0, 1, 2, 3, 4], REF)).toBe(3);
  });
  it('draws the last seven days as dots', () => {
    const dots = weekDots(days('2026-10-06', '2026-10-07'), study, REF);
    expect(dots.map((d) => d.date)[6]).toBe(REF);
    expect(dots.map((d) => d.status)).toEqual([
      'rest', // Fri 2
      'rest', // Sat 3
      'missed', // Sun 4
      'missed', // Mon 5
      'done', // Tue 6
      'done', // Wed 7
      'today', // Thu 8
    ]);
  });
  it('uses doneOn when present', () => {
    const plans = [{ id: 'p', studentId: 's', createdAt: REF, weekStart: REF, tasks: [{ id: 't', date: '2026-10-01', kind: 'practice' as const, minutes: 5, done: true, doneOn: '2026-10-07' }] }];
    expect([...completedDays(plans, 's')]).toEqual(['2026-10-07']);
  });
});

describe('weekly minutes', () => {
  it('weeks start on Saturday', () => {
    expect(weekStartOf('2026-10-08')).toBe('2026-10-03');
    expect(weekStartOf('2026-10-03')).toBe('2026-10-03');
    expect(weekStartOf('2026-10-02')).toBe('2026-09-26');
  });
  it('adds planned and completed minutes for the week', () => {
    const w = weeklyMinutes(studentTasks(seed.plans, { id: 's_01' }), REF);
    expect(w).toEqual({ weekStart: '2026-10-03', planned: 60, completed: 35, pct: 58 });
  });
  it('is zero with nothing planned', () => {
    expect(weeklyMinutes([], REF)).toMatchObject({ planned: 0, completed: 0, pct: 0 });
  });
});
