// What is allowed to leave the device (brief §9.2). Only topic names, percentages, trends, attendance,
// goals and study time, never a name, phone number, guardian, batch name or the center's name.
// Students become "A", "B", … and topics become "T1", "T2", …; the answer is mapped back locally.
import type { AppData, ID, Lang } from '@/types';
import { attendanceRate, rangeStart } from '@/lib/attendance';
import { batchTopicStats, studentsNeedingAttention, type Ctx } from '@/lib/batch';
import { studentInsight } from '@/lib/insights';
import { studentTopicMastery } from '@/lib/mastery';
import { mean, studentsInBatches, subjectIdsOf } from '@/lib/scope';

/** "A", "B", … "Z", "AA", … */
export function pseudonym(i: number): string {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

const round = (v: number | null) => (v === null ? null : Math.round(v));

export interface TopicRef {
  code: string;
  name: string; // English syllabus name (not personal)
}

export interface BatchPayload {
  /** e.g. ["Class 10 · Mathematics"]: level and subject only */
  classes: string[];
  studentCount: number;
  attendancePct: number | null;
  /** average of the last three classes' "how well did they understand" ratings (1-5) */
  understandingAvg: number | null;
  topics: { code: string; name: string; weakPct: number; avgMastery: number | null; trend: string }[];
  attention: { id: string; reasons: string[]; mastery: number | null; attendancePct: number | null }[];
}
export interface BatchAiInput {
  payload: BatchPayload;
  topicRefs: TopicRef[];
  /** pseudonym → real student id, kept on this device */
  aliases: Record<string, ID>;
}

export function buildBatchInput(d: AppData, batchIds: ID[], ctx: Ctx): BatchAiInput {
  const stats = batchTopicStats(d, batchIds, ctx).filter((s) => s.withData > 0).slice(0, 12);
  const topicRefs: TopicRef[] = stats.map((s, i) => ({ code: `T${i + 1}`, name: d.topics.find((t) => t.id === s.topicId)?.name.en ?? s.topicId }));
  const aliases: Record<string, ID> = {};
  const attention = studentsNeedingAttention(d, batchIds, ctx)
    .slice(0, 8)
    .map((a, i) => {
      const id = pseudonym(i);
      aliases[id] = a.studentId;
      return { id, reasons: a.reasons, mastery: round(a.mastery), attendancePct: a.attendancePct };
    });
  const subjectNames = subjectIdsOf(d, batchIds).map((id) => d.subjects.find((s) => s.id === id)?.name.en ?? id);
  const levels = [...new Set(d.batches.filter((b) => batchIds.includes(b.id)).map((b) => b.level))];
  const sessions = d.sessions.filter((s) => batchIds.includes(s.batchId) && s.date <= ctx.today).sort((a, b) => a.date.localeCompare(b.date)).slice(-3);

  return {
    payload: {
      classes: levels.flatMap((l) => subjectNames.map((s) => `${l} · ${s}`)).slice(0, 6),
      studentCount: studentsInBatches(d, batchIds).length,
      attendancePct: attendanceRate(d, { batchIds, from: rangeStart('4w', ctx.today), to: ctx.today }).pct,
      understandingAvg: sessions.length ? Math.round((mean(sessions.map((s) => s.understanding)) ?? 0) * 10) / 10 : null,
      topics: stats.map((s, i) => ({ code: `T${i + 1}`, name: topicRefs[i].name, weakPct: s.redPct, avgMastery: round(s.avgMastery), trend: s.trend })),
      attention,
    },
    topicRefs,
    aliases,
  };
}

export interface StudentPayload {
  subjects: {
    subject: string;
    overall: number | null;
    topics: { code: string; name: string; mastery: number | null; trend: string }[];
  }[];
  attendancePct: number | null;
  goals: { subject: string; targetPercent: number; currentPercent: number | null; status: string }[];
  dailyMinutes: number;
  studyDaysPerWeek: number;
}
export interface StudentAiInput {
  payload: StudentPayload;
  topicRefs: TopicRef[];
}

export function buildStudentInput(d: AppData, studentId: ID, ctx: Ctx, opts: { subjectId?: ID } = {}): StudentAiInput {
  const student = d.students.find((s) => s.id === studentId);
  if (!student) throw new Error(`Unknown student ${studentId}`);
  const insight = studentInsight(d, studentId, ctx, opts);
  const topicRefs: TopicRef[] = [];
  const subjectIds = [...new Set(studentTopicMastery(d, studentId, { today: ctx.today, subjectIds: opts.subjectId ? [opts.subjectId] : undefined }).map((m) => m.subjectId))];

  const subjects = subjectIds.map((subjectId) => {
    const ms = studentTopicMastery(d, studentId, { today: ctx.today, subjectIds: [subjectId] }).filter((m) => m.mastery !== null);
    const overall = mean(ms.map((m) => m.mastery as number));
    return {
      subject: d.subjects.find((s) => s.id === subjectId)?.name.en ?? subjectId,
      overall: round(overall),
      topics: ms.slice(0, 12).map((m) => {
        const code = `T${topicRefs.length + 1}`;
        topicRefs.push({ code, name: d.topics.find((t) => t.id === m.topicId)?.name.en ?? m.topicId });
        return { code, name: topicRefs[topicRefs.length - 1].name, mastery: round(m.mastery), trend: m.trend };
      }),
    };
  });

  return {
    payload: {
      subjects,
      attendancePct: insight.attendancePct,
      goals: insight.goals.map((g) => ({
        subject: d.subjects.find((s) => s.id === g.subjectId)?.name.en ?? g.subjectId,
        targetPercent: g.target,
        currentPercent: round(g.current),
        status: g.status,
      })),
      dailyMinutes: student.dailyMinutes,
      studyDaysPerWeek: student.studyDays.length,
    },
    topicRefs,
  };
}

export const languageName = (lang: Lang): string => (lang === 'bn' ? 'Bangla (Bengali)' : 'English');
