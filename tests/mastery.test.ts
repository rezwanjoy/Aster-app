import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import {
  assessmentTotals, bandOf, goalProgress, masteryOf, overallMastery, overallTrend, studentTopicMastery, topicSeries, trendOf,
} from '../src/lib/mastery';

const REF = '2026-10-08';
const seed = generateSeed(REF);

describe('masteryOf (recency-weighted)', () => {
  it('is null with no data and the value itself with one result', () => {
    expect(masteryOf([])).toBeNull();
    expect(masteryOf([72])).toBe(72);
  });
  it('weights the newest result most (0.6^k)', () => {
    // newest 80 (w 1), 60 (w 0.6), oldest 40 (w 0.36): (80 + 36 + 14.4) / 1.96
    expect(masteryOf([40, 60, 80])).toBeCloseTo(66.53, 1);
    expect(masteryOf([80, 60, 40])).toBeLessThan(masteryOf([40, 60, 80]) as number);
  });
  it('equals the plain average when all results are equal', () => {
    expect(masteryOf([55, 55, 55, 55])).toBeCloseTo(55, 10);
  });
});

describe('bandOf', () => {
  it('uses red < 50, yellow 50-69, green ≥ 70', () => {
    expect(bandOf(49.9)).toBe('red');
    expect(bandOf(50)).toBe('yellow');
    expect(bandOf(69.9)).toBe('yellow');
    expect(bandOf(70)).toBe('green');
  });
  it('treats no data as unknown, never red', () => {
    expect(bandOf(null)).toBe('unknown');
  });
  it('respects custom thresholds', () => {
    expect(bandOf(55, { redBelow: 60, greenFrom: 80 })).toBe('red');
    expect(bandOf(80, { redBelow: 60, greenFrom: 80 })).toBe('green');
  });
});

describe('trendOf', () => {
  it('is flat with fewer than two results', () => {
    expect(trendOf([])).toBe('flat');
    expect(trendOf([40])).toBe('flat');
  });
  it('needs a change of more than 5 points', () => {
    expect(trendOf([50, 60])).toBe('up');
    expect(trendOf([60, 50])).toBe('down');
    expect(trendOf([50, 55])).toBe('flat'); // exactly 5 is still flat
    expect(trendOf([50, 54])).toBe('flat');
  });
  it('with 4+ results compares the newest two against the earlier history', () => {
    expect(trendOf([40, 40, 60, 60])).toBe('up');
    expect(trendOf([70, 70, 50, 50])).toBe('down');
  });
});

describe('goalProgress', () => {
  it('has no status without data', () => {
    expect(goalProgress(null, 80, 'up')).toEqual({ current: null, target: 80, gap: null, status: 'no_data' });
  });
  it('is on track when the goal is met, or close and improving', () => {
    expect(goalProgress(82, 80, 'flat').status).toBe('on_track');
    expect(goalProgress(70, 80, 'up').status).toBe('on_track');
  });
  it('needs work when far away, or close but not improving', () => {
    expect(goalProgress(55, 80, 'up').status).toBe('needs_work');
    expect(goalProgress(70, 80, 'flat').status).toBe('needs_work');
    expect(goalProgress(70, 80, 'flat').gap).toBe(10);
  });
});

describe('with the demo data', () => {
  const rafi = 's_01';

  it('collects a topic series oldest first, ignoring upcoming exams', () => {
    const series = topicSeries(seed, rafi, 'tp_quad', { today: REF });
    expect(series.length).toBe(4); // Quadratic Equations is in tests 2, 3, 4 and 5
    expect(series.map((p) => p.date)).toEqual([...series.map((p) => p.date)].sort());
    expect(series.every((p) => p.pct >= 0 && p.pct <= 100)).toBe(true);
  });

  it('shows Rafi red in Quadratic Equations and Trigonometry, green in Real Numbers', () => {
    const m = Object.fromEntries(studentTopicMastery(seed, rafi, { today: REF }).map((x) => [x.topicId, x]));
    expect(m['tp_quad'].band).toBe('red');
    expect(m['tp_trig'].band).toBe('red');
    expect(m['tp_real'].band).toBe('green');
  });

  it('covers all of a student\'s subjects (Math and English for Rafi), unknown where there are no marks', () => {
    const all = studentTopicMastery(seed, rafi, { today: REF });
    expect(new Set(all.map((m) => m.subjectId))).toEqual(new Set(['sub_math', 'sub_eng']));
    expect(all.length).toBe(11 + 6);
    const onlyMath = studentTopicMastery(seed, rafi, { today: REF, subjectIds: ['sub_math'] });
    expect(onlyMath).toHaveLength(11);
  });

  it('marks topics with no marks as unknown', () => {
    const noMarks = { ...seed, assessments: [] };
    expect(studentTopicMastery(noMarks, rafi).every((m) => m.band === 'unknown' && m.mastery === null)).toBe(true);
  });

  it('computes overall mastery over topics that have data', () => {
    const overall = overallMastery(studentTopicMastery(seed, rafi, { today: REF, subjectIds: ['sub_math'] })) as number;
    expect(overall).toBeGreaterThan(50);
    expect(overall).toBeLessThan(75);
  });

  it('has one total per assessment and a falling trend for Tanvir', () => {
    const totals = assessmentTotals(seed, 's_05', { today: REF, subjectId: 'sub_math' });
    expect(totals).toHaveLength(5);
    expect(overallTrend(seed, 's_05', { today: REF })).toBe('down');
    expect(overallTrend(seed, rafi, { today: REF, subjectId: 'sub_math' })).not.toBe('down');
  });
});
