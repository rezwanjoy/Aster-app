// Deterministic weekly study-plan generator (brief §8.5). Works with no AI.
// Priority = (100 − mastery) × weight; red topics first, one yellow, one spaced review a day.
// Regenerating keeps everything the student did or added and rebuilds only what is still to do.
import type { AppData, ID, PlanTask, StudyPlan } from '@/types';
import { addDays, weekdayOf } from './dates';
import { DEFAULT_BANDS, studentTopicMastery, type Bands, type TopicMastery } from './mastery';

/** Leitner-style gaps (days) between a completed task and its reviews. */
export const REVIEW_INTERVALS = [1, 3, 7, 14] as const;
export const PLAN_DAYS = 7;
const REVIEW_MINUTES = 5;
const SLOT = 5; // minutes are planned in 5-minute slots
/** Topics in an exam this close get extra weight. */
const EXAM_WINDOW_DAYS = 21;

export interface PlannerInput {
  data: AppData;
  studentId: ID;
  today: string;
  bands?: Bands;
  /** Plan only this subject (default: all the student's subjects). */
  subjectId?: ID;
  days?: number;
}

interface Candidate {
  m: TopicMastery;
  priority: number;
}

const floorSlot = (n: number) => Math.floor(n / SLOT) * SLOT;

export function generatePlan(input: PlannerInput): StudyPlan {
  const { data, studentId, today } = input;
  const bands = input.bands ?? DEFAULT_BANDS;
  const student = data.students.find((s) => s.id === studentId);
  if (!student) throw new Error(`Unknown student ${studentId}`);

  const existing = data.plans.find((p) => p.studentId === studentId);
  const history = existing?.tasks ?? [];
  // Kept as-is: anything finished, anything the student wrote, and anything in the past.
  const kept = history.filter((t) => t.done || t.kind === 'custom' || t.date < today);

  const window = Array.from({ length: input.days ?? PLAN_DAYS }, (_, i) => addDays(today, i));
  const studyDates = window.filter((d) => student.studyDays.includes(weekdayOf(d)));

  /* ── candidate topics ── */
  const masteries = studentTopicMastery(data, studentId, {
    today,
    bands,
    subjectIds: input.subjectId ? [input.subjectId] : undefined,
  });
  const examTopics = nearestExamTopics(data, student.batchIds, today);
  const candidates: Candidate[] = masteries
    .filter((m) => m.mastery !== null && m.band !== 'green')
    .map((m) => ({
      m,
      priority: (100 - (m.mastery as number)) * (1 + (m.trend === 'down' ? 0.5 : 0) + (examTopics.has(m.topicId) ? 0.5 : 0)),
    }))
    .sort((a, b) => b.priority - a.priority);
  const red = candidates.filter((c) => c.m.band === 'red');
  const yellow = candidates.filter((c) => c.m.band === 'yellow');
  const unknown = masteries.filter((m) => m.band === 'unknown'); // only used when there is spare time
  const primaries: Array<{ topicId: ID; reason: string }> = (red.length ? red : yellow).map((c) => ({ topicId: c.m.topicId, reason: c.m.band }));
  const secondaries = red.length ? yellow.map((c) => ({ topicId: c.m.topicId, reason: 'yellow' })) : [];
  const spare = unknown.map((m) => ({ topicId: m.topicId, reason: 'new' }));

  /* ── spaced reviews ── */
  const allowed = input.subjectId ? new Set(data.topics.filter((t) => t.subjectId === input.subjectId).map((t) => t.id)) : undefined;
  const reviewByDate = scheduleReviews(history, studyDates, today, allowed);

  /* ── build each study day ── */
  const learned = new Set(history.filter((t) => t.done && (t.kind === 'learn' || t.kind === 'practice') && t.topicId).map((t) => t.topicId as ID));
  const taken = new Map<string, number>(); // ids used per date
  const generated: PlanTask[] = [];
  let pi = 0;
  let si = 0;
  let ui = 0;

  const makeTask = (date: string, kind: PlanTask['kind'], topicId: ID, minutes: number, reason: string): PlanTask => {
    const known = new Set(kept.map((t) => t.id));
    let n = (taken.get(date) ?? 0) + 1;
    while (known.has(`pt_${date}_g${n}`)) n += 1;
    taken.set(date, n);
    return { id: `pt_${date}_g${n}`, date, kind, topicId, minutes, done: false, reason };
  };
  const pick = <T extends { topicId: ID }>(list: T[], start: number, skip: Set<ID>): { item: T; next: number } | null => {
    for (let k = 0; k < list.length; k++) {
      const item = list[(start + k) % list.length];
      if (!skip.has(item.topicId)) return { item, next: start + k + 1 };
    }
    return null;
  };

  for (const date of studyDates) {
    const doneMinutes = kept.filter((t) => t.done && (t.doneOn ?? t.date) === date).reduce((s, t) => s + t.minutes, 0);
    let budget = floorSlot(student.dailyMinutes - doneMinutes);
    if (budget < SLOT) continue;
    const alreadyToday = new Set(kept.filter((t) => t.date === date && t.topicId).map((t) => t.topicId as ID));

    // A topic already worked on today isn't also reviewed today.
    const dueReview = reviewByDate.get(date);
    const review = dueReview && !alreadyToday.has(dueReview) && budget >= REVIEW_MINUTES ? dueReview : undefined;
    if (review) {
      generated.push(makeTask(date, 'review', review, REVIEW_MINUTES, 'spaced'));
      budget -= REVIEW_MINUTES;
    }
    if (budget < SLOT) continue;
    const skip = new Set<ID>([...alreadyToday, ...(review ? [review] : [])]);

    const pool = primaries.length ? primaries : spare;
    const first = pick(pool, primaries.length ? pi : ui, skip);
    if (!first) continue;
    if (primaries.length) pi = first.next;
    else ui = first.next;

    const second = budget >= 2 * SLOT && secondaries.length ? pick(secondaries, si, new Set([...skip, first.item.topicId])) : null;
    const firstMinutes = second ? budget - SLOT : budget;
    for (const [entry, minutes] of [[first.item, firstMinutes], ...(second ? [[second.item, SLOT] as const] : [])] as const) {
      generated.push(makeTask(date, learned.has(entry.topicId) ? 'practice' : 'learn', entry.topicId, minutes, entry.reason));
      learned.add(entry.topicId);
    }
    if (second) si = second.next;
  }

  const tasks = [...kept, ...generated].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return {
    id: existing?.id ?? `plan_${studentId}`,
    studentId,
    createdAt: existing?.createdAt ?? today,
    weekStart: today,
    tasks,
    aiNote: existing?.aiNote,
  };
}

/** Topics of the soonest upcoming exam (within EXAM_WINDOW_DAYS) in the student's batches. */
function nearestExamTopics(d: AppData, batchIds: ID[], today: string): Set<ID> {
  const limit = addDays(today, EXAM_WINDOW_DAYS);
  const upcoming = d.assessments.filter((a) => batchIds.includes(a.batchId) && a.date > today && a.date <= limit).sort((a, b) => a.date.localeCompare(b.date));
  return new Set((upcoming[0]?.parts ?? []).map((p) => p.topicId));
}

/**
 * One review per study day: each finished task is reviewed again after 1, 3, 7 and 14 days.
 * Reviews that are already overdue collapse into a single review today.
 */
function scheduleReviews(history: PlanTask[], studyDates: string[], today: string, allowed?: Set<ID>): Map<string, ID> {
  const doneReviews = history.filter((t) => t.done && t.kind === 'review' && t.topicId);
  const wanted = new Map<string, { due: string; topicId: ID }>();
  for (const t of history) {
    if (!t.done || !t.topicId || (t.kind !== 'learn' && t.kind !== 'practice')) continue;
    if (allowed && !allowed.has(t.topicId)) continue;
    const anchor = t.doneOn ?? t.date;
    for (const gap of REVIEW_INTERVALS) {
      const due = addDays(anchor, gap);
      if (doneReviews.some((r) => r.topicId === t.topicId && (r.doneOn ?? r.date) >= due)) continue; // already reviewed since
      const effective = due < today ? today : due;
      wanted.set(`${t.topicId}|${effective}`, { due: effective, topicId: t.topicId });
    }
  }
  const ordered = [...wanted.values()].sort((a, b) => a.due.localeCompare(b.due) || a.topicId.localeCompare(b.topicId));

  const out = new Map<string, ID>();
  for (const w of ordered) {
    const date = studyDates.find((d) => d >= w.due && !out.has(d));
    if (date) out.set(date, w.topicId);
  }
  return out;
}
