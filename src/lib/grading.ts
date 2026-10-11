// Grading: percentage ↔ GPA / letter with editable bands (brief §8.4).
import type { GradeBand, GradingScale } from '@/types';

export type { GradeBand };

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

/** Highest grade first. */
export const sorted = (bands: GradeBand[]) => [...bands].sort((a, b) => b.min - a.min);

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

export type BandProblem =
  | { code: 'none' }
  | { code: 'noZero' }
  | { code: 'sameMin' }
  | { code: 'range' }
  | { code: 'blankLetter' }
  | { code: 'sameLetter'; letter: string }
  | { code: 'gpaRange' }
  | { code: 'gpaOrder'; lower: string; higher: string };

/** Everything wrong with a grade table, as codes the screen can word in either language. */
export function bandProblems(bands: GradeBand[]): BandProblem[] {
  const list = sorted(bands);
  if (!list.length) return [{ code: 'none' }];
  const out: BandProblem[] = [];
  if (list[list.length - 1].min !== 0) out.push({ code: 'noZero' });
  if (new Set(list.map((b) => b.min)).size !== list.length) out.push({ code: 'sameMin' });
  if (list.some((b) => !Number.isFinite(b.min) || b.min < 0 || b.min > 100)) out.push({ code: 'range' });
  if (list.some((b) => !b.letter.trim())) out.push({ code: 'blankLetter' });
  const seen = new Set<string>();
  for (const b of list) {
    const k = b.letter.trim().toLowerCase();
    if (k && seen.has(k)) out.push({ code: 'sameLetter', letter: b.letter.trim() });
    seen.add(k);
  }
  if (list.some((b) => !Number.isFinite(b.gpa) || b.gpa < 0 || b.gpa > 10)) out.push({ code: 'gpaRange' });
  for (let i = 1; i < list.length; i++) if (list[i].gpa > list[i - 1].gpa) out.push({ code: 'gpaOrder', lower: list[i].letter, higher: list[i - 1].letter });
  return out;
}

/** Plain-English version of {@link bandProblems} (used by tests and logs; screens use the codes). */
export function validateBands(bands: GradeBand[]): string[] {
  return bandProblems(bands).map((p) => {
    switch (p.code) {
      case 'none': return 'Add at least one grade';
      case 'noZero': return 'The lowest grade must start at 0%';
      case 'sameMin': return 'Two grades start at the same percentage';
      case 'range': return 'Percentages must be between 0 and 100';
      case 'blankLetter': return 'Every grade needs a name';
      case 'sameLetter': return `Two grades are both called ${p.letter}`;
      case 'gpaRange': return 'GPA must be between 0 and 10';
      case 'gpaOrder': return `${p.lower} has a higher GPA than ${p.higher}`;
    }
  });
}
