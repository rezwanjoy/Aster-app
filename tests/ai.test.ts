import { describe, expect, it, vi } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { buildBatchInput, buildStudentInput, pseudonym } from '../src/lib/ai/anonymize';
import { findPersonalData } from '../src/lib/ai/privacy';
import { batchPrompt, pingPrompt, studentPrompt } from '../src/lib/ai/prompts';
import { parseBatchResult, parseStudentResult } from '../src/lib/ai/schemas';
import { AiError, callGemini, errorFor } from '../src/lib/ai/client';
import { CACHE_LIMIT, cacheKey, emptyCache, getCached, putCached } from '../src/lib/ai/cache';
import { bumpUsage, FREE_AI_PER_MONTH, overFreeLimit, usedThisMonth } from '../src/lib/ai/usage';
import { migrateSettings } from '../src/store/migrations';

const REF = '2026-10-08';
const ctx = { today: REF };
const seed = generateSeed(REF);
const allBatches = seed.batches.map((b) => b.id);

describe('pseudonyms', () => {
  it('count A..Z then AA', () => {
    expect([0, 1, 25, 26, 27].map(pseudonym)).toEqual(['A', 'B', 'Z', 'AA', 'AB']);
  });
});

describe('nothing personal leaves the device', () => {
  it('batch payloads contain no names, phones or batch names, for every batch', () => {
    for (const ids of [...allBatches.map((b) => [b]), allBatches]) {
      const { payload, aliases } = buildBatchInput(seed, ids, ctx);
      const text = JSON.stringify(payload) + batchPrompt(payload, 'bn').user + batchPrompt(payload, 'en').system;
      expect(findPersonalData(seed, text)).toEqual([]);
      for (const real of Object.values(aliases)) expect(text).not.toContain(real);
    }
  });

  it('student payloads contain no personal data, for all students', () => {
    for (const s of seed.students) {
      const { payload } = buildStudentInput(seed, s.id, ctx);
      const text = JSON.stringify(payload) + studentPrompt(payload, 'en').user;
      expect(findPersonalData(seed, text)).toEqual([]);
    }
  });

  it('the guard catches a name, a phone number and the center name', () => {
    const s = seed.students.find((x) => x.guardianPhone)!;
    expect(findPersonalData(seed, `hello ${s.name}`).length).toBeGreaterThan(0);
    expect(findPersonalData(seed, `call ${s.guardianPhone}`).length).toBeGreaterThan(0);
    expect(findPersonalData(seed, seed.profile.centerName.en).length).toBeGreaterThan(0);
  });

  it('attention students are letters, mapped back locally', () => {
    const { payload, aliases } = buildBatchInput(seed, ['b_math10'], ctx);
    expect(payload.attention.length).toBeGreaterThan(0);
    for (const a of payload.attention) {
      expect(a.id).toMatch(/^[A-Z]+$/);
      expect(seed.students.some((s) => s.id === aliases[a.id])).toBe(true);
    }
    expect(payload.topics[0].name).toBe('Quadratic Equations');
  });
});

describe('validating answers', () => {
  const { payload } = buildBatchInput(seed, ['b_math10'], ctx);
  const firstLetter = payload.attention[0].id;

  it('keeps known codes/letters and drops invented ones', () => {
    const r = parseBatchResult(
      {
        summary: ' Doing fine. ',
        reteachTopics: ['T1', 'T99', 'T1', 7],
        students: [{ id: firstLetter, reason: 'Low' }, { id: 'ZZZ', reason: 'ghost' }, { id: 'A' }],
        suggestedActions: ['Do this', '', 3],
      },
      payload,
    );
    expect(r).toEqual({ summary: 'Doing fine.', reteachTopics: ['T1'], students: [{ id: firstLetter, reason: 'Low' }], suggestedActions: ['Do this'] });
  });

  it('rejects answers with no summary or wrong shape', () => {
    expect(parseBatchResult(null, payload)).toBeNull();
    expect(parseBatchResult({ summary: '' }, payload)).toBeNull();
    expect(parseBatchResult([], payload)).toBeNull();
  });

  it('validates student answers against the topic codes sent', () => {
    const sp = buildStudentInput(seed, seed.students[0].id, ctx).payload;
    const code = sp.subjects[0].topics[0].code;
    const r = parseStudentResult(
      { strengths: [{ topic: code, note: 'Good' }, { topic: 'T999', note: 'x' }], weakSpots: [], nextSteps: ['a', 'b', 'c', 'd'], encouragement: 'Keep going' },
      sp,
    );
    expect(r?.strengths).toEqual([{ topic: code, note: 'Good' }]);
    expect(r?.nextSteps).toHaveLength(3);
    expect(parseStudentResult({ strengths: [] }, sp)).toBeNull();
  });
});

describe('Gemini client', () => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const text = (t: string) => ({ candidates: [{ content: { parts: [{ text: t }] } }] });
  const base = { spec: pingPrompt(), online: true };
  const accept = (raw: unknown) => (raw && typeof raw === 'object' && 'ok' in raw ? (raw as { ok: boolean }) : null);

  it('posts the prompt to our own endpoint and carries no key', async () => {
    const f = vi.fn().mockResolvedValue(reply(text('{"ok":true}')));
    await expect(callGemini({ ...base, fetchImpl: f as never }, accept)).resolves.toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/ai');
    expect(Object.keys(init.headers)).toEqual(['content-type']);
    expect(Object.keys(JSON.parse(init.body)).sort()).toEqual(['schema', 'system', 'user']);
  });

  it('accepts JSON wrapped in code fences', async () => {
    const f = vi.fn().mockResolvedValue(reply(text('```json\n{"ok":true}\n```')));
    await expect(callGemini({ ...base, fetchImpl: f as never }, accept)).resolves.toEqual({ ok: true });
  });

  it('retries once on bad JSON, then succeeds', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(text('nope'))).mockResolvedValueOnce(reply(text('{"ok":true}')));
    await expect(callGemini({ ...base, fetchImpl: f as never }, accept)).resolves.toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('gives up after two bad answers', async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(reply(text('nope'))));
    await expect(callGemini({ ...base, fetchImpl: f as never }, accept)).rejects.toMatchObject({ code: 'bad_response' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('does not retry real errors', async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(reply({ error: { message: 'quota' } }, 429)));
    await expect(callGemini({ ...base, fetchImpl: f as never }, accept)).rejects.toMatchObject({ code: 'rate_limited' });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('maps statuses to error codes', () => {
    expect(errorFor(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }).code).toBe('invalid_key');
    expect(errorFor(400, { error: { message: 'bad schema' } }).code).toBe('bad_response');
    expect(errorFor(403, null).code).toBe('invalid_key');
    expect(errorFor(404, null).code).toBe('model');
    expect(errorFor(503, null).code).toBe('server');
  });

  it('handles offline, network failure and blocked answers', async () => {
    await expect(callGemini({ ...base, online: false }, accept)).rejects.toMatchObject({ code: 'offline' });
    const boom = vi.fn().mockRejectedValue(new TypeError('failed'));
    await expect(callGemini({ ...base, fetchImpl: boom as never }, accept)).rejects.toBeInstanceOf(AiError);
    const blocked = vi.fn().mockResolvedValue(reply({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(callGemini({ ...base, fetchImpl: blocked as never }, accept)).rejects.toMatchObject({ code: 'blocked' });
  });
});

describe('answer cache', () => {
  const key = (payload: unknown, lang = 'en') => cacheKey({ kind: 'batch', version: 'v1', model: 'm', lang, payload });

  it('same data → same key; any change → new key', () => {
    expect(key({ a: 1 })).toBe(key({ a: 1 }));
    expect(key({ a: 1 })).not.toBe(key({ a: 2 }));
    expect(key({ a: 1 })).not.toBe(key({ a: 1 }, 'bn'));
  });

  it('keeps at most CACHE_LIMIT entries, dropping the oldest', () => {
    let c = emptyCache();
    for (let i = 0; i < CACHE_LIMIT + 5; i++) c = putCached(c, `k${i}`, i);
    expect(c.order).toHaveLength(CACHE_LIMIT);
    expect(getCached(c, 'k0')).toBeUndefined();
    expect(getCached(c, `k${CACHE_LIMIT + 4}`)?.result).toBe(CACHE_LIMIT + 4);
  });

  it('re-saving an entry makes it the newest', () => {
    let c = putCached(putCached(emptyCache(), 'a', 1), 'b', 2);
    c = putCached(c, 'a', 3);
    expect(c.order).toEqual(['b', 'a']);
  });
});

describe('free-plan counter', () => {
  it('counts per month and rolls over', () => {
    let u = { month: '', count: 0 };
    const oct = new Date(2026, 9, 8);
    for (let i = 0; i < FREE_AI_PER_MONTH; i++) u = bumpUsage(u, oct);
    expect(usedThisMonth(u, oct)).toBe(FREE_AI_PER_MONTH);
    expect(overFreeLimit(u, oct)).toBe(true);
    const nov = new Date(2026, 10, 1);
    expect(usedThisMonth(u, nov)).toBe(0);
    expect(overFreeLimit(u, nov)).toBe(false);
    expect(bumpUsage(u, nov)).toEqual({ month: '2026-11', count: 1 });
  });
});

describe('settings v4/v5 migration', () => {
  it('adds consent=false and a model, and drops any key saved on the device', () => {
    const out = migrateSettings({ ai: { apiKey: 'abc', enabled: true } }, 3) as { ai: Record<string, unknown> };
    expect(out.ai).not.toHaveProperty('apiKey');
    expect(out.ai).not.toHaveProperty('enabled');
    expect(out.ai.consented).toBe(false);
    expect(out.ai.model).toBeTruthy();
  });
});
