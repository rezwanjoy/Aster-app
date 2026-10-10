// Versioned prompts (brief §9.4). Bump PROMPT_VERSION whenever a prompt or schema changes:
// it is part of the cache key, so old saved answers are not reused.
import type { Lang } from '@/types';
import { languageName, type BatchPayload, type StudentPayload } from './anonymize';

export const PROMPT_VERSION = 'v1';

export interface PromptSpec {
  system: string;
  user: string;
  /** Gemini responseSchema (OpenAPI subset) */
  schema: Record<string, unknown>;
}

const system = (lang: Lang) =>
  [
    'You are a supportive tutoring assistant for SSC-level students in Bangladesh (Classes 6-10).',
    'Be specific, kind and brief.',
    'Use ONLY the data provided. Never invent marks, percentages, topics, names or facts.',
    'Refer to topics only by their codes (T1, T2...) in the fields that ask for codes, and refer to students only by their letters (A, B...) in fields that ask for ids.',
    'Never promise or guarantee a grade improvement. Phrase advice as guidance.',
    lang === 'bn'
      ? 'Write all free-text fields in simple, natural Bangla (Bengali), the way a friendly teacher would speak. Do not translate word by word. Keep topic names in Bangla if you mention them in prose.'
      : 'Write all free-text fields in simple, clear English.',
    `Respond with JSON only, written in ${languageName(lang)}.`,
  ].join(' ');

const STRING = { type: 'STRING' };
const strings = { type: 'ARRAY', items: STRING };

export function batchPrompt(payload: BatchPayload, lang: Lang): PromptSpec {
  return {
    system: system(lang),
    user: [
      'Here is anonymised data about one class (JSON):',
      JSON.stringify(payload),
      'Write a short insight for the teacher.',
      'summary: 2-3 sentences on how the class is doing.',
      'reteachTopics: topic codes (like "T1") the teacher should reteach, most important first, at most 3, only from the data.',
      'students: for each student letter that needs attention, a one-sentence reason in id/reason pairs, at most 4, only letters from the data.',
      'suggestedActions: 2-4 short, practical actions for the next week.',
    ].join('\n'),
    schema: {
      type: 'OBJECT',
      properties: {
        summary: STRING,
        reteachTopics: strings,
        students: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: STRING, reason: STRING }, required: ['id', 'reason'] } },
        suggestedActions: strings,
      },
      required: ['summary', 'reteachTopics', 'students', 'suggestedActions'],
    },
  };
}

export function studentPrompt(payload: StudentPayload, lang: Lang): PromptSpec {
  return {
    system: system(lang),
    user: [
      'Here is anonymised data about one student (JSON):',
      JSON.stringify(payload),
      'Write a short, encouraging insight for the teacher to share with the student.',
      'strengths: up to 3 items with a topic code and a short note, only topics from the data.',
      'weakSpots: up to 3 items with a topic code and a short note about what to practise.',
      'nextSteps: 2-3 short, concrete steps for the coming week.',
      'encouragement: 1-2 warm sentences. Do not promise any result.',
    ].join('\n'),
    schema: {
      type: 'OBJECT',
      properties: {
        strengths: { type: 'ARRAY', items: { type: 'OBJECT', properties: { topic: STRING, note: STRING }, required: ['topic', 'note'] } },
        weakSpots: { type: 'ARRAY', items: { type: 'OBJECT', properties: { topic: STRING, note: STRING }, required: ['topic', 'note'] } },
        nextSteps: strings,
        encouragement: STRING,
      },
      required: ['strengths', 'weakSpots', 'nextSteps', 'encouragement'],
    },
  };
}

/** A tiny request used by "Test connection". */
export const pingPrompt = (): PromptSpec => ({
  system: 'Reply with JSON only.',
  user: 'Return {"ok": true}.',
  schema: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } }, required: ['ok'] },
});
