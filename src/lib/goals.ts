// Goals: one per student per subject (brief §23).
import type { AppData, Goal, ID } from '@/types';
import { percentToGrade, type GradeBand, DEFAULT_GRADE_BANDS } from './grading';
import { removeById, upsert } from './ops';

export const goalId = (studentId: ID, subjectId: ID): ID => `g_${studentId}_${subjectId}`;

export const goalFor = (d: AppData, studentId: ID, subjectId: ID): Goal | undefined =>
  d.goals.find((g) => g.studentId === studentId && g.subjectId === subjectId);

/** Set or replace the goal for a subject. The grade label (A+, A…) is worked out from the target %. */
export function saveGoal(
  d: AppData,
  o: { studentId: ID; subjectId: ID; targetPercent: number; byDate?: string },
  bands: GradeBand[] = DEFAULT_GRADE_BANDS,
): AppData {
  const target = Math.min(100, Math.max(1, Math.round(o.targetPercent)));
  return upsert(d, 'goals', {
    id: goalId(o.studentId, o.subjectId),
    studentId: o.studentId,
    subjectId: o.subjectId,
    targetPercent: target,
    targetLabel: percentToGrade(target, bands).letter,
    byDate: o.byDate || undefined,
  });
}

export function removeGoal(d: AppData, studentId: ID, subjectId: ID): AppData {
  const g = goalFor(d, studentId, subjectId);
  return g ? removeById(d, 'goals', g.id) : d;
}

/** Study days and daily minutes live on the student. Minutes are kept between 5 and 180, in 5-minute steps. */
export function saveStudySettings(d: AppData, studentId: ID, o: { studyDays: number[]; dailyMinutes: number }): AppData {
  const minutes = Math.min(180, Math.max(5, Math.round(o.dailyMinutes / 5) * 5));
  return {
    ...d,
    students: d.students.map((s) => (s.id === studentId ? { ...s, studyDays: [...new Set(o.studyDays)].sort(), dailyMinutes: minutes } : s)),
  };
}
