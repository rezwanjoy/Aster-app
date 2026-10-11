import { describe, expect, it } from 'vitest';
import { basicBatch, basicStudent } from '../src/features/ai/basic';
import { buildBatchInput, buildStudentInput } from '../src/lib/ai/anonymize';
import { findPersonalData } from '../src/lib/ai/privacy';
import { parseBatchResult, parseStudentResult, topicNameOf } from '../src/lib/ai/schemas';
import { generateSeed } from '../src/data/seed';
import { translate } from '../src/i18n';

const today = '2026-10-08';
const data = generateSeed(today);
const say = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate('en', key, vars);
const n = (v: number) => String(v);

describe('calculated insight (shown when AI cannot or should not run)', () => {
  const batchIds = data.batches.map((b) => b.id);
  const input = buildBatchInput(data, batchIds, { today });
  const name = (c: string) => topicNameOf(input.topicRefs, c) ?? c;

  it('has the same shape as an AI class insight and passes the same checks', () => {
    const r = basicBatch(input.payload, say, n, name);
    expect(parseBatchResult(r, input.payload)).toEqual(r); // nothing invented, nothing trimmed away
    expect(r.summary.length).toBeGreaterThan(20);
    expect(r.reteachTopics.length).toBeGreaterThan(0);
    expect(r.suggestedActions.length).toBeGreaterThan(0);
  });

  it('only refers to letters and topic codes that exist, and carries no personal data', () => {
    const r = basicBatch(input.payload, say, n, name);
    const letters = new Set(input.payload.attention.map((a) => a.id));
    expect(r.students.every((s) => letters.has(s.id))).toBe(true);
    expect(findPersonalData(data, JSON.stringify(r))).toEqual([]);
  });

  it('words a student insight the same way as an AI one', () => {
    const student = data.students[0];
    const si = buildStudentInput(data, student.id, { today });
    const r = basicStudent(si.payload, say, n, (c) => topicNameOf(si.topicRefs, c) ?? c);
    expect(parseStudentResult(r, si.payload)).toEqual(r);
    expect(r.encouragement).toBeTruthy();
  });

  it('works in Bangla too', () => {
    const bn = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate('bn', key, vars);
    const r = basicBatch(input.payload, bn, n, name);
    expect(/[ঀ-৿]/.test(r.summary)).toBe(true);
  });
});
