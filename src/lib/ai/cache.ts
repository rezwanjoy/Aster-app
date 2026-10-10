// Saved AI answers, keyed by what was asked, so the same data never spends quota twice (brief §9.5).

export interface CacheEntry<T = unknown> {
  key: string;
  createdAt: string;
  result: T;
}
export interface CacheState {
  entries: Record<string, CacheEntry>;
  /** oldest first */
  order: string[];
}

export const CACHE_LIMIT = 40;
export const emptyCache = (): CacheState => ({ entries: {}, order: [] });

/** Small, fast 53-bit string hash (cyrb53). Not secure; only used to name cache entries. */
export function hashString(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Same data, prompt version, model and language → same key. Anything else changes it. */
export const cacheKey = (parts: { kind: string; version: string; model: string; lang: string; payload: unknown }): string =>
  `${parts.kind}|${parts.version}|${parts.model}|${parts.lang}|${hashString(JSON.stringify(parts.payload))}`;

export const getCached = <T>(c: CacheState, key: string): CacheEntry<T> | undefined => c.entries[key] as CacheEntry<T> | undefined;

/** Add or replace an entry, dropping the oldest ones beyond the limit. */
export function putCached<T>(c: CacheState, key: string, result: T, now: Date = new Date()): CacheState {
  const entries = { ...c.entries, [key]: { key, createdAt: now.toISOString(), result } };
  const order = [...c.order.filter((k) => k !== key), key];
  while (order.length > CACHE_LIMIT) delete entries[order.shift() as string];
  return { entries, order };
}
