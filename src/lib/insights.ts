// Rule-based insights (brief §8, §9 principle): always free, instant and exact.
// They return structured findings; the UI turns them into English or Bangla sentences.
// AI (M6) only rewrites these in friendlier words: it never changes the numbers.
import type { AppData, ID } from '@/types';
import { attendanceRate, rangeStart } from './attendance';
import { batchTopicStats, reteachTopics, studentsNeedingAttention, type AttentionReason, type Ctx } from './batch';
import {
  assessmentTotals, goalProgress, overallMastery, overallTrend, studentTopicMastery,
  type GoalProgress, type TopicMastery,
} from './mastery';
import { mean } from './scope';

export const LOW_BATCH_ATTENDANCE = 80;
export const LOW_UNDERSTANDING = 3;

export type TeacherFinding =
  | { type: 'reteach'; topicId: ID; redPct: number; avgMastery: number | null }
  | { type: 'attention'; studentId: ID; batchIds: ID[]; reasons: AttentionReason[]; feeLate: boolean }
  | { type: 'attendance'; pct: number }
  | { type: 'understanding'; batchId: ID; avg: number };

export interface TeacherInsight {
  /** the single most important finding, or null when everything looks fine */
  headline: TeacherFinding | null;
  findings: TeacherFinding[];
}

/** What to tell the teacher about these batches: reteach topics first, then people, then attendance. */
export function teacherInsight(d: AppData, batchIds: ID[], ctx: Ctx): TeacherInsight {
  const findings: TeacherFinding[] = [];

  for (const t of reteachTopics(batchTopicStats(d, batchIds, ctx))) {
    findings.push({ type: 'reteach', topicId: t.topicId, redPct: t.redPct, avgMastery: t.avgMastery });
  }
  for (const a of studentsNeedingAttention(d, batchIds, ctx)) {
    findings.push({ type: 'attention', studentId: a.studentId, batchIds: a.batchIds, reasons: a.reasons, feeLate: a.feeLate });
  }
  const att = attendanceRate(d, { batchIds, from: rangeStart('4w', ctx.today), to: ctx.today });
  if (att.pct !== null && att.pct < LOW_BATCH_ATTENDANCE) findings.push({ type: 'attendance', pct: att.pct });

  for (const id of batchIds) {
    const recent = d.sessions.filter((s) => s.batchId === id && s.date <= ctx.today).sort((a, b) => a.date.localeCompare(b.date)).slice(-3);
    const avg = mean(recent.map((s) => s.understanding));
    if (recent.length === 3 && avg !== null && avg < LOW_UNDERSTANDING) findings.push({ type: 'understanding', batchId: id, avg: Math.round(avg * 10) / 10 });
  }
  return { headline: findings[0] ?? null, findings };
}

export type NextStep =
  | { type: 'practice'; topicId: ID }
  | { type: 'protectStrength'; topicId: ID }
  | { type: 'attendance'; pct: number }
  | { type: 'goal'; subjectId: ID };

export interface StudentInsight {
  overall: number | null;
  strengths: TopicMastery[];
  weakSpots: TopicMastery[];
  /** topics whose recent marks are dropping, even if not red yet */
  slipping: TopicMastery[];
  attendancePct: number | null;
  goals: Array<GoalProgress & { goalId: ID; subjectId: ID; label: string }>;
  nextSteps: NextStep[];
}

/** Strengths, weak spots, goal progress and a few concrete next steps for one student. */
export function studentInsight(d: AppData, studentId: ID, ctx: Ctx, opts: { subjectId?: ID } = {}): StudentInsight {
  const student = d.students.find((s) => s.id === studentId);
  const batchIds = student?.batchIds ?? [];
  const all = studentTopicMastery(d, studentId, { today: ctx.today, bands: ctx.bands, subjectIds: opts.subjectId ? [opts.subjectId] : undefined });
  const known = all.filter((m) => m.mastery !== null);
  const strengths = known.filter((m) => m.band === 'green').sort((a, b) => (b.mastery as number) - (a.mastery as number)).slice(0, 3);
  const weakSpots = known.filter((m) => m.band === 'red').sort((a, b) => (a.mastery as number) - (b.mastery as number)).slice(0, 3);
  const slipping = known.filter((m) => m.trend === 'down' && m.band !== 'red');
  const att = attendanceRate(d, { batchIds, studentId, from: rangeStart('4w', ctx.today), to: ctx.today });

  const goals = d.goals
    .filter((g) => g.studentId === studentId && (!opts.subjectId || g.subjectId === opts.subjectId))
    .map((g) => {
      const inSubject = all.filter((m) => m.subjectId === g.subjectId);
      const current = overallMastery(inSubject);
      const gp = goalProgress(current, g.targetPercent, overallTrend(d, studentId, { subjectId: g.subjectId, today: ctx.today }));
      return { ...gp, goalId: g.id, subjectId: g.subjectId, label: g.targetLabel };
    });

  const nextSteps: NextStep[] = weakSpots.slice(0, 2).map((m) => ({ type: 'practice', topicId: m.topicId }));
  if (att.pct !== null && att.total >= 3 && att.pct < 80) nextSteps.push({ type: 'attendance', pct: att.pct });
  if (strengths[0]) nextSteps.push({ type: 'protectStrength', topicId: strengths[0].topicId });
  const behind = goals.find((g) => g.status === 'needs_work');
  if (behind) nextSteps.push({ type: 'goal', subjectId: behind.subjectId });

  return { overall: overallMastery(known), strengths, weakSpots, slipping, attendancePct: att.pct, goals, nextSteps };
}

/** Marks for the line chart: this student's overall result per assessment. */
export const marksTrend = (d: AppData, studentId: ID, today: string, subjectId?: ID) =>
  assessmentTotals(d, studentId, { today, subjectId });

