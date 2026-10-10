import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { applyPaste, examStudents, examSummary, missingMarks, nextCell, parsePaste, studentPct, totalMax } from '../src/lib/marks';
import { checkIntegrity, ensureMonthFees, upsert } from '../src/lib/ops';
import { feeStatus, feesFor } from '../src/lib/fees';

const REF = '2026-10-08';
const seed = generateSeed(REF);
const model = seed.assessments.find((a) => a.id === 'a_math_model')!; // upcoming, no marks
const test5 = seed.assessments.find((a) => a.id === 'a_math_5')!;

describe('exam summary', () => {
  it('lists the students of the exam\'s batch', () => {
    expect(examStudents(seed, model)).toHaveLength(12);
    expect(totalMax(model)).toBe(40);
  });
  it('summarises a scored exam', () => {
    const s = examSummary(seed, test5, REF);
    expect(s.students).toBe(12);
    expect(s.scored).toBe(12);
    expect(s.upcoming).toBe(false);
    expect(s.avgPct).toBeGreaterThan(30);
    expect(s.avgPct).toBeLessThan(90);
    expect((s.highest as { pct: number }).pct).toBeGreaterThanOrEqual((s.lowest as { pct: number }).pct);
    expect(s.topicAverages).toHaveLength(4);
    expect(missingMarks(seed, test5)).toBe(0);
  });
  it('treats an exam with no marks as upcoming with everything missing', () => {
    const s = examSummary(seed, model, REF);
    expect(s.upcoming).toBe(true);
    expect(s.scored).toBe(0);
    expect(s.avgPct).toBeNull();
    expect(s.highest).toBeNull();
    expect(missingMarks(seed, model)).toBe(12 * 4);
  });
  it('computes a student\'s percentage over the parts they have marks for', () => {
    const a = { ...model, scores: { s_01: { tp_quad: 5, tp_trig: 7 } } };
    expect(studentPct(a, 's_01')).toBe(60); // 12 of 20
    expect(studentPct(a, 's_02')).toBeNull();
  });
});

describe('pasting from a spreadsheet', () => {
  const ids = ['s_01', 's_02', 's_03'];
  const topics = ['tp_quad', 'tp_trig', 'tp_circ', 'tp_mens'];

  it('parses tabs and newlines (including Windows line endings and a trailing newline)', () => {
    expect(parsePaste('7\t8\r\n5\t6\r\n')).toEqual([['7', '8'], ['5', '6']]);
    expect(parsePaste('9')).toEqual([['9']]);
  });
  it('fills a block starting at the chosen cell', () => {
    const { data, applied, skipped } = applyPaste(seed, 'a_math_model', ids, topics, { row: 1, col: 1 }, [['7', '8'], ['5', '6']]);
    expect(applied).toBe(4);
    expect(skipped).toBe(0);
    expect(data.assessments.find((a) => a.id === 'a_math_model')!.scores['s_02']).toEqual({ tp_trig: 7, tp_circ: 8 });
    expect(data.assessments.find((a) => a.id === 'a_math_model')!.scores['s_03']).toEqual({ tp_trig: 5, tp_circ: 6 });
    expect(checkIntegrity(data)).toEqual([]);
  });
  it('skips cells that are empty, not numbers, or above the maximum, but applies the rest', () => {
    const { data, applied, skipped } = applyPaste(seed, 'a_math_model', ids, topics, { row: 0, col: 0 }, [['7', 'abs', '11', ''], ['x', '4', '10', '0']]);
    expect(applied).toBe(4); // 7, 4, 10, 0
    expect(skipped).toBe(3); // abs, 11, x
    expect(data.assessments.find((a) => a.id === 'a_math_model')!.scores['s_01']).toEqual({ tp_quad: 7 });
  });
  it('ignores cells that fall outside the grid', () => {
    const { applied } = applyPaste(seed, 'a_math_model', ids, topics, { row: 2, col: 3 }, [['5', '5'], ['5', '5']]);
    expect(applied).toBe(1);
  });
});

describe('keyboard movement', () => {
  it('Enter and ArrowDown go down, Shift+Enter and ArrowUp go up', () => {
    expect(nextCell(5, 3, 1, 2, 'Enter')).toEqual({ row: 2, col: 2 });
    expect(nextCell(5, 3, 1, 2, 'ArrowDown')).toEqual({ row: 2, col: 2 });
    expect(nextCell(5, 3, 1, 2, 'Enter', true)).toEqual({ row: 0, col: 2 });
    expect(nextCell(5, 3, 1, 2, 'ArrowUp')).toEqual({ row: 0, col: 2 });
  });
  it('stays put at the edges and for other keys', () => {
    expect(nextCell(5, 3, 4, 0, 'Enter')).toBeNull();
    expect(nextCell(5, 3, 0, 0, 'ArrowUp')).toBeNull();
    expect(nextCell(5, 3, 1, 1, 'a')).toBeNull();
  });
});

describe('ensureMonthFees', () => {
  it('creates a record for every student in the batch with the batch fee', () => {
    const next = ensureMonthFees(seed, ['b_phy9'], '2026-11');
    const created = feesFor(next, { batchIds: ['b_phy9'], month: '2026-11' });
    expect(created).toHaveLength(10);
    expect(created.every((f) => f.due === 1200 && f.paid === 0)).toBe(true);
    expect(feeStatus(created[0], '2026-11-05')).toBe('due');
    expect(checkIntegrity(next)).toEqual([]);
  });
  it('does nothing when the records already exist, and never duplicates', () => {
    expect(ensureMonthFees(seed, ['b_phy9'], '2026-10')).toBe(seed);
    const once = ensureMonthFees(seed, ['b_math10'], '2026-11');
    expect(ensureMonthFees(once, ['b_math10'], '2026-11')).toBe(once);
  });
  it('covers a student added later and respects each batch\'s own fee', () => {
    const d = upsert(seed, 'students', { ...seed.students[0], id: 's_new', name: 'New', batchIds: ['b_math10', 'b_eng10'] });
    const next = ensureMonthFees(d, ['b_math10', 'b_eng10'], '2026-10');
    const mine = next.fees.filter((f) => f.studentId === 's_new');
    expect(mine.map((f) => [f.batchId, f.due]).sort()).toEqual([['b_eng10', 1000], ['b_math10', 1500]]);
  });
});
