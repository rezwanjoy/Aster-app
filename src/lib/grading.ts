// Grading: percentage ↔ GPA / letter with editable bands (brief §8.4).
import type { GradingScale } from '@/types';

export interface GradeBand {
  /** lowest percentage that earns this grade */
  min: number;
  letter: string;
  gpa: number;
}

/**
 * Bangladesh-style GPA 5.0 table.
 * [VERIFY] against the current board scale before real use (brief §8.4).
 */
export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { min: 80, letter: 'A+', gpa: 5.0 },
  { min: 70, letter: 'A', gpa: 4.0 },
  { min: 60, letter: 'A-', gpa: 3.5 },
  { min: 50, letter: 'B', gpa: 3.0 },
  { min: 40, letter: 'C', gpa: 2.0 },
  { min: 33, letter: 'D', gpa: 1.0 },
  { min: 0, letter: 'F', gpa: 0.0 },
];

const sorted = (bands: GradeBand[]) => [...bands].sort((a, b) => b.min - a.min);

/** The band a percentage falls in. Out-of-range input is clamped to 0-100. */
export function percentToGrade(pct: number, bands: GradeBand[] = DEFAULT_GRADE_BANDS): GradeBand {
  const p = Math.min(100, Math.max(0, pct));
  const list = sorted(bands);
  return list.find((b) => p >= b.min) ?? list[list.length - 1];
}

/** The lowest percentage that earns a letter (e.g. "A+" → 80), or null for an unknown letter. */
export function letterToPercent(letter: string, bands: GradeBand[] = DEFAULT_GRADE_BANDS): number | null {
  return bands.find((b) => b.letter.toLowerCase() === letter.trim().toLowerCase())?.min ?? null;
}

/** Display text for a percentage in the chosen scale. */
export function formatGrade(pct: number, scale: GradingScale, bands: GradeBand[] = DEFAULT_GRADE_BANDS): string {
  if (scale === 'percent') return `${Math.round(pct)}%`;
  const g = percentToGrade(pct, bands);
  return scale === 'gpa5' ? g.gpa.toFixed(2) : g.letter;
}

/** Bands must start at 0, have unique minimums, and GPA must not rise as the minimum falls. */
export function validateBands(bands: GradeBand[]): string[] {
  const errors: string[] = [];
  const list = sorted(bands);
  if (!list.length) return ['Add at least one grade'];
  if (list[list.length - 1].min !== 0) errors.push('The lowest grade must start at 0%');
  if (new Set(list.map((b) => b.min)).size !== list.length) errors.push('Two grades start at the same percentage');
  if (list.some((b) => b.min < 0 || b.min > 100)) errors.push('Percentages must be between 0 and 100');
  for (let i = 1; i < list.length; i++) if (list[i].gpa > list[i - 1].gpa) errors.push(`${list[i].letter} has a higher GPA than ${list[i - 1].letter}`);
  return errors;
}
