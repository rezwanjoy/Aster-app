import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import bn from '../src/i18n/bn.json';
import { translate } from '../src/i18n';
import { formatNumber, toBanglaDigits } from '../src/i18n/format';

const flatten = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? flatten(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`],
  );

describe('i18n dictionaries', () => {
  it('English and Bangla have exactly the same keys', () => {
    expect(flatten(bn).sort()).toEqual(flatten(en).sort());
  });

  it('keeps the same {placeholders} in both languages', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    const get = (o: Record<string, unknown>, key: string) => key.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)[k], o) as string;
    for (const key of flatten(en)) expect(vars(get(bn, key)), key).toEqual(vars(get(en, key)));
  });

  it('interpolates variables', () => {
    expect(translate('en', 'teacher.insights.headline', { pct: 60, topic: 'Quadratic Equations' })).toBe('60% of this batch is weak in Quadratic Equations. Reteach this.');
    expect(translate('bn', 'teacher.insights.headline', { pct: '৬০', topic: 'দ্বিঘাত সমীকরণ' })).toContain('দ্বিঘাত সমীকরণ');
  });
});

describe('number formatting', () => {
  it('converts digits to Bangla', () => {
    expect(toBanglaDigits('2026-12')).toBe('২০২৬-১২');
  });
  it('uses Bangla digits only for lang=bn with the option on', () => {
    expect(formatNumber(1234, 'en', true)).toBe('1,234');
    expect(formatNumber(1234, 'bn', false)).toMatch(/^[\d,]+$/);
    expect(formatNumber(1234, 'bn', true)).toMatch(/^[০-৯,]+$/);
  });
});
