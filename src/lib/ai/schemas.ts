// Check what the model sent back, and drop anything it invented (brief §9.1, §9.4).
// Topics and students are matched by code/letter; unknown ones are removed.
import type { BatchPayload, StudentPayload, TopicRef } from './anonymize';

export interface BatchAiResult {
  summary: string;
  reteachTopics: string[]; // topic codes that exist in the request
  students: { id: string; reason: string }[]; // letters that exist in the request
  suggestedActions: string[];
}
export interface StudentAiResult {
  strengths: { topic: string; note: string }[];
  weakSpots: { topic: string; note: string }[];
  nextSteps: string[];
  encouragement: string;
}

const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Returns null when the answer is unusable (the caller retries once, then falls back to the basic insight). */
export function parseBatchResult(raw: unknown, payload: BatchPayload): BatchAiResult | null {
  if (!isObj(raw)) return null;
  const summary = text(raw.summary, 700);
  if (!summary) return null;
  const topicCodes = new Set(payload.topics.map((t) => t.code));
  const letters = new Set(payload.attention.map((a) => a.id));
  return {
    summary,
    reteachTopics: [...new Set(list(raw.reteachTopics).filter((c): c is string => typeof c === 'string' && topicCodes.has(c)))].slice(0, 3),
    students: list(raw.students)
      .flatMap((s) => {
        if (!isObj(s)) return [];
        const id = text(s.id, 4);
        const reason = text(s.reason, 240);
        return id && reason && letters.has(id) ? [{ id, reason }] : [];
      })
      .slice(0, 4),
    suggestedActions: list(raw.suggestedActions).flatMap((a) => (text(a, 240) ? [text(a, 240) as string] : [])).slice(0, 4),
  };
}

export function parseStudentResult(raw: unknown, payload: StudentPayload): StudentAiResult | null {
  if (!isObj(raw)) return null;
  const encouragement = text(raw.encouragement, 400);
  if (!encouragement) return null;
  const codes = new Set(payload.subjects.flatMap((s) => s.topics.map((t) => t.code)));
  const topicNotes = (v: unknown) =>
    list(v)
      .flatMap((x) => {
        if (!isObj(x)) return [];
        const topic = text(x.topic, 6);
        const note = text(x.note, 240);
        return topic && note && codes.has(topic) ? [{ topic, note }] : [];
      })
      .slice(0, 3);
  return {
    strengths: topicNotes(raw.strengths),
    weakSpots: topicNotes(raw.weakSpots),
    nextSteps: list(raw.nextSteps).flatMap((a) => (text(a, 240) ? [text(a, 240) as string] : [])).slice(0, 3),
    encouragement,
  };
}

/** Topic code → name lookup for displaying results. */
export const topicNameOf = (refs: TopicRef[], code: string): string | undefined => refs.find((r) => r.code === code)?.name;
