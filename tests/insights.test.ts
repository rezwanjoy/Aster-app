import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { batchTopicStats, classAverageSeries, topicHeatmap } from '../src/lib/batch';
import { scopeBatchIds } from '../src/lib/scope';

const REF = '2026-10-08';
const ctx = { today: REF };
const seed = generateSeed(REF);

describe('topicHeatmap', () => {
  const map = topicHeatmap(seed, ['b_math10'], 'sub_math', ctx);

  it('has one column per topic and one row per student in the batch', () => {
    expect(map.topicIds).toHaveLength(11);
    expect(map.rows).toHaveLength(12);
    expect(map.rows.every((r) => r.cells.length === 11)).toBe(true);
    expect(map.redPct).toHaveLength(11);
  });
  it('lists the weakest students first', () => {
    const overall = map.rows.map((r) => r.overall as number);
    expect(overall).toEqual([...overall].sort((a, b) => a - b));
    expect(['s_04', 's_05']).toContain(map.rows[0].studentId); // Maliha or Tanvir: the two lowest averages
  });
  it('matches the batch ranking: Quadratic Equations is 58% red', () => {
    const i = map.topicIds.indexOf('tp_quad');
    expect(map.redPct[i]).toBe(58);
    const stat = batchTopicStats(seed, ['b_math10'], ctx).find((s) => s.topicId === 'tp_quad')!;
    expect(map.redPct[i]).toBe(stat.redPct);
  });
  it('shows Rafi weak in Quadratic Equations and strong in Real Numbers', () => {
    const rafi = map.rows.find((r) => r.studentId === 's_01')!;
    expect(rafi.cells[map.topicIds.indexOf('tp_quad')].band).toBe('red');
    expect(rafi.cells[map.topicIds.indexOf('tp_real')].band).toBe('green');
  });
  it('only includes students who study that subject (English across all batches)', () => {
    const eng = topicHeatmap(seed, scopeBatchIds(seed, 'all'), 'sub_eng', ctx);
    expect(eng.rows).toHaveLength(8); // Rafi, Nusrat and Sabbir are in it too
    expect(eng.rows.map((r) => r.studentId)).toContain('s_01');
    expect(eng.rows.map((r) => r.studentId)).not.toContain('s_04');
  });
  it('marks topics without marks as unknown rather than red', () => {
    const none = topicHeatmap({ ...seed, assessments: [] }, ['b_math10'], 'sub_math', ctx);
    expect(none.rows.every((r) => r.cells.every((c) => c.band === 'unknown'))).toBe(true);
    expect(none.redPct.every((p) => p === 0)).toBe(true);
  });
  it('is empty for a subject nobody studies', () => {
    expect(topicHeatmap(seed, ['b_phy9'], 'sub_math', ctx).rows).toEqual([]);
  });
});

describe('classAverageSeries', () => {
  it('has one point per past exam, oldest first, and skips upcoming ones', () => {
    const s = classAverageSeries(seed, ['b_math10'], REF);
    expect(s).toHaveLength(5);
    expect(s.map((p) => p.date)).toEqual([...s.map((p) => p.date)].sort());
    expect(s.every((p) => p.pct > 0 && p.pct < 100 && p.students === 12)).toBe(true);
    expect(s.some((p) => p.name === 'Model Test')).toBe(false);
  });
  it('can cover several batches or one subject', () => {
    expect(classAverageSeries(seed, scopeBatchIds(seed, 'all'), REF)).toHaveLength(5 + 4 + 4);
    expect(classAverageSeries(seed, scopeBatchIds(seed, 'all'), REF, 'sub_phy')).toHaveLength(4);
  });
  it('includes an exam once it has marks', () => {
    const scored = {
      ...seed,
      assessments: seed.assessments.map((a) => (a.id === 'a_math_model' ? { ...a, date: '2026-10-05', scores: { s_01: { tp_quad: 8, tp_trig: 6, tp_circ: 7, tp_mens: 9 } } } : a)),
    };
    const s = classAverageSeries(scored, ['b_math10'], REF);
    expect(s).toHaveLength(6);
    expect(s.find((p) => p.name === 'Model Test')).toMatchObject({ pct: 75, students: 1 });
  });
  it('is empty with no marks', () => {
    expect(classAverageSeries({ ...seed, assessments: [] }, ['b_math10'], REF)).toEqual([]);
  });
});
