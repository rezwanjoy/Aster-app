// Batch-level analysis: weak topics (§8.2), students needing attention (§8.3), summary tiles (§23).
import type { AppData, ID } from '@/types';
import { addDays } from './dates';
import { attendanceRate, rangeStart } from './attendance';
import { feesFor, remaining, studentsWithLateFees, totals } from './fees';
import {
  assessmentTotals, bandOf, DEFAULT_BANDS, masteryOf, overallMastery, studentTopicMastery, topicSeries, trendOf,
  type Band, type Bands, type Trend,
} from './mastery';
import { mean, studentsInBatches, subjectIdsOf } from './scope';

/** Suggest a reteach when at least this share of the batch is in the red for a topic. */
export const RETEACH_THRESHOLD = 40;
/** …and at least this many students have marks for it (avoids "100% of 1 student"). */
export const MIN_STUDENTS_FOR_RETEACH = 3;
/** A student is flagged when attendance over the last 4 weeks is below this. */
export const LOW_ATTENDANCE_PCT = 75;
export const MANY_RED_TOPICS = 3;

export interface Ctx {
  today: string;
  bands?: Bands;
}

export interface TopicStat {
  topicId: ID;
  subjectId: ID;
  /** students with marks for this topic */
  withData: number;
  redCount: number;
  /** share of students-with-data in the red band, rounded 0-100 */
  redPct: number;
  avgMastery: number | null;
  trend: Trend;
}

/** Per-topic stats for the batches, weakest first. Topics with no marks are last. */
export function batchTopicStats(d: AppData, batchIds: ID[], ctx: Ctx): TopicStat[] {
  const bands = ctx.bands ?? DEFAULT_BANDS;
  const students = studentsInBatches(d, batchIds);
  const subjects = subjectIdsOf(d, batchIds);
  const topics = d.topics.filter((t) => subjects.includes(t.subjectId));

  const stats = topics.map((t) => {
    const masteries: number[] = [];
    let red = 0;
    for (const s of students) {
      const m = masteryOf(topicSeries(d, s.id, t.id, { batchIds, today: ctx.today }).map((p) => p.pct));
      if (m === null) continue;
      masteries.push(m);
      if (bandOf(m, bands) === 'red') red += 1;
    }
    // batch-level trend: the class average of this topic in each assessment
    const byAssessment = new Map<string, { date: string; sum: number; n: number }>();
    for (const s of students) {
      for (const p of topicSeries(d, s.id, t.id, { batchIds, today: ctx.today })) {
        const cur = byAssessment.get(p.assessmentId) ?? { date: p.date, sum: 0, n: 0 };
        cur.sum += p.pct;
        cur.n += 1;
        byAssessment.set(p.assessmentId, cur);
      }
    }
    const series = [...byAssessment.values()].sort((a, b) => a.date.localeCompare(b.date)).map((x) => x.sum / x.n);
    return {
      topicId: t.id,
      subjectId: t.subjectId,
      withData: masteries.length,
      redCount: red,
      redPct: masteries.length ? Math.round((red / masteries.length) * 100) : 0,
      avgMastery: mean(masteries),
      trend: trendOf(series),
    } satisfies TopicStat;
  });

  const order = (id: ID) => d.topics.find((t) => t.id === id)?.order ?? 0;
  return stats.sort((a, b) => {
    if ((a.withData === 0) !== (b.withData === 0)) return a.withData === 0 ? 1 : -1;
    return b.redPct - a.redPct || (a.avgMastery ?? 101) - (b.avgMastery ?? 101) || order(a.topicId) - order(b.topicId);
  });
}

/** Topics the batch should revisit. */
export const reteachTopics = (stats: TopicStat[]): TopicStat[] =>
  stats.filter((s) => s.redPct >= RETEACH_THRESHOLD && s.withData >= MIN_STUDENTS_FOR_RETEACH);

export type AttentionReason = 'trendDown' | 'lowAttendance' | 'manyRed';
export interface AttentionItem {
  studentId: ID;
  /** the scope's batches this student is in */
  batchIds: ID[];
  /** academic reasons only */
  reasons: AttentionReason[];
  /** shown separately from the academic reasons */
  feeLate: boolean;
  mastery: number | null;
  attendancePct: number | null;
}

/** Students with at least one academic reason, most reasons first, then lowest mastery. */
export function studentsNeedingAttention(d: AppData, batchIds: ID[], ctx: Ctx): AttentionItem[] {
  const late = new Set(studentsWithLateFees(d, batchIds, ctx.today));
  const items: AttentionItem[] = [];
  for (const s of studentsInBatches(d, batchIds)) {
    const mine = s.batchIds.filter((b) => batchIds.includes(b));
    const masteries = studentTopicMastery(d, s.id, { batchIds, today: ctx.today, bands: ctx.bands });
    const att = attendanceRate(d, { batchIds: mine, studentId: s.id, from: rangeStart('4w', ctx.today), to: ctx.today });
    const reasons: AttentionReason[] = [];
    if (trendOf(assessmentTotals(d, s.id, { batchIds, today: ctx.today }).map((p) => p.pct)) === 'down') reasons.push('trendDown');
    if (att.pct !== null && att.total >= 3 && att.pct < LOW_ATTENDANCE_PCT) reasons.push('lowAttendance');
    if (masteries.filter((m) => m.band === 'red').length >= MANY_RED_TOPICS) reasons.push('manyRed');
    if (reasons.length) items.push({ studentId: s.id, batchIds: mine, reasons, feeLate: late.has(s.id), mastery: overallMastery(masteries), attendancePct: att.pct });
  }
  return items.sort((a, b) => b.reasons.length - a.reasons.length || (a.mastery ?? 101) - (b.mastery ?? 101));
}

export interface ScopeSummary {
  batches: number;
  students: number;
  /** last 4 weeks, or null when no classes */
  attendancePct: number | null;
  avgMastery: number | null;
  /** this month's fees */
  feesDueThisMonth: number;
  feesCollectedThisMonth: number;
  /** everything still owed across all months */
  feesOwed: number;
}

/** Numbers for the dashboard tiles. */
export function scopeSummary(d: AppData, batchIds: ID[], ctx: Ctx): ScopeSummary {
  const students = studentsInBatches(d, batchIds);
  const month = ctx.today.slice(0, 7);
  const thisMonth = totals(feesFor(d, { batchIds, month }));
  const all = feesFor(d, { batchIds });
  const masteries = students.flatMap((s) => {
    const m = overallMastery(studentTopicMastery(d, s.id, { batchIds, today: ctx.today, bands: ctx.bands }));
    return m === null ? [] : [m];
  });
  return {
    batches: batchIds.length,
    students: students.length,
    attendancePct: attendanceRate(d, { batchIds, from: rangeStart('4w', ctx.today), to: ctx.today }).pct,
    avgMastery: mean(masteries),
    feesDueThisMonth: thisMonth.due,
    feesCollectedThisMonth: thisMonth.collected,
    feesOwed: all.reduce((s, f) => s + remaining(f), 0),
  };
}

/** The next time a batch meets (today counts), as a date and "HH:mm", or null if it has no class days. */
export function nextClass(d: AppData, batchId: ID, today: string): { date: string; time?: string } | null {
  const b = d.batches.find((x) => x.id === batchId);
  if (!b || !b.classDays.length) return null;
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (b.classDays.includes(wd) && !d.events.some((e) => e.kind === 'holiday' && e.date === date && (!e.batchId || e.batchId === batchId))) {
      return { date, time: b.startTime };
    }
  }
  return null;
}

/* ───────── weak-topic map (heatmap) and class trend (M4) ───────── */

export interface HeatCell {
  topicId: ID;
  mastery: number | null;
  band: Band;
  trend: Trend;
}
export interface HeatRow {
  studentId: ID;
  overall: number | null;
  cells: HeatCell[];
}
export interface Heatmap {
  topicIds: ID[];
  /** weakest students first */
  rows: HeatRow[];
  /** share of students-with-data in the red band, per topic (same order as topicIds) */
  redPct: number[];
}

/** Students × topics for one subject across some batches. Only students who study the subject appear. */
export function topicHeatmap(d: AppData, batchIds: ID[], subjectId: ID, ctx: Ctx): Heatmap {
  const topics = d.topics.filter((t) => t.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const students = studentsInBatches(d, batchIds).filter((s) =>
    d.batches.some((b) => b.subjectIds.includes(subjectId) && batchIds.includes(b.id) && s.batchIds.includes(b.id)),
  );
  const rows: HeatRow[] = students.map((s) => {
    const ms = studentTopicMastery(d, s.id, { batchIds, today: ctx.today, bands: ctx.bands, subjectIds: [subjectId] });
    return {
      studentId: s.id,
      overall: overallMastery(ms),
      cells: topics.map((t) => {
        const m = ms.find((x) => x.topicId === t.id);
        return { topicId: t.id, mastery: m?.mastery ?? null, band: m?.band ?? 'unknown', trend: m?.trend ?? 'flat' };
      }),
    };
  });
  const name = (id: ID) => d.students.find((s) => s.id === id)?.name ?? '';
  rows.sort((a, b) => (a.overall ?? 101) - (b.overall ?? 101) || name(a.studentId).localeCompare(name(b.studentId)));
  const redPct = topics.map((_, i) => {
    const withData = rows.filter((r) => r.cells[i].mastery !== null);
    return withData.length ? Math.round((withData.filter((r) => r.cells[i].band === 'red').length / withData.length) * 100) : 0;
  });
  return { topicIds: topics.map((t) => t.id), rows, redPct };
}

export interface ClassPoint {
  assessmentId: ID;
  date: string;
  name: string;
  /** average of the students' whole-exam percentages */
  pct: number;
  students: number;
}

/** Class average for each past exam, oldest first (optionally one subject). */
export function classAverageSeries(d: AppData, batchIds: ID[], today: string, subjectId?: ID): ClassPoint[] {
  const out: ClassPoint[] = [];
  for (const a of [...d.assessments].sort((x, y) => x.date.localeCompare(y.date))) {
    if (!batchIds.includes(a.batchId) || a.date > today || (subjectId && a.subjectId !== subjectId)) continue;
    const pcts = studentsInBatches(d, [a.batchId]).flatMap((s) => {
      let got = 0;
      let max = 0;
      for (const p of a.parts) {
        const v = a.scores[s.id]?.[p.topicId];
        if (typeof v === 'number' && p.maxMarks > 0) {
          got += v;
          max += p.maxMarks;
        }
      }
      return max > 0 ? [(got / max) * 100] : [];
    });
    const avg = mean(pcts);
    if (avg !== null) out.push({ assessmentId: a.id, date: a.date, name: a.name, pct: avg, students: pcts.length });
  }
  return out;
}
