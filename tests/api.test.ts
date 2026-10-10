import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handle, resetLimits } from '../api/ai';

const ORIGIN = 'https://aster.example';
const env = { GEMINI_API_KEY: 'SERVER-KEY' };
const payload = { system: 's', user: 'u', schema: { type: 'OBJECT' } };

const req = (over: { method?: string; origin?: string | null; body?: unknown; ip?: string } = {}) =>
  new Request(`${ORIGIN}/api/ai`, {
    method: over.method ?? 'POST',
    headers: { ...(over.origin === null ? {} : { origin: over.origin ?? ORIGIN }), 'x-forwarded-for': over.ip ?? '1.1.1.1', 'content-type': 'application/json' },
    body: over.method === 'GET' ? undefined : JSON.stringify(over.body ?? payload),
  });
const ok = () => vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ candidates: [] }), { status: 200 })));

describe('/api/ai proxy', () => {
  beforeEach(resetLimits);

  it('adds the server key, fixes the model and relays the reply', async () => {
    const f = ok();
    const res = await handle(req(), env, f as never);
    expect(res.status).toBe(200);
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain('/models/gemini-3.5-flash-lite:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('SERVER-KEY');
    expect(await res.text()).not.toContain('SERVER-KEY');
  });

  it('refuses other sites, missing origin, wrong method and bad bodies', async () => {
    const f = ok();
    expect((await handle(req({ origin: 'https://evil.example' }), env, f as never)).status).toBe(403);
    expect((await handle(req({ origin: null }), env, f as never)).status).toBe(403);
    expect((await handle(req({ method: 'GET' }), env, f as never)).status).toBe(405);
    expect((await handle(req({ body: { system: 1 } }), env, f as never)).status).toBe(400);
    expect((await handle(req({ body: { ...payload, user: 'x'.repeat(13_000) } }), env, f as never)).status).toBe(413);
    expect(f).not.toHaveBeenCalled();
  });

  it('reports a missing server key without calling Google', async () => {
    const f = ok();
    expect((await handle(req(), {}, f as never)).status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it('limits one visitor per minute, but not the next visitor', async () => {
    const f = ok();
    for (let i = 0; i < 6; i++) expect((await handle(req(), env, f as never)).status).toBe(200);
    expect((await handle(req(), env, f as never)).status).toBe(429);
    expect((await handle(req({ ip: '2.2.2.2' }), env, f as never)).status).toBe(200);
  });

  it('stops everyone at the global daily cap', async () => {
    const f = ok();
    const capped = { ...env, AI_DAILY_CAP: '2' };
    await handle(req({ ip: 'a' }), capped, f as never);
    await handle(req({ ip: 'b' }), capped, f as never);
    expect((await handle(req({ ip: 'c' }), capped, f as never)).status).toBe(429);
  });
});
