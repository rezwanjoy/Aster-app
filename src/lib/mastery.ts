// Topic mastery, bands and trends (brief §8.1). Pure functions, no UI.
import type { AppData, ID } from '@/types';
import { mean, studentSubjectIds } from './scope';

/** Weight of the k-th most recent assessment is DECAY^k (k = 0 is the newest). */
export const DECAY = 0.6;
/** A change of more than this many points counts as up/down. */
export const TREND_THRESHOLD = 5;

export type Band = 'red' | 'yellow' | 'green' | 'unknown';
export type Trend = 'up' | 'flat' | 'down';
export interface Bands {
  redBelow: number;
  greenFrom: number;
}
export const DEFAULT_BANDS: Bands = { redBelow: 50, greenFrom: 70 };

/** red < redBelow, green ≥ greenFrom, yellow in between. No data is "unknown", never red. */
export function bandOf(pct: number | null, bands: Bands = DEFAULT_BANDS): Band {
  if (pct === null) return 'unknown';
  if (pct < bands.redBelow) return 'red';
  if (pct >= bands.greenFrom) return 'green';
  return 'yellow';
}

/** Recency-weighted average of percentages (oldest first). */
export function masteryOf(percentsOldestFirst: number[]): number | null {
  const n = percentsOldestFirst.length;
  if (!n) return null;
  let num = 0;
  let den = 0;
  for (let k = 0; k < n; k++) {
    const w = DECAY ** k;
    num += percentsOldestFirst[n - 1 - k] * w;
    den += w;
  }
  return num / den;
}

/**
 * Compare the latest result(s) with the earlier history.
 * With 4+ results the newest two are "recent"; otherwise just the newest one.
 * Fewer than 2 results → flat.
 */
export function trendOf(percentsOldestFirst: number[]): Trend {
  const n = percentsOldestFirst.length;
  if (n < 2) return 'flat';
  const split = n >= 4 ? 2 : 1;
  const recent = mean(percentsOldestFirst.slice(-split)) as number;
  const earlier = masteryOf(percentsOldestFirst.slice(0, -split)) as number;
  const diff = recent - earlier;
  if (diff > TREND_THRESHOLD) return 'up';
  if (diff < -TREND_THRESHOLD) return 'down';
  return 'flat';
}

export interface Point {
  date: string;
  pct: number;
  assessmentId: ID;
}

interface ScopeOpts {
  /** Only count assessments of these batches. */
  batchIds?: ID[];
  /** Ignore assessments after this day (so upcoming exams never count). */
  today?: string;
}

const usable = (d: AppData, o: ScopeOpts) =>
  d.assessments
    .filter((a) => (!o.batchIds || o.batchIds.includes(a.batchId)) && (!o.today || a.date <= o.today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

/** One student's percentage in one topic for each assessment, oldest first. */
export function topicSeries(d: AppData, studentId: ID, topicId: ID, o: ScopeOpts = {}): Point[] {
  const out: Point[] = [];
  for (const a of usable(d, o)) {
    const part = a.parts.find((p) => p.topicId === topicId);
    const score = a.scores[studentId]?.[topicId];
    if (part && part.maxMarks > 0 && typeof score === 'number') out.push({ date: a.date, pct: (score / part.maxMarks) * 100, assessmentId: a.id });
  }
  return out;
}

/** One student's overall percentage in each assessment (all scored parts together), oldest first. */
export function assessmentTotals(d: AppData, studentId: ID, o: ScopeOpts & { subjectId?: ID } = {}): Point[] {
  const out: Point[] = [];
  for (const a of usable(d, o)) {
    if (o.subjectId && a.subjectId !== o.subjectId) continue;
    let got = 0;
    let max = 0;
    for (const p of a.parts) {
      const score = a.scores[studentId]?.[p.topicId];
      if (typeof score === 'number' && p.maxMarks > 0) {
        got += score;
        max += p.maxMarks;
      }
    }
    if (max > 0) out.push({ date: a.date, pct: (got / max) * 100, assessmentId: a.id });
  }
  return out;
}

export interface TopicMastery {
  topicId: ID;
  subjectId: ID;
  mastery: number | null;
  band: Band;
  trend: Trend;
  latest: number | null;
  samples: number;
}

export interface MasteryOpts extends ScopeOpts {
  /** Limit to these subjects (default: every subject the student studies). */
  subjectIds?: ID[];
  bands?: Bands;
}

/** Mastery for every topic of the student's subjects (topics without marks are "unknown"). */
export function studentTopicMastery(d: AppData, studentId: ID, o: MasteryOpts = {}): TopicMastery[] {
  const subjectIds = o.subjectIds ?? studentSubjectIds(d, studentId, o.batchIds);
  const topics = d.topics
    .filter((t) => subjectIds.includes(t.subjectId))
    .sort((a, b) => subjectIds.indexOf(a.subjectId) - subjectIds.indexOf(b.subjectId) || a.order - b.order);
  return topics.map((t) => {
    const series = topicSeries(d, studentId, t.id, o);
    const pcts = series.map((p) => p.pct);
    const mastery = masteryOf(pcts);
    return {
      topicId: t.id,
      subjectId: t.subjectId,
      mastery,
      band: bandOf(mastery, o.bands),
      trend: trendOf(pcts),
      latest: pcts.length ? pcts[pcts.length - 1] : null,
      samples: pcts.length,
    };
  });
}

/** Average mastery over the topics that have data. */
export const overallMastery = (ms: TopicMastery[]): number | null => mean(ms.flatMap((m) => (m.mastery === null ? [] : [m.mastery])));

/** Overall trend from how the student's whole-assessment results have moved. */
export const overallTrend = (d: AppData, studentId: ID, o: ScopeOpts & { subjectId?: ID } = {}): Trend =>
  trendOf(assessmentTotals(d, studentId, o).map((p) => p.pct));

/* ───────── goal progress (brief §8.6) ───────── */

export type GoalStatus = 'on_track' | 'needs_work' | 'no_data';
export interface GoalProgress {
  current: number | null;
  target: number;
  gap: number | null;
  status: GoalStatus;
}

/** Guidance only: never a promise of a grade. */
export function goalProgress(current: number | null, targetPercent: number, trend: Trend): GoalProgress {
  if (current === null) return { current, target: targetPercent, gap: null, status: 'no_data' };
  const gap = Math.max(0, targetPercent - current);
  const onTrack = gap === 0 || (trend === 'up' && gap <= 15);
  return { current, target: targetPercent, gap, status: onTrack ? 'on_track' : 'needs_work' };
}
