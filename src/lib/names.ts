import type { Lang } from '@/types';

/** A name the user typed, in the chosen language when a Bangla version exists. */
export const nameOf = (x: { name: string; nameBn?: string }, lang: Lang): string => (lang === 'bn' && x.nameBn ? x.nameBn : x.name);
