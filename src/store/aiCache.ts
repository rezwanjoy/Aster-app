import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emptyCache, putCached, type CacheState } from '@/lib/ai/cache';

interface AiCacheStore extends CacheState {
  put: (key: string, result: unknown) => void;
  clear: () => void;
}

/** Saved AI answers on this device only. Never part of a backup. */
export const useAiCache = create<AiCacheStore>()(
  persist(
    (set, get) => ({
      ...emptyCache(),
      put: (key, result) => {
        const { entries, order } = putCached({ entries: get().entries, order: get().order }, key, result);
        set({ entries, order });
      },
      clear: () => set(emptyCache()),
    }),
    { name: 'aster-ai-cache', version: 1 },
  ),
);
