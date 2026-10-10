import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { checkIntegrity } from '../src/lib/ops';
import { deleteTask, newOwnTask, regeneratePlan, saveTask, setTaskDone, tasksOn } from '../src/lib/tasks';
import { goalFor, goalId, removeGoal, saveGoal, saveStudySettings } from '../src/lib/goals';
import { completedDays, currentStreak, longestStreak, weeklyMinutes, studentTasks } from '../src/lib/streak';
import { markMessagesRead } from '../src/lib/ops';

const REF = '2026-10-08';
const seed = generateSeed(REF);
const RAFI = 's_01';
const streakOf = (d: typeof seed, id = RAFI) => currentStreak(completedDays(d.plans, id), d.students.find((s) => s.id === id)!.studyDays, REF);

describe('ticking tasks', () => {
  it('records the day a task was done and updates the streak', () => {
    // Rafi starts with a 3-day streak. A new student ticking one task gets a 1-day streak.
    expect(streakOf(seed)).toBe(3);
    const fresh = saveTask(seed, 's_02', newOwnTask({ date: REF, title: 'Read chapter 4', minutes: 10 }), REF);
    const id = tasksOn(fresh, 's_02', REF)[0].id;
    expect(streakOf(fresh, 's_02')).toBe(0);
    const done = setTaskDone(fresh, 's_02', id, true, REF);
    const task = tasksOn(done, 's_02', REF)[0];
    expect(task).toMatchObject({ done: true, doneOn: REF });
    expect(streakOf(done, 's_02')).toBe(1);
  });
  it('undoing a task clears doneOn and the streak day', () => {
    const fresh = saveTask(seed, 's_02', newOwnTask({ date: REF, title: 'x', minutes: 5 }), REF);
    const id = tasksOn(fresh, 's_02', REF)[0].id;
    const undone = setTaskDone(setTaskDone(fresh, 's_02', id, true, REF), 's_02', id, false, REF);
    const t = tasksOn(undone, 's_02', REF)[0];
    expect(t.done).toBe(false);
    expect('doneOn' in t).toBe(false);
    expect(streakOf(undone, 's_02')).toBe(0);
  });
  it('ticking the open task today extends Rafi\'s weekly minutes', () => {
    const before = weeklyMinutes(studentTasks(seed.plans, { id: RAFI }), REF).completed;
    const open = tasksOn(seed, RAFI, REF).find((t) => !t.done)!;
    const after = setTaskDone(seed, RAFI, open.id, true, REF);
    expect(weeklyMinutes(studentTasks(after.plans, { id: RAFI }), REF).completed).toBe(before + open.minutes);
  });
  it('credits the day it was ticked, not the day it was planned', () => {
    const old = saveTask(seed, 's_02', { ...newOwnTask({ date: '2026-10-01', title: 'late', minutes: 5 }) }, REF);
    const id = old.plans.find((p) => p.studentId === 's_02')!.tasks[0].id;
    const done = setTaskDone(old, 's_02', id, true, REF);
    expect([...completedDays(done.plans, 's_02')]).toEqual([REF]);
  });
  it('ignores unknown tasks', () => {
    expect(setTaskDone(seed, RAFI, 'nope', true, REF)).toBe(seed);
    expect(setTaskDone(seed, 's_30', 'nope', true, REF)).toBe(seed);
  });
  it('keeps the longest streak after a miss', () => {
    const days = new Set(['2026-10-01', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-08']);
    expect(longestStreak(days, [0, 1, 2, 3, 4], REF)).toBe(4);
  });
});

describe('own tasks', () => {
  it('creates a plan and adds, edits and deletes tasks', () => {
    const t = newOwnTask({ date: REF, title: '  Read chapter 4  ', minutes: 20, topicId: 'tp_quad' });
    expect(t).toMatchObject({ kind: 'custom', title: 'Read chapter 4', done: false });
    const added = saveTask(seed, 's_03', t, REF);
    expect(added.plans.find((p) => p.studentId === 's_03')!.tasks).toHaveLength(1);
    expect(checkIntegrity(added)).toEqual([]);

    const edited = saveTask(added, 's_03', { ...t, title: 'Chapter 5', minutes: 25.4 }, REF);
    const tasks = edited.plans.find((p) => p.studentId === 's_03')!.tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ title: 'Chapter 5', minutes: 25 });

    expect(deleteTask(edited, 's_03', t.id).plans.find((p) => p.studentId === 's_03')!.tasks).toHaveLength(0);
    expect(deleteTask(seed, 's_30', 'x')).toBe(seed);
  });
  it('never allows zero minutes', () => {
    const added = saveTask(seed, 's_03', newOwnTask({ date: REF, title: 'quick', minutes: 0 }), REF);
    expect(added.plans.find((p) => p.studentId === 's_03')!.tasks[0].minutes).toBe(1);
  });
  it('keeps tasks in date order', () => {
    let d = saveTask(seed, 's_03', newOwnTask({ date: '2026-10-12', title: 'b', minutes: 5 }), REF);
    d = saveTask(d, 's_03', newOwnTask({ date: '2026-10-09', title: 'a', minutes: 5 }), REF);
    expect(d.plans.find((p) => p.studentId === 's_03')!.tasks.map((t) => t.date)).toEqual(['2026-10-09', '2026-10-12']);
  });
});

describe('regenerating the plan', () => {
  it('keeps what the student did and wrote, and rebuilds the rest', () => {
    const own = newOwnTask({ date: addDay(1), title: 'My own', minutes: 20 });
    const withOwn = saveTask(seed, RAFI, own, REF);
    const open = tasksOn(withOwn, RAFI, REF).find((t) => !t.done)!;
    const ticked = setTaskDone(withOwn, RAFI, open.id, true, REF);
    const after = regeneratePlan(ticked, RAFI, REF);
    const tasks = after.plans.find((p) => p.studentId === RAFI)!.tasks;
    expect(tasks).toContainEqual(own);
    expect(tasks.find((t) => t.id === open.id)).toMatchObject({ done: true });
    const keys = tasks.map((t) => `${t.date}|${t.topicId}|${t.kind}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(checkIntegrity(after)).toEqual([]);
  });
  it('picks up a changed daily time', () => {
    const changed = saveStudySettings(seed, RAFI, { studyDays: [0, 1, 2, 3, 4], dailyMinutes: 30 });
    const tasks = regeneratePlan(changed, RAFI, REF).plans.find((p) => p.studentId === RAFI)!.tasks.filter((t) => t.id.includes('_g'));
    const perDay = new Map<string, number>();
    for (const t of tasks) perDay.set(t.date, (perDay.get(t.date) ?? 0) + t.minutes);
    expect(Math.max(...perDay.values())).toBeGreaterThan(15);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(30);
  });
  it('picks up changed study days', () => {
    const changed = saveStudySettings(seed, RAFI, { studyDays: [6], dailyMinutes: 15 }); // Saturday only
    const tasks = regeneratePlan(changed, RAFI, REF).plans.find((p) => p.studentId === RAFI)!.tasks.filter((t) => t.id.includes('_g'));
    expect(tasks.every((t) => t.date === '2026-10-10')).toBe(true);
  });
});

function addDay(n: number) {
  return new Date(Date.UTC(2026, 9, 8 + n)).toISOString().slice(0, 10);
}

describe('goals', () => {
  it('finds, saves and replaces a goal per subject', () => {
    expect(goalFor(seed, RAFI, 'sub_math')).toMatchObject({ targetPercent: 80, targetLabel: 'A+' });
    const raised = saveGoal(seed, { studentId: RAFI, subjectId: 'sub_math', targetPercent: 70, byDate: '2026-12-31' });
    expect(goalFor(raised, RAFI, 'sub_math')).toMatchObject({ id: goalId(RAFI, 'sub_math'), targetPercent: 70, targetLabel: 'A' });
    expect(raised.goals.filter((g) => g.studentId === RAFI && g.subjectId === 'sub_math')).toHaveLength(1);
    expect(checkIntegrity(raised)).toEqual([]);
  });
  it('adds a goal for a subject that had none, and clamps the target', () => {
    const added = saveGoal(seed, { studentId: 's_02', subjectId: 'sub_eng', targetPercent: 150 });
    expect(goalFor(added, 's_02', 'sub_eng')).toMatchObject({ targetPercent: 100, targetLabel: 'A+' });
    expect(goalFor(saveGoal(seed, { studentId: 's_02', subjectId: 'sub_eng', targetPercent: -3 }), 's_02', 'sub_eng')?.targetPercent).toBe(1);
  });
  it('removes a goal', () => {
    expect(goalFor(removeGoal(seed, RAFI, 'sub_eng'), RAFI, 'sub_eng')).toBeUndefined();
    expect(removeGoal(seed, 's_02', 'sub_phy')).toBe(seed);
  });
  it('keeps study days unique and sorted, and minutes in 5-minute steps within limits', () => {
    const s = saveStudySettings(seed, RAFI, { studyDays: [4, 0, 4, 2], dailyMinutes: 17 });
    const rafi = s.students.find((x) => x.id === RAFI)!;
    expect(rafi.studyDays).toEqual([0, 2, 4]);
    expect(rafi.dailyMinutes).toBe(15);
    expect(saveStudySettings(seed, RAFI, { studyDays: [], dailyMinutes: 1 }).students.find((x) => x.id === RAFI)!.dailyMinutes).toBe(5);
    expect(saveStudySettings(seed, RAFI, { studyDays: [], dailyMinutes: 999 }).students.find((x) => x.id === RAFI)!.dailyMinutes).toBe(180);
  });
});

describe('inbox', () => {
  it('marks only that student\'s messages as read', () => {
    const read = markMessagesRead(seed, RAFI, new Date('2026-10-08T12:00:00Z'));
    expect(read.messages.find((m) => m.studentId === RAFI)!.readAt).toBeTruthy();
    expect(markMessagesRead(seed, 's_02')).toEqual(seed);
  });
});

import { studentClasses, tasksForSubject } from '../src/lib/tasks';

describe('classes and plan filtering', () => {
  it('lists a student\'s classes as batch + subject pairs', () => {
    expect(studentClasses(seed, RAFI)).toEqual([
      { batchId: 'b_math10', subjectId: 'sub_math' },
      { batchId: 'b_eng10', subjectId: 'sub_eng' },
    ]);
    expect(studentClasses(seed, 's_13')).toEqual([{ batchId: 'b_phy9', subjectId: 'sub_phy' }]);
    expect(studentClasses(seed, 'ghost')).toEqual([]);
  });
  it('shows only that subject\'s tasks, plus own tasks without a topic', () => {
    const own = newOwnTask({ date: REF, title: 'My own', minutes: 10 });
    const d = saveTask(seed, RAFI, own, REF);
    const tasks = d.plans.find((p) => p.studentId === RAFI)!.tasks;
    const math = tasksForSubject(d, tasks, 'sub_math');
    expect(math.length).toBeGreaterThan(0);
    expect(math.every((t) => t.id === own.id || ['tp_quad', 'tp_trig', 'tp_circ', 'tp_real', 'tp_exp'].includes(t.topicId as string))).toBe(true);
    expect(math).toContainEqual(own);
    expect(tasksForSubject(d, tasks, 'sub_eng')).toContainEqual(own);
    expect(tasksForSubject(d, tasks, 'sub_eng').some((t) => t.topicId === 'tp_quad')).toBe(false);
  });
  it('returns everything when no subject is chosen', () => {
    const tasks = seed.plans.find((p) => p.studentId === RAFI)!.tasks;
    expect(tasksForSubject(seed, tasks)).toBe(tasks);
  });
});
