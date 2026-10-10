// Student plan editing (brief §23): tick tasks off, add / edit / delete your own, regenerate the plan.
import type { AppData, ID, PlanTask, StudyPlan } from '@/types';
import { generatePlan } from './planner';
import { newId, upsert } from './ops';
import type { Bands } from './mastery';

const emptyPlan = (studentId: ID, today: string): StudyPlan => ({
  id: `plan_${studentId}`,
  studentId,
  createdAt: today,
  weekStart: today,
  tasks: [],
});

const planOf = (d: AppData, studentId: ID): StudyPlan | undefined => d.plans.find((p) => p.studentId === studentId);

/** Apply a change to a student's task list, creating the plan if they don't have one yet. */
function withTasks(d: AppData, studentId: ID, today: string, change: (tasks: PlanTask[]) => PlanTask[]): AppData {
  const plan = planOf(d, studentId) ?? emptyPlan(studentId, today);
  return upsert(d, 'plans', { ...plan, tasks: change(plan.tasks) });
}

/** Tick a task off (remembering the day it was done, which drives streaks) or undo it. */
export function setTaskDone(d: AppData, studentId: ID, taskId: ID, done: boolean, today: string): AppData {
  const plan = planOf(d, studentId);
  if (!plan?.tasks.some((t) => t.id === taskId)) return d;
  return withTasks(d, studentId, today, (tasks) =>
    tasks.map((t) => {
      if (t.id !== taskId) return t;
      const { doneOn: _drop, ...rest } = t;
      return done ? { ...rest, done: true, doneOn: today } : { ...rest, done: false };
    }),
  );
}

/** A task the student writes themselves. */
export function newOwnTask(o: { date: string; title: string; minutes: number; topicId?: ID }): PlanTask {
  return { id: newId('t'), date: o.date, kind: 'custom', title: o.title.trim(), minutes: o.minutes, done: false, topicId: o.topicId };
}

/** Add or replace a task (matched by id). Minutes are kept to at least 1. */
export function saveTask(d: AppData, studentId: ID, task: PlanTask, today: string): AppData {
  const clean: PlanTask = { ...task, minutes: Math.max(1, Math.round(task.minutes)), title: task.title?.trim() || undefined };
  return withTasks(d, studentId, today, (tasks) => {
    const exists = tasks.some((t) => t.id === clean.id);
    return (exists ? tasks.map((t) => (t.id === clean.id ? clean : t)) : [...tasks, clean]).sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    );
  });
}

export function deleteTask(d: AppData, studentId: ID, taskId: ID): AppData {
  const plan = planOf(d, studentId);
  if (!plan) return d;
  return upsert(d, 'plans', { ...plan, tasks: plan.tasks.filter((t) => t.id !== taskId) });
}

/** Rebuild the unfinished part of the plan from the latest marks and settings. */
export function regeneratePlan(d: AppData, studentId: ID, today: string, bands?: Bands): AppData {
  return upsert(d, 'plans', generatePlan({ data: d, studentId, today, bands }));
}

/** Tasks for one day, in planned order. */
export const tasksOn = (d: AppData, studentId: ID, date: string): PlanTask[] =>
  (planOf(d, studentId)?.tasks ?? []).filter((t) => t.date === date);

/** One class a student attends: a subject taught in one of their batches. */
export interface ClassOption {
  batchId: ID;
  subjectId: ID;
}

/** Every (batch, subject) pair for a student, in the order of their batches. */
export function studentClasses(d: AppData, studentId: ID): ClassOption[] {
  const student = d.students.find((s) => s.id === studentId);
  if (!student) return [];
  return student.batchIds.flatMap((batchId) => {
    const batch = d.batches.find((b) => b.id === batchId);
    return (batch?.subjectIds ?? []).map((subjectId) => ({ batchId, subjectId }));
  });
}

/**
 * Tasks to show when one class is chosen: those about that subject's topics, plus the student's
 * own tasks that have no topic (they belong to every view). No subject = everything.
 */
export function tasksForSubject(d: AppData, tasks: PlanTask[], subjectId?: ID): PlanTask[] {
  if (!subjectId) return tasks;
  const topics = new Set(d.topics.filter((t) => t.subjectId === subjectId).map((t) => t.id));
  return tasks.filter((t) => (t.topicId ? topics.has(t.topicId) : t.kind === 'custom'));
}
