import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { generatePlan, REVIEW_INTERVALS } from '../src/lib/planner';
import { addDays, weekdayOf } from '../src/lib/dates';
import { upsert } from '../src/lib/ops';
import type { AppData, PlanTask, StudyPlan } from '../src/types';

const REF = '2026-10-08'; // a Thursday
const seed = generateSeed(REF);
const RAFI = 's_01';

const planOf = (d: AppData, studentId = RAFI) => d.plans.find((p) => p.studentId === studentId)!;
const withPlan = (d: AppData, plan: StudyPlan) => upsert(d, 'plans', plan);
const generated = (p: StudyPlan) => p.tasks.filter((t) => t.id.includes('_g'));
const minutesOn = (tasks: PlanTask[], date: string) => tasks.filter((t) => t.date === date).reduce((s, t) => s + t.minutes, 0);

describe('generatePlan', () => {
  const plan = generatePlan({ data: seed, studentId: RAFI, today: REF });

  it('is deterministic', () => {
    expect(generatePlan({ data: seed, studentId: RAFI, today: REF })).toEqual(plan);
  });

  it('plans only on the student\'s study days, from today on', () => {
    const student = seed.students.find((s) => s.id === RAFI)!;
    for (const t of generated(plan)) {
      expect(t.date >= REF).toBe(true);
      expect(student.studyDays).toContain(weekdayOf(t.date));
    }
  });

  it('never plans more than the daily minutes, counting what is already done today', () => {
    for (let i = 0; i < 7; i++) {
      const date = addDays(REF, i);
      const doneToday = plan.tasks.filter((t) => t.date === date && t.done).reduce((s, t) => s + t.minutes, 0);
      expect(minutesOn(generated(plan), date) + doneToday).toBeLessThanOrEqual(15);
    }
  });

  it('puts the weakest topics first, with a reason', () => {
    const firstPrimary = generated(plan).find((t) => t.kind !== 'review')!;
    expect(['tp_quad', 'tp_trig']).toContain(firstPrimary.topicId);
    expect(firstPrimary.reason).toBe('red');
    expect(generated(plan).every((t) => t.reason)).toBe(true);
  });

  it('adds a yellow topic when there is room, and uses learn → practice', () => {
    const day = generated(plan).filter((t) => t.date === addDays(REF, 3)); // Sunday, nothing done yet
    expect(day.some((t) => t.reason === 'yellow')).toBe(true);
    expect(day.reduce((s, t) => s + t.minutes, 0)).toBeLessThanOrEqual(15);
    const kinds = new Set(generated(plan).map((t) => t.kind));
    expect(kinds.has('learn') || kinds.has('practice')).toBe(true);
  });

  it('keeps everything finished, written by the student, or in the past', () => {
    const before = planOf(seed).tasks.filter((t) => t.done || t.date < REF);
    for (const t of before) expect(plan.tasks).toContainEqual(t);
  });

  it('keeps the plan id and creation date when regenerating', () => {
    expect(plan.id).toBe(planOf(seed).id);
    expect(plan.createdAt).toBe(planOf(seed).createdAt);
  });

  it('creates a plan for a student who has none', () => {
    const fresh = generatePlan({ data: seed, studentId: 's_02', today: REF });
    expect(fresh.id).toBe('plan_s_02');
    expect(fresh.tasks.length).toBeGreaterThan(0);
  });

  it('throws for an unknown student', () => {
    expect(() => generatePlan({ data: seed, studentId: 'ghost', today: REF })).toThrow('Unknown student');
  });
});

describe('regenerating never duplicates finished work', () => {
  it('a finished generated task stays exactly once and the day is not over-planned', () => {
    const first = generatePlan({ data: seed, studentId: RAFI, today: REF });
    const target = generated(first).find((t) => t.date === addDays(REF, 3) && t.kind !== 'review')!;
    const marked: StudyPlan = { ...first, tasks: first.tasks.map((t) => (t.id === target.id ? { ...t, done: true, doneOn: t.date } : t)) };
    const again = generatePlan({ data: withPlan(seed, marked), studentId: RAFI, today: REF });

    expect(again.tasks.filter((t) => t.id === target.id)).toHaveLength(1);
    expect(again.tasks.find((t) => t.id === target.id)!.done).toBe(true);
    const keys = again.tasks.map((t) => `${t.date}|${t.topicId}|${t.kind}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(minutesOn(again.tasks.filter((t) => t.date === target.date), target.date)).toBeLessThanOrEqual(15);
    // the same topic is not planned again on a day it was already done
    expect(again.tasks.filter((t) => t.date === target.date && t.topicId === target.topicId)).toHaveLength(1);
  });

  it('running it twice gives the same result', () => {
    const once = generatePlan({ data: seed, studentId: RAFI, today: REF });
    const twice = generatePlan({ data: withPlan(seed, once), studentId: RAFI, today: REF });
    expect(twice.tasks).toEqual(once.tasks);
  });

  it('keeps tasks the student added themselves', () => {
    const base = planOf(seed);
    const custom: PlanTask = { id: 'custom_1', date: addDays(REF, 2), kind: 'custom', title: 'Read chapter 5', minutes: 20, done: false };
    const out = generatePlan({ data: withPlan(seed, { ...base, tasks: [...base.tasks, custom] }), studentId: RAFI, today: REF });
    expect(out.tasks).toContainEqual(custom);
  });
});

describe('spaced review', () => {
  // A student who did "Real Numbers" on Monday 5 Oct, free to study every day.
  const base = (() => {
    let d = upsert(seed, 'students', { ...seed.students[0], studyDays: [0, 1, 2, 3, 4, 5, 6] });
    d = withPlan(d, {
      id: 'plan_s_01', studentId: RAFI, createdAt: '2026-10-05', weekStart: '2026-10-05',
      tasks: [{ id: 'old', date: '2026-10-05', kind: 'learn', topicId: 'tp_real', minutes: 10, done: true, doneOn: '2026-10-05' }],
    });
    return d;
  })();

  it('uses 1, 3, 7 and 14 day gaps', () => {
    expect([...REVIEW_INTERVALS]).toEqual([1, 3, 7, 14]);
  });

  it('folds overdue reviews into today, then follows the +7 day review', () => {
    const plan = generatePlan({ data: base, studentId: RAFI, today: REF });
    const reviews = plan.tasks.filter((t) => t.kind === 'review' && t.topicId === 'tp_real').map((t) => t.date);
    // due 6 Oct and 8 Oct (overdue/today) → today; +7 = 12 Oct; +14 = 19 Oct is outside the 7-day window
    expect(reviews).toEqual(['2026-10-08', '2026-10-12']);
  });

  it('does not repeat a review that was already done after it was due', () => {
    const plan0 = planOf(base);
    const withDoneReview: StudyPlan = { ...plan0, tasks: [...plan0.tasks, { id: 'r1', date: '2026-10-08', kind: 'review', topicId: 'tp_real', minutes: 5, done: true, doneOn: '2026-10-08' }] };
    const plan = generatePlan({ data: withPlan(base, withDoneReview), studentId: RAFI, today: REF });
    const reviews = plan.tasks.filter((t) => t.kind === 'review' && t.topicId === 'tp_real' && !t.done).map((t) => t.date);
    expect(reviews).toEqual(['2026-10-12']); // the +1 and +3 reviews are covered by today's review
  });

  it('uses doneOn rather than the planned date as the anchor', () => {
    const p = planOf(base);
    const moved: StudyPlan = { ...p, tasks: [{ ...p.tasks[0], date: '2026-10-01', doneOn: '2026-10-07' }] };
    const plan = generatePlan({ data: withPlan(base, moved), studentId: RAFI, today: REF });
    expect(plan.tasks.some((t) => t.kind === 'review' && t.date === '2026-10-08')).toBe(true); // 7 Oct + 1
  });
});

describe('edge cases', () => {
  it('plans only reviews when every topic is already strong', () => {
    const plan = generatePlan({ data: seed, studentId: RAFI, today: REF, bands: { redBelow: 0, greenFrom: 1 } });
    expect(generated(plan).every((t) => t.kind === 'review')).toBe(true);
  });

  it('uses topics with no marks yet as "new" when there is spare time', () => {
    const d = upsert(seed, 'students', { ...seed.students[0], id: 's_new', name: 'New Student', batchIds: ['b_math10'], studyDays: [0, 1, 2, 3, 4, 5, 6] });
    const plan = generatePlan({ data: d, studentId: 's_new', today: REF });
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.tasks.every((t) => t.reason === 'new' && t.kind !== 'review')).toBe(true);
    expect(plan.tasks[0].kind).toBe('learn');
  });

  it('respects a smaller daily time', () => {
    const d = upsert(seed, 'students', { ...seed.students[0], dailyMinutes: 5 });
    const plan = generatePlan({ data: d, studentId: RAFI, today: REF });
    for (let i = 0; i < 7; i++) expect(minutesOn(generated(plan), addDays(REF, i))).toBeLessThanOrEqual(5);
  });

  it('plans nothing on days off', () => {
    const d = upsert(seed, 'students', { ...seed.students[0], studyDays: [] });
    expect(generated(generatePlan({ data: d, studentId: RAFI, today: REF }))).toHaveLength(0);
  });

  it('can be limited to one subject', () => {
    const plan = generatePlan({ data: seed, studentId: RAFI, today: REF, subjectId: 'sub_eng' });
    const topics = new Set(generated(plan).map((t) => t.topicId));
    expect([...topics].every((id) => (id as string).match(/tenses|articles|preps|voice|narr|para/))).toBe(true);
  });
});

describe('learn vs practice', () => {
  it('only plans "learn" for a topic the student has never done', () => {
    const plan = generatePlan({ data: seed, studentId: RAFI, today: REF });
    const done = new Set(seed.plans[0].tasks.filter((t) => t.done && t.kind !== 'review').map((t) => t.topicId));
    for (const t of generated(plan).filter((x) => x.kind === 'learn')) expect(done.has(t.topicId)).toBe(false);
  });
});
