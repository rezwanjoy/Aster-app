// AI client (brief §9.1). Talks to our own /api/ai endpoint (api/ai.ts), which holds the Gemini key
// on the server and relays Google's reply unchanged. No key ever reaches the browser.
import type { PromptSpec } from './prompts';

export const AI_ENDPOINT = '/api/ai';

export type AiErrorCode =
  | 'offline'
  | 'invalid_key' // 400 "API key not valid", 401, 403 (also: this site isn't allowed to use the endpoint)
  | 'model' // 404: the model name isn't available
  | 'rate_limited' // 429: free quota used up
  | 'blocked' // the answer was blocked by Google's safety filter
  | 'bad_response' // not valid JSON, even after one retry
  | 'server' // 5xx
  | 'timeout'
  | 'network'
  | 'privacy'; // our own check refused to send personal details

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AiError';
  }
}

export interface CallOptions {
  spec: PromptSpec;
  timeoutMs?: number;
  /** for tests */
  fetchImpl?: typeof fetch;
  online?: boolean;
}

interface GeminiReply {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; status?: string; message?: string };
}

/** Map an HTTP failure to one of our error codes. */
export function errorFor(status: number, body: GeminiReply | null): AiError {
  const message = body?.error?.message ?? `HTTP ${status}`;
  if (status === 429) return new AiError('rate_limited', message);
  if (status === 404) return new AiError('model', message);
  if (status === 401 || status === 403) return new AiError('invalid_key', message);
  if (status === 400) return new AiError(/api key/i.test(message) ? 'invalid_key' : 'bad_response', message);
  if (status >= 500) return new AiError('server', message);
  return new AiError('network', message);
}

const stripFences = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

async function once(o: CallOptions): Promise<unknown> {
  const doFetch = o.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), o.timeoutMs ?? 30_000);
  let res: Response;
  try {
    res = await doFetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ system: o.spec.system, user: o.spec.user, schema: o.spec.schema }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new AiError(e instanceof DOMException && e.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }

  let body: GeminiReply | null = null;
  try {
    body = (await res.json()) as GeminiReply;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) throw errorFor(res.status, body);
  if (body?.promptFeedback?.blockReason) throw new AiError('blocked', body.promptFeedback.blockReason);

  const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new AiError('bad_response', body?.candidates?.[0]?.finishReason ?? 'empty');
  try {
    return JSON.parse(stripFences(raw));
  } catch {
    throw new AiError('bad_response', 'not valid JSON');
  }
}

/**
 * Ask Gemini for JSON. If the reply isn't valid JSON, or `accept` rejects its shape, it asks once more,
 * then gives up with `bad_response` so the screen can show the basic insight instead.
 */
export async function callGemini<T>(o: CallOptions, accept: (raw: unknown) => T | null): Promise<T> {
  if (o.online === false || (o.online === undefined && typeof navigator !== 'undefined' && navigator.onLine === false)) throw new AiError('offline');

  let lastError: AiError = new AiError('bad_response');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = accept(await once(o));
      if (result !== null) return result;
      lastError = new AiError('bad_response', 'unexpected shape');
    } catch (e) {
      if (!(e instanceof AiError) || e.code !== 'bad_response') throw e; // only malformed answers are retried
      lastError = e;
    }
  }
  throw lastError;
}
