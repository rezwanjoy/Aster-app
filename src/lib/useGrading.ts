import { useCallback } from 'react';
import { useI18n } from '@/i18n';
import { formatGrade } from '@/lib/grading';
import { useSettings } from '@/store/settings';

/** The teacher's grade table and display choice, plus a helper that words a percentage the way they chose. */
export function useGrading() {
  const { n } = useI18n();
  const scale = useSettings((s) => s.gradingScale);
  const bands = useSettings((s) => s.gradeBands);
  const show = useCallback((pct: number) => (scale === 'percent' ? `${n(Math.round(pct))}%` : formatGrade(pct, scale, bands)), [scale, bands, n]);
  return { scale, bands, show };
}
