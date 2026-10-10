import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { checkIntegrity } from '../src/lib/ops';
import { addDays, monthOf, addMonths } from '../src/lib/dates';

const REF = '2026-10-08';
const seed = generateSeed(REF);

describe('seed data', () => {
  it('is deterministic for the same reference date', () => {
    expect(generateSeed(REF)).toEqual(generateSeed(REF));
  });

  it('has no broken references', () => {
    expect(checkIntegrity(seed)).toEqual([]);
  });

  it('matches the brief: 3 batches, 30 memberships, Rafi in two batches', () => {
    expect(seed.batches).toHaveLength(3);
    const members = (id: string) => seed.students.filter((s) => s.batchIds.includes(id)).length;
    expect([members('b_math10'), members('b_phy9'), members('b_eng10')]).toEqual([12, 10, 8]);
    const rafi = seed.students.find((s) => s.name === 'Rafi Ahmed')!;
    expect(rafi.batchIds).toEqual(['b_math10', 'b_eng10']);
    expect(rafi.studyDays).toEqual([0, 1, 2, 3, 4]);
    expect(rafi.dailyMinutes).toBe(15);
  });

  it('uses fake phone numbers and fictional names only', () => {
    expect(seed.students.every((s) => /^01000-000\d{3}$/.test(s.guardianPhone ?? ''))).toBe(true);
    expect(seed.students.every((s) => s.nameBn)).toBe(true);
  });

  it('puts about 60% of Class 10 Math in the red for Quadratic Equations', () => {
    const math = seed.students.filter((s) => s.batchIds.includes('b_math10'));
    const quadTests = seed.assessments.filter((a) => a.batchId === 'b_math10' && a.parts.some((p) => p.topicId === 'tp_quad') && Object.keys(a.scores).length);
    const avg = (id: string) => {
      const vals = quadTests.map((a) => a.scores[id]['tp_quad'] as number);
      return (vals.reduce((x, y) => x + y, 0) / vals.length) * 10; // marks are out of 10
    };
    const red = math.filter((s) => avg(s.id) < 50).length;
    expect(red).toBe(7); // 7 of 12 = 58%
  });

  it('shows Rafi weak in Quadratic Equations and Trigonometry, strong in Real Numbers', () => {
    const rafi = seed.students.find((s) => s.name === 'Rafi Ahmed')!;
    const latest = (topic: string) => {
      const tests = seed.assessments.filter((a) => a.scores[rafi.id]?.[topic] != null).sort((a, b) => a.date.localeCompare(b.date));
      return (tests[tests.length - 1].scores[rafi.id][topic] as number) * 10;
    };
    expect(latest('tp_quad')).toBeLessThan(50);
    expect(latest('tp_trig')).toBeLessThan(50);
    expect(latest('tp_real')).toBeGreaterThanOrEqual(70);
  });

  it('has a student whose attendance and marks are falling (Tanvir)', () => {
    const tanvir = seed.students.find((s) => s.name === 'Tanvir Hasan')!;
    const sessions = seed.sessions.filter((s) => s.batchId === 'b_math10').sort((a, b) => a.date.localeCompare(b.date));
    const rate = (list: typeof sessions) => list.filter((s) => s.attendance[tanvir.id] !== 'absent').length / list.length;
    expect(rate(sessions)).toBeLessThan(0.75);
    expect(rate(sessions.slice(-6))).toBeLessThan(rate(sessions.slice(0, 6)));
    const total = (a: (typeof seed.assessments)[number]) => Object.values(a.scores[tanvir.id]).reduce((x: number, y) => x + (y ?? 0), 0) / a.parts.length;
    const tests = seed.assessments.filter((a) => a.batchId === 'b_math10' && a.scores[tanvir.id]).sort((a, b) => a.date.localeCompare(b.date));
    expect(total(tests[tests.length - 1])).toBeLessThan(total(tests[0]));
  });

  it('has exactly two students with an unpaid previous month (overdue)', () => {
    const prev = addMonths(monthOf(REF), -1);
    const unpaid = new Set(seed.fees.filter((f) => f.month === prev && f.paid < f.due).map((f) => f.studentId));
    const names = seed.students.filter((s) => unpaid.has(s.id)).map((s) => s.name).sort();
    expect(names).toEqual(['Sabbir Khan', 'Tanvir Hasan']);
  });

  it('records fees against the right batch and month', () => {
    const cur = monthOf(REF);
    const rafiFees = seed.fees.filter((f) => f.studentId === 's_01' && f.month === cur);
    expect(rafiFees.map((f) => f.batchId).sort()).toEqual(['b_eng10', 'b_math10']);
  });

  it('gives Rafi a 3-day streak and unfinished tasks today', () => {
    const plan = seed.plans.find((p) => p.studentId === 's_01')!;
    const doneDays = new Set(plan.tasks.filter((t) => t.done).map((t) => t.date));
    expect([REF, addDays(REF, -1), addDays(REF, -2)].every((d) => doneDays.has(d))).toBe(true);
    expect(plan.tasks.filter((t) => t.date === REF && !t.done).length).toBeGreaterThan(0);
  });

  it('has upcoming exams for the calendar, an unread message and a holiday', () => {
    const upcoming = seed.assessments.filter((a) => a.date > REF);
    expect(upcoming.length).toBeGreaterThanOrEqual(2);
    expect(upcoming.every((a) => Object.keys(a.scores).length === 0)).toBe(true);
    expect(seed.messages.some((m) => m.studentId === 's_01' && !m.readAt)).toBe(true);
    expect(seed.events.some((e) => e.kind === 'holiday')).toBe(true);
  });

  it('keeps marks within each part\'s maximum', () => {
    for (const a of seed.assessments) {
      const max = Object.fromEntries(a.parts.map((p) => [p.topicId, p.maxMarks]));
      for (const row of Object.values(a.scores)) for (const [t, v] of Object.entries(row)) expect(v as number).toBeLessThanOrEqual(max[t]);
    }
  });

  it('puts the current term around the reference date', () => {
    const term = seed.terms.find((t) => t.id === seed.currentTermId)!;
    expect(term.startDate < REF && REF < term.endDate).toBe(true);
  });
});
