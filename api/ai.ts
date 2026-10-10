// Vercel serverless function: the only place the Gemini key lives (env GEMINI_API_KEY, never in the app bundle).
// The app posts { system, user, schema }; this adds the key and forwards to Gemini, returning Google's reply as is.
// Guards: same-origin only, small bodies, fixed model, per-visitor and global request caps.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MAX_CHARS = 12_000;
const PER_MINUTE = 6;
const PER_DAY = 40;

type Env = Record<string, string | undefined>;

// In memory, so it resets when the function instance recycles: a brake, not a hard guarantee.
// For a hard limit, back these counters with Vercel KV / Upstash.
const hits = new Map<string, number[]>();
let day = { key: '', count: 0 };

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const fail = (status: number, message: string) => json({ error: { message } }, status);

export function allowRequest(who: string, now: number, dailyCap: number): string | null {
  const today = new Date(now).toISOString().slice(0, 10);
  if (day.key !== today) day = { key: today, count: 0 };
  if (day.count >= dailyCap) return 'The shared AI quota for today is used up.';
  const recent = (hits.get(who) ?? []).filter((t) => now - t < 86_400_000);
  if (recent.length >= PER_DAY) return 'Daily AI limit reached on this device.';
  if (recent.filter((t) => now - t < 60_000).length >= PER_MINUTE) return 'Too many requests. Wait a minute.';
  recent.push(now);
  hits.set(who, recent);
  day.count++;
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > 86_400_000) hits.delete(k);
  return null;
}

export const resetLimits = () => {
  hits.clear();
  day = { key: '', count: 0 };
};

export async function handle(request: Request, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return fail(405, 'POST only');

  const origin = request.headers.get('origin');
  const allowed = new Set([new URL(request.url).origin, ...(env.AI_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)]);
  if (!origin || !allowed.has(origin)) return fail(403, 'Not allowed from this site.');

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return fail(503, 'AI is not configured.');

  let body: { system?: unknown; user?: unknown; schema?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Bad request.');
  }
  const { system, user, schema } = body;
  if (typeof system !== 'string' || typeof user !== 'string' || typeof schema !== 'object' || schema === null) return fail(400, 'Bad request.');
  if (system.length + user.length > MAX_CHARS) return fail(413, 'Request too large.');

  const who = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const blocked = allowRequest(who, Date.now(), Number(env.AI_DAILY_CAP) || 300);
  if (blocked) return fail(429, blocked);

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  let upstream: Response;
  try {
    upstream = await fetchImpl(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4, maxOutputTokens: 1000 },
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return fail(504, 'The AI service did not answer.');
  }
  return new Response(await upstream.text(), { status: upstream.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  return handle(request);
}
