import en from './en.json';
import bn from './bn.json';
import { useSettings } from '@/store/settings';
import { formatDate, formatNumber, formatTime } from './format';
import type { Lang } from '@/types';

export type { Lang };

type Dict = typeof en;
type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Paths<Dict>;

// Typing bn as Dict makes a missing or extra key a compile error.
const dictionaries: Record<Lang, Dict> = { en, bn };

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let node: unknown = dictionaries[lang];
  for (const part of key.split('.')) node = (node as Record<string, unknown>)?.[part];
  let text = typeof node === 'string' ? node : key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

/** Translation + locale-aware number/date helpers bound to the current settings. */
export function useI18n() {
  const lang = useSettings((s) => s.lang);
  const banglaNumerals = useSettings((s) => s.banglaNumerals);
  return {
    lang,
    t: (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    n: (value: number, opts?: Intl.NumberFormatOptions) => formatNumber(value, lang, banglaNumerals, opts),
    time: (value: string | undefined) => formatTime(value, lang, banglaNumerals),
    d: (value: Date | string, opts?: Intl.DateTimeFormatOptions) => formatDate(value, lang, banglaNumerals, opts),
  };
}

export { dictionaries };
