import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import { AiError, callGemini, type AiErrorCode } from '@/lib/ai/client';
import { cacheKey, getCached } from '@/lib/ai/cache';
import { findPersonalData } from '@/lib/ai/privacy';
import { PROMPT_VERSION, type PromptSpec } from '@/lib/ai/prompts';
import { bumpUsage, overFreeLimit, usedThisMonth, FREE_AI_PER_MONTH } from '@/lib/ai/usage';
import { useAiCache } from '@/store/aiCache';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';

export type AiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: T; cached: boolean; source: 'ai' | 'basic' }
  | { status: 'error'; code: AiErrorCode };

interface Request<T> {
  kind: 'batch' | 'student';
  payload: unknown;
  spec: PromptSpec;
  accept: (raw: unknown) => T | null;
  /** the calculated insight, used when the free AI insights are used up or Google cannot answer */
  basic?: () => T;
}

/**
 * Runs one AI request: checks saved answers first (free), then the personal-data guard, then Gemini.
 * `generate({ force })` skips the free-plan notice ("Generate anyway (demo)").
 */
export function useAi<T>(request: Request<T> | null) {
  const { lang } = useI18n();
  const { model, consented, usage } = useSettings((s) => s.ai);
  const patchSettings = useSettings((s) => s.patchSettings);
  const cache = useAiCache();
  const [state, setState] = useState<AiState<T>>({ status: 'idle' });
  const run = useRef(0);

  const key = request ? cacheKey({ kind: request.kind, version: PROMPT_VERSION, model, lang, payload: request.payload }) : null;
  const saved = key ? getCached<T>({ entries: cache.entries, order: cache.order }, key) : undefined;

  // a different request (other batch, other data) resets the card; a saved answer shows straight away
  useEffect(() => {
    run.current++;
    setState({ status: 'idle' });
  }, [key]);

  // AI is always on (the server holds the key); the teacher only confirms the data notice once
  const ready = consented;
  const limited = overFreeLimit(usage);
  const consent = useCallback(() => patchSettings({ ai: { ...useSettings.getState().ai, consented: true } }), [patchSettings]);

  const generate = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (!request || !key || !useSettings.getState().ai.consented) return;
      const id = ++run.current;
      const hit = getCached<T>({ entries: useAiCache.getState().entries, order: useAiCache.getState().order }, key);
      if (hit) return setState({ status: 'done', result: hit.result, cached: true, source: 'ai' });
      const showBasic = () => request.basic && setState({ status: 'done', result: request.basic(), cached: false, source: 'basic' });
      if (!opts.force && overFreeLimit(useSettings.getState().ai.usage) && request.basic) return showBasic();

      // defensive: nothing personal may leave the device, even by accident
      const text = request.spec.user + request.spec.system;
      if (findPersonalData(useData.getState(), text).length > 0) return setState({ status: 'error', code: 'privacy' });

      setState({ status: 'loading' });
      try {
        const result = await callGemini({ spec: request.spec }, request.accept);
        if (id !== run.current) return;
        useAiCache.getState().put(key, result);
        patchSettings({ ai: { ...useSettings.getState().ai, usage: bumpUsage(useSettings.getState().ai.usage) } });
        setState({ status: 'done', result, cached: false, source: 'ai' });
      } catch (e) {
        if (id !== run.current) return;
        const code = e instanceof AiError ? e.code : 'network';
        if (code !== 'privacy' && request.basic) return showBasic(); // Google cannot answer right now: still give the teacher something useful
        setState({ status: 'error', code });
      }
    },
    [request, key, patchSettings],
  );

  const shown: AiState<T> = state.status === 'idle' && saved ? { status: 'done', result: saved.result, cached: true, source: 'ai' } : state;
  return { state: shown, generate, ready, consent, limited, used: usedThisMonth(usage), freeLimit: FREE_AI_PER_MONTH, hasSaved: !!saved };
}
