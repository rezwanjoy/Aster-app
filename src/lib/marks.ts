// Marks helpers: exam summaries and keyboard/paste support for the marks grid (brief §10.1.4, §23).
import type { AppData, Assessment, ID, Student } from '@/types';
import { setScore } from './ops';
import { mean } from './scope';

/** Students who sit an exam: everyone in its batch, in the order they were added. */
export const examStudents = (d: AppData, a: Assessment): Student[] => d.students.filter((s) => s.batchIds.includes(a.batchId));

/** One student's overall percentage in an exam (over the parts they have marks for), or null. */
export function studentPct(a: Assessment, studentId: ID): number | null {
  let got = 0;
  let max = 0;
  for (const p of a.parts) {
    const v = a.scores[studentId]?.[p.topicId];
    if (typeof v === 'number' && p.maxMarks > 0) {
      got += v;
      max += p.maxMarks;
    }
  }
  return max > 0 ? (got / max) * 100 : null;
}

export const totalMax = (a: Assessment): number => a.parts.reduce((s, p) => s + p.maxMarks, 0);

export interface ExamSummary {
  students: number;
  /** students with at least one mark */
  scored: number;
  avgPct: number | null;
  highest: { studentId: ID; pct: number } | null;
  lowest: { studentId: ID; pct: number } | null;
  topicAverages: { topicId: ID; maxMarks: number; avgPct: number | null }[];
  /** the exam date is after today */
  upcoming: boolean;
}

export function examSummary(d: AppData, a: Assessment, today: string): ExamSummary {
  const students = examStudents(d, a);
  const pcts = students.flatMap((s) => {
    const pct = studentPct(a, s.id);
    return pct === null ? [] : [{ studentId: s.id, pct }];
  });
  const sorted = [...pcts].sort((x, y) => y.pct - x.pct);
  return {
    students: students.length,
    scored: pcts.length,
    avgPct: mean(pcts.map((p) => p.pct)),
    highest: sorted[0] ?? null,
    lowest: sorted.length ? sorted[sorted.length - 1] : null,
    topicAverages: a.parts.map((p) => ({
      topicId: p.topicId,
      maxMarks: p.maxMarks,
      avgPct: mean(
        students.flatMap((s) => {
          const v = a.scores[s.id]?.[p.topicId];
          return typeof v === 'number' && p.maxMarks > 0 ? [(v / p.maxMarks) * 100] : [];
        }),
      ),
    })),
    upcoming: a.date > today,
  };
}

/** How many marks are still empty (students × parts). */
export function missingMarks(d: AppData, a: Assessment): number {
  let missing = 0;
  for (const s of examStudents(d, a)) for (const p of a.parts) if (typeof a.scores[s.id]?.[p.topicId] !== 'number') missing += 1;
  return missing;
}

/* ───────── spreadsheet-style entry ───────── */

/** Split pasted spreadsheet text (tabs / newlines) into rows of cells. */
export function parsePaste(text: string): string[][] {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter((line, i, all) => line.length > 0 || i < all.length - 1)
    .map((line) => line.split('\t').map((c) => c.trim()));
}

/**
 * Paste a block of marks starting at one cell. Cells that are empty, not numbers or above the
 * maximum are skipped (the rest are still applied). Returns the new data and how many were applied.
 */
export function applyPaste(
  d: AppData,
  assessmentId: ID,
  studentIds: ID[],
  topicIds: ID[],
  start: { row: number; col: number },
  matrix: string[][],
): { data: AppData; applied: number; skipped: number } {
  let data = d;
  let applied = 0;
  let skipped = 0;
  matrix.forEach((cells, r) =>
    cells.forEach((cell, c) => {
      const studentId = studentIds[start.row + r];
      const topicId = topicIds[start.col + c];
      if (!studentId || !topicId) return;
      if (cell === '') return;
      const value = Number(cell);
      const next = Number.isFinite(value) ? setScore(data, assessmentId, studentId, topicId, value) : data;
      if (next === data) skipped += 1;
      else applied += 1;
      data = next;
    }),
  );
  return { data, applied, skipped };
}

/** Where focus goes from a grid cell for a key press (null = stay). */
export function nextCell(rows: number, cols: number, row: number, col: number, key: string, shift = false): { row: number; col: number } | null {
  if (key === 'ArrowDown' || (key === 'Enter' && !shift)) return row + 1 < rows ? { row: row + 1, col } : null;
  if (key === 'ArrowUp' || (key === 'Enter' && shift)) return row - 1 >= 0 ? { row: row - 1, col } : null;
  void cols;
  return null;
}
