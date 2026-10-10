// "Scope" = which batches a screen is looking at (the global batch switcher, brief §23).
import type { AppData, ID, Student } from '@/types';

export type BatchFilter = ID | 'all';

/** Batch ids for a filter. An unknown batch id gives an empty scope. */
export function scopeBatchIds(d: AppData, filter: BatchFilter): ID[] {
  if (filter === 'all') return d.batches.map((b) => b.id);
  return d.batches.some((b) => b.id === filter) ? [filter] : [];
}

/** Students who belong to at least one of the batches (each student once). */
export const studentsInBatches = (d: AppData, batchIds: ID[]): Student[] =>
  d.students.filter((s) => s.batchIds.some((b) => batchIds.includes(b)));

/** Subjects taught in the given batches. */
export function subjectIdsOf(d: AppData, batchIds: ID[]): ID[] {
  const out: ID[] = [];
  for (const b of d.batches) if (batchIds.includes(b.id)) for (const s of b.subjectIds) if (!out.includes(s)) out.push(s);
  return out;
}

/** Subjects a student studies, through their batches (optionally limited to some batches). */
export function studentSubjectIds(d: AppData, studentId: ID, batchIds?: ID[]): ID[] {
  const student = d.students.find((s) => s.id === studentId);
  if (!student) return [];
  return subjectIdsOf(d, batchIds ? student.batchIds.filter((b) => batchIds.includes(b)) : student.batchIds);
}

export const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
