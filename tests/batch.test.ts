import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { batchTopicStats, nextClass, reteachTopics, scopeSummary, studentsNeedingAttention } from '../src/lib/batch';
import { attendanceRate, rangeStart, weeklyAttendance, weeksIn } from '../src/lib/attendance';
import { scopeBatchIds } from '../src/lib/scope';
import { teacherInsight, studentInsight } from '../src/lib/insights';
import { calendarItems } from '../src/lib/calendar';

const REF = '2026-10-08';
const ctx = { today: REF };
const seed = generateSeed(REF);

describe('scope', () => {
  it('all = every batch; unknown batch = nothing', () => {
    expect(scopeBatchIds(seed, 'all')).toEqual(['b_math10', 'b_phy9', 'b_eng10']);
    expect(scopeBatchIds(seed, 'b_phy9')).toEqual(['b_phy9']);
    expect(scopeBatchIds(seed, 'ghost')).toEqual([]);
  });
});

describe('batchTopicStats (weak topics)', () => {
  const stats = batchTopicStats(seed, ['b_math10'], ctx);

  it('ranks Quadratic Equations first with 7 of 12 students in the red', () => {
    expect(stats[0].topicId).toBe('tp_quad');
    expect(stats[0].withData).toBe(12);
    expect(stats[0].redCount).toBe(7);
    expect(stats[0].redPct).toBe(58);
  });
  it('is sorted by % red, then by lower average mastery', () => {
    const ranked = stats.filter((s) => s.withData > 0);
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i - 1], b = ranked[i];
      expect(a.redPct > b.redPct || (a.redPct === b.redPct && (a.avgMastery as number) <= (b.avgMastery as number))).toBe(true);
    }
  });
  it('only lists topics of the batch\'s subject', () => {
    expect(stats).toHaveLength(11);
    expect(stats.every((s) => s.subjectId === 'sub_math')).toBe(true);
  });
  it('suggests a reteach at 40% or more', () => {
    const re = reteachTopics(stats);
    expect(re.map((s) => s.topicId)).toContain('tp_quad');
    expect(re.every((s) => s.redPct >= 40)).toBe(true);
  });
  it('does not suggest a reteach on a handful of students', () => {
    const tiny = reteachTopics([{ topicId: 't', subjectId: 's', withData: 2, redCount: 2, redPct: 100, avgMastery: 20, trend: 'flat' }]);
    expect(tiny).toEqual([]);
  });
  it('covers every batch when the scope is all', () => {
    expect(batchTopicStats(seed, scopeBatchIds(seed, 'all'), ctx)).toHaveLength(11 + 6 + 6);
  });
  it('puts topics without marks last', () => {
    const none = batchTopicStats({ ...seed, assessments: [] }, ['b_math10'], ctx);
    expect(none.every((s) => s.withData === 0 && s.redPct === 0 && s.avgMastery === null)).toBe(true);
  });
});

describe('studentsNeedingAttention', () => {
  const items = studentsNeedingAttention(seed, ['b_math10'], ctx);

  it('flags Tanvir first, for falling marks and low attendance', () => {
    expect(items[0].studentId).toBe('s_05');
    expect(items[0].reasons).toEqual(expect.arrayContaining(['trendDown', 'lowAttendance']));
  });
  it('does not flag Rafi (two red topics, rising marks, good attendance)', () => {
    expect(items.some((i) => i.studentId === 's_01')).toBe(false);
  });
  it('keeps late fees separate from academic reasons', () => {
    const tanvir = items.find((i) => i.studentId === 's_05')!;
    expect(tanvir.feeLate).toBe(true);
    expect(tanvir.reasons.every((r) => ['trendDown', 'lowAttendance', 'manyRed'].includes(r))).toBe(true);
  });
  it('only returns students with at least one academic reason', () => {
    expect(items.every((i) => i.reasons.length > 0)).toBe(true);
  });
});

describe('attendance', () => {
  it('computes a student\'s rate over a range', () => {
    const r = attendanceRate(seed, { batchIds: ['b_math10'], studentId: 's_05', from: rangeStart('8w', REF), to: REF });
    expect(r.total).toBeGreaterThan(0);
    expect(r.pct).toBeLessThan(75);
  });
  it('buckets by week and matches the overall rate', () => {
    const weeks = weeklyAttendance(seed, ['b_math10'], REF, 4);
    expect(weeks).toHaveLength(4);
    expect(weeks[3].weekEnd).toBe(REF);
    const total = weeks.reduce((s, w) => s + w.total, 0);
    expect(total).toBe(attendanceRate(seed, { batchIds: ['b_math10'], from: rangeStart('4w', REF), to: REF }).total);
  });
  it('has 4, 8 or term-length ranges', () => {
    const term = seed.terms[0];
    expect(rangeStart('4w', REF)).toBe('2026-09-11');
    expect(weeksIn('4w', REF)).toBe(4);
    expect(weeksIn('8w', REF)).toBe(8);
    expect(rangeStart('term', REF, term)).toBe(term.startDate);
    expect(weeksIn('term', REF, term)).toBe(9); // 57 days since the term started
  });
  it('is null when there were no classes', () => {
    expect(attendanceRate(seed, { batchIds: [], from: '2026-01-01', to: REF }).pct).toBeNull();
  });
});

describe('scopeSummary', () => {
  it('summarises all batches', () => {
    const s = scopeSummary(seed, scopeBatchIds(seed, 'all'), ctx);
    expect(s.batches).toBe(3);
    expect(s.students).toBe(27);
    expect(s.attendancePct).toBeGreaterThan(60);
    expect(s.avgMastery).toBeGreaterThan(40);
    expect(s.feesCollectedThisMonth).toBeLessThanOrEqual(s.feesDueThisMonth);
    expect(s.feesOwed).toBeGreaterThan(0);
  });
  it('narrows to one batch', () => {
    expect(scopeSummary(seed, ['b_phy9'], ctx).students).toBe(10);
  });
});

describe('nextClass', () => {
  it('counts today, otherwise finds the next class day', () => {
    expect(nextClass(seed, 'b_math10', REF)).toEqual({ date: '2026-10-08', time: '18:00' }); // Thursday
    expect(nextClass(seed, 'b_phy9', REF)).toEqual({ date: '2026-10-12', time: '17:00' }); // Monday
    expect(nextClass(seed, 'b_eng10', REF)).toEqual({ date: '2026-10-10', time: '16:30' }); // Saturday
  });
  it('skips holidays', () => {
    const withHoliday = { ...seed, events: [{ id: 'h', date: '2026-10-10', title: 'Holiday', kind: 'holiday' as const }] };
    expect(nextClass(withHoliday, 'b_eng10', REF)?.date).toBe('2026-10-14'); // Wednesday
  });
});

describe('rule-based insights', () => {
  it('teacher headline: reteach Quadratic Equations', () => {
    const insight = teacherInsight(seed, ['b_math10'], ctx);
    expect(insight.headline).toMatchObject({ type: 'reteach', topicId: 'tp_quad', redPct: 58 });
    expect(insight.findings.some((f) => f.type === 'attention' && f.studentId === 's_05')).toBe(true);
  });
  it('has nothing to say for a healthy batch with no data', () => {
    const quiet = teacherInsight({ ...seed, assessments: [], sessions: [] }, ['b_math10'], ctx);
    expect(quiet.headline).toBeNull();
  });
  it('flags low understanding when the last three classes were rated under 3', () => {
    const sessions = seed.sessions.map((s) => (s.batchId === 'b_phy9' ? { ...s, understanding: 2 as const } : s));
    const insight = teacherInsight({ ...seed, sessions }, ['b_phy9'], ctx);
    expect(insight.findings.some((f) => f.type === 'understanding')).toBe(true);
  });
  it('student insight: weak spots, strengths and next steps for Rafi', () => {
    const si = studentInsight(seed, 's_01', ctx, { subjectId: 'sub_math' });
    expect(si.weakSpots.map((m) => m.topicId)).toEqual(expect.arrayContaining(['tp_quad', 'tp_trig']));
    expect(si.strengths.map((m) => m.topicId)).toContain('tp_real');
    expect(si.nextSteps[0].type).toBe('practice');
    expect(si.goals).toHaveLength(1);
    expect(si.goals[0].target).toBe(80);
    expect(si.goals[0].gap).toBeGreaterThan(0);
  });
  it('student insight covers both goals when no subject is chosen', () => {
    expect(studentInsight(seed, 's_01', ctx).goals).toHaveLength(2);
  });
});

describe('calendar', () => {
  const all = scopeBatchIds(seed, 'all');
  const items = calendarItems(seed, '2026-10', all);

  it('shows exams (past and upcoming), the holiday and fee due dates', () => {
    expect(items.filter((i) => i.kind === 'exam').map((i) => i.title)).toContain('Model Test');
    expect(items.find((i) => i.title === 'Model Test')?.date).toBe('2026-10-20');
    expect(items.filter((i) => i.kind === 'holiday')).toHaveLength(1);
    expect(items.filter((i) => i.kind === 'fee')).toHaveLength(3);
    expect(items.find((i) => i.kind === 'fee')?.date).toBe('2026-10-10');
  });
  it('lists class days and skips the holiday', () => {
    expect(items.filter((i) => i.kind === 'class' && i.batchId === 'b_math10')).toHaveLength(13);
    const english = items.filter((i) => i.kind === 'class' && i.batchId === 'b_eng10');
    expect(english).toHaveLength(8); // the Saturday 17 Oct class is on the holiday
    expect(english.some((i) => i.date === '2026-10-17')).toBe(false);
  });
  it('filters by batch and is sorted by date', () => {
    const math = calendarItems(seed, '2026-10', ['b_math10']);
    expect(math.some((i) => i.batchId === 'b_phy9')).toBe(false);
    expect(math.map((i) => i.date)).toEqual([...math.map((i) => i.date)].sort());
  });
});
