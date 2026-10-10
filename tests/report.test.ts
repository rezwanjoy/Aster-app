import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { buildReport, reportToText, type ReportOptions } from '../src/lib/report';
import { clearInterest, interestToCsv, interestToJson, recordInterest, summarizeInterest } from '../src/lib/interest';
import { unknownPlaceholders } from '../src/lib/fees';
import { checkIntegrity } from '../src/lib/ops';

const REF = '2026-10-08';
const seed = generateSeed(REF);
const opts: ReportOptions = { month: '2026-10', today: REF, includeMarks: true, includeFees: true, teacherNote: 'Keep it up!' };

describe('buildReport', () => {
  const r = buildReport(seed, 's_01', opts);

  it('covers each subject Rafi studies, with strengths and weak spots', () => {
    expect(r.subjects.map((s) => s.subjectId)).toEqual(['sub_math', 'sub_eng']);
    const math = r.subjects[0];
    expect(math.weak).toEqual(expect.arrayContaining(['tp_quad', 'tp_trig']));
    expect(math.strengths).toContain('tp_real');
    expect(math.mastery).toBeGreaterThan(50);
  });
  it('lists only exams from the chosen month', () => {
    expect(r.subjects[0].exams.map((e) => e.assessmentId)).toEqual(['a_math_5']); // 5 Oct
    expect(buildReport(seed, 's_01', { ...opts, month: '2026-09' }).subjects[0].exams.length).toBeGreaterThan(1);
  });
  it('has attendance for the month and fees per batch', () => {
    expect(r.attendance.total).toBeGreaterThan(0);
    expect(r.attendance.pct).toBeGreaterThan(50);
    expect(r.fees).toHaveLength(2);
    expect(r.fees.map((f) => f.status)).toEqual(['due', 'due']);
  });
  it('offers one suggestion, practising the weakest topic first', () => {
    expect(r.suggestion?.type).toBe('practice');
  });
  it('throws for an unknown student', () => {
    expect(() => buildReport(seed, 'ghost', opts)).toThrow('Unknown student');
  });
});

describe('reportToText', () => {
  const r = buildReport(seed, 's_01', opts);

  it('writes an English report with every section', () => {
    const text = reportToText(seed, r, 'en', true);
    expect(text).toContain('Aster Demo Academy');
    expect(text).toContain('Rafi Ahmed (Class 10)');
    expect(text).toContain('October 2026');
    expect(text).toContain('Mathematics:');
    expect(text).toContain('Quadratic Equations');
    expect(text).toContain('ATTENDANCE');
    expect(text).toContain('Class 10 Mathematics: ৳0 of ৳1,500 paid (Due)');
    expect(text).toContain('Keep it up!');
    expect(text.trim().endsWith('— Himel Bhai')).toBe(true);
    expect(text).not.toMatch(/undefined|NaN|\{[a-z]+\}/);
  });
  it('writes a Bangla report with Bangla names, topics and digits', () => {
    const text = reportToText(seed, r, 'bn', true);
    expect(text).toContain('অ্যাস্টার ডেমো অ্যাকাডেমি');
    expect(text).toContain('দ্বিঘাত সমীকরণ');
    expect(text).toContain('অক্টোবর');
    expect(text).toMatch(/[০-৯]{2}%/);
    expect(text).toContain('— হিমেল ভাই');
    expect(text).not.toMatch(/undefined|NaN|\{[a-z]+\}/);
  });
  it('keeps Latin digits in Bangla when the numerals option is off', () => {
    expect(reportToText(seed, r, 'bn', false)).toMatch(/\d{2}%/);
  });
  it('can leave out fees and marks, and an empty teacher note', () => {
    const text = reportToText(seed, buildReport(seed, 's_01', { ...opts, includeFees: false, includeMarks: false, teacherNote: '  ' }), 'en', true);
    expect(text).not.toContain('FEES');
    expect(text).not.toContain('Mathematics:');
    expect(text).not.toContain('NOTE FROM');
    expect(text).toContain('ATTENDANCE');
  });
  it('never includes a phone number or another student\'s name', () => {
    const text = reportToText(seed, r, 'en', true);
    expect(text).not.toMatch(/01000-\d+/);
    expect(text).not.toContain('Nusrat');
  });
});

describe('reminder wording', () => {
  it('finds placeholders that do not exist', () => {
    expect(unknownPlaceholders('Hi {student}, {amount} for {month} at {center}')).toEqual([]);
    expect(unknownPlaceholders('Hi {studnet} and {amount} {foo}')).toEqual(['studnet', 'foo']);
  });
});

describe('interest tracking', () => {
  const at = new Date('2026-10-08T10:00:00Z');
  let d = recordInterest(seed, { feature: 'recorder', type: 'view' }, at);
  d = recordInterest(d, { feature: 'recorder', type: 'tap_unlock' }, at);
  d = recordInterest(d, { feature: 'recorder', type: 'would_pay', priceChoice: 'pro:600' }, at);
  d = recordInterest(d, { feature: 'recorder', type: 'would_pay', priceChoice: 'pro:600' }, at);
  d = recordInterest(d, { feature: 'pdf', type: 'view' }, at);
  d = recordInterest(d, { feature: 'pdf', type: 'would_pay', priceChoice: 'none' }, at);

  it('records events with a time and keeps the data valid', () => {
    expect(d.interest).toHaveLength(6);
    expect(d.interest[0].at).toBe('2026-10-08T10:00:00.000Z');
    expect(checkIntegrity(d)).toEqual([]);
    expect(seed.interest).toHaveLength(0);
  });
  it('summarises per feature, most wanted first', () => {
    const s = summarizeInterest(d.interest);
    expect(s[0]).toEqual({ feature: 'recorder', views: 1, notify: 1, wouldPay: 2, prices: { 'pro:600': 2 } });
    expect(s[1]).toMatchObject({ feature: 'pdf', views: 1, wouldPay: 1, prices: { none: 1 } });
  });
  it('exports CSV with quoting, and JSON with a summary', () => {
    const csv = interestToCsv([...d.interest, { feature: 'a,b', type: 'view', at: 'x' }]);
    expect(csv.split('\n')[0]).toBe('feature,type,at,priceChoice');
    expect(csv).toContain('recorder,would_pay,2026-10-08T10:00:00.000Z,pro:600');
    expect(csv).toContain('"a,b",view,x,');
    const json = JSON.parse(interestToJson(d.interest, at));
    expect(json).toMatchObject({ app: 'aster', kind: 'interest', exportedAt: '2026-10-08T10:00:00.000Z' });
    expect(json.summary).toHaveLength(2);
  });
  it('clears all events', () => {
    expect(clearInterest(d).interest).toEqual([]);
  });
});
