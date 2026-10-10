// Study streak, week dots and weekly minutes (brief §8.7, §23).
// A day counts when at least one planned task was completed that day.
// Days that are not study days never break the streak.
import type { ID, PlanTask, Student, StudyPlan } from '@/types';
import { addDays, diffDays, weekdayOf } from './dates';

const MAX_LOOKBACK = 400;

/** Days on which the student completed at least one task. */
export function completedDays(plans: StudyPlan[], studentId: ID): Set<string> {
  const days = new Set<string>();
  for (const p of plans) {
    if (p.studentId !== studentId) continue;
    for (const t of p.tasks) if (t.done) days.add(t.doneOn ?? t.date);
  }
  return days;
}

/** Streak ending today. Today doesn't break it until the day is over. */
export function currentStreak(done: Set<string>, studyDays: number[], today: string): number {
  let streak = 0;
  for (let i = 0; i < MAX_LOOKBACK; i++) {
    const day = addDays(today, -i);
    if (done.has(day)) streak += 1;
    else if (studyDays.includes(weekdayOf(day)) && day !== today) break;
    // a rest day, or today with nothing done yet: neither counts nor breaks
  }
  return streak;
}

/** Longest run of completed days anywhere in the history. */
export function longestStreak(done: Set<string>, studyDays: number[], today: string): number {
  if (!done.size) return 0;
  const first = [...done].sort()[0];
  let best = 0;
  let run = 0;
  for (let day = first; diffDays(day, today) <= 0; day = addDays(day, 1)) {
    if (done.has(day)) {
      run += 1;
      best = Math.max(best, run);
    } else if (studyDays.includes(weekdayOf(day)) && day !== today) {
      run = 0;
    }
  }
  return best;
}

export type DotStatus = 'done' | 'missed' | 'rest' | 'today' | 'upcoming';
export interface Dot {
  date: string;
  status: DotStatus;
}

/** The last seven days (today last) as dots. */
export function weekDots(done: Set<string>, studyDays: number[], today: string): Dot[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const isStudy = studyDays.includes(weekdayOf(date));
    let status: DotStatus;
    if (done.has(date)) status = 'done';
    else if (date === today) status = isStudy ? 'today' : 'rest';
    else status = isStudy ? 'missed' : 'rest';
    return { date, status };
  });
}

/** Start of the week containing `date` (Saturday by default, as the school week in Bangladesh starts). */
export function weekStartOf(date: string, startDay = 6): string {
  return addDays(date, -((weekdayOf(date) - startDay + 7) % 7));
}

export interface WeekMinutes {
  weekStart: string;
  planned: number;
  completed: number;
  /** completed / planned, 0-100 */
  pct: number;
}

export function weeklyMinutes(tasks: PlanTask[], today: string, startDay = 6): WeekMinutes {
  const weekStart = weekStartOf(today, startDay);
  const weekEnd = addDays(weekStart, 6);
  const inWeek = tasks.filter((t) => t.date >= weekStart && t.date <= weekEnd);
  const planned = inWeek.reduce((s, t) => s + t.minutes, 0);
  const completed = inWeek.filter((t) => t.done).reduce((s, t) => s + t.minutes, 0);
  return { weekStart, planned, completed, pct: planned ? Math.min(100, Math.round((completed / planned) * 100)) : 0 };
}

export const studentTasks = (plans: StudyPlan[], student: Pick<Student, 'id'>): PlanTask[] =>
  plans.filter((p) => p.studentId === student.id).flatMap((p) => p.tasks);
