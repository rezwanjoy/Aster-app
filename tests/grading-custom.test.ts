import { describe, expect, it } from 'vitest';
import { DEFAULT_GRADE_BANDS, bandProblems, formatGrade, percentToGrade, validateBands } from '../src/lib/grading';
import { DEFAULT_SETTINGS } from '../src/store/defaults';
import { migrateSettings } from '../src/store/migrations';

const own = [
  { min: 90, letter: 'Gold', gpa: 4 },
  { min: 60, letter: 'Silver', gpa: 3 },
  { min: 0, letter: 'Keep trying', gpa: 0 },
];

describe('custom grade table', () => {
  it('uses the teacher\'s own bands for letters and GPA', () => {
    expect(percentToGrade(95, own).letter).toBe('Gold');
    expect(percentToGrade(75, own).letter).toBe('Silver');
    expect(formatGrade(40, 'letter', own)).toBe('Keep trying');
    expect(formatGrade(61, 'gpa5', own)).toBe('3.00');
  });

  it('reports each problem as a code the screen can translate', () => {
    expect(bandProblems(own)).toEqual([]);
    expect(bandProblems([])).toEqual([{ code: 'none' }]);
    expect(bandProblems([{ min: 10, letter: 'A', gpa: 4 }])).toContainEqual({ code: 'noZero' });
    expect(bandProblems([{ min: 0, letter: ' ', gpa: 1 }])).toContainEqual({ code: 'blankLetter' });
    expect(bandProblems([{ min: 50, letter: 'A', gpa: 4 }, { min: 0, letter: 'a', gpa: 1 }])).toContainEqual({ code: 'sameLetter', letter: 'a' });
    expect(bandProblems([{ min: Number.NaN, letter: 'A', gpa: 4 }, { min: 0, letter: 'B', gpa: 1 }])).toContainEqual({ code: 'range' });
    expect(bandProblems([{ min: 50, letter: 'A', gpa: 1 }, { min: 0, letter: 'B', gpa: 3 }])).toContainEqual({ code: 'gpaOrder', lower: 'B', higher: 'A' });
    expect(bandProblems([{ min: 0, letter: 'A', gpa: 99 }])).toContainEqual({ code: 'gpaRange' });
  });

  it('keeps the plain-English messages the older check gave', () => {
    expect(validateBands(DEFAULT_GRADE_BANDS)).toEqual([]);
    expect(validateBands([{ min: 10, letter: 'A', gpa: 4 }])).toContain('The lowest grade must start at 0%');
  });

  it('settings v5 → v6 gives existing users the default table and keeps a saved one', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, gradeBands: undefined }, 5).gradeBands).toEqual(DEFAULT_GRADE_BANDS);
    expect(migrateSettings({ ...DEFAULT_SETTINGS, gradeBands: own }, 5).gradeBands).toEqual(own);
  });
});
