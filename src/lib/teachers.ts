// Several teachers in one center or school (brief §23). Plain functions, no UI.
import type { AppData, ID, Teacher } from '@/types';
import { DEMO_TEACHERS } from '@/data/seed';
import { attendanceRate, rangeStart } from './attendance';
import { batchTopicStats, scopeSummary, studentsNeedingAttention, type Ctx } from './batch';
import { studentsInBatches, subjectIdsOf } from './scope';

/** Plan sizes by number of students (planned, not final). */
export const SOLO_MAX = 60;
export const CENTER_MAX = 300;
export type SizeTier = 'solo' | 'center' | 'school';

export const tierFor = (students: number): SizeTier => (students <= SOLO_MAX ? 'solo' : students <= CENTER_MAX ? 'center' : 'school');

/** v1 → v2 data migration: everyone gets an owner teacher; the sample batches also get the sample teachers. */
export function addTeachers(raw: unknown): AppData {
  const d = raw as AppData & { teachers?: Teacher[] };
  if (d.teachers?.length) return d as AppData;
  const hasSample = ['b_math10', 'b_phy9', 'b_eng10'].every((id) => d.batches?.some((b) => b.id === id));
  if (hasSample) {
    const owners: Record<string, ID> = { b_math10: 't_himel', b_phy9: 't_nasrin', b_eng10: 't_karim' };
    return { ...d, teachers: DEMO_TEACHERS.map((t) => ({ ...t })), batches: d.batches.map((b) => ({ ...b, teacherId: b.teacherId ?? owners[b.id] })) };
  }
  const owner: Teacher = { id: 't_owner', name: d.profile?.teacherName?.en ?? 'Teacher', nameBn: d.profile?.teacherName?.bn };
  return { ...d, teachers: [owner], batches: (d.batches ?? []).map((b) => ({ ...b, teacherId: b.teacherId ?? owner.id })) };
}

export interface TeacherSummary {
  teacher: Teacher;
  batchIds: ID[];
  students: number;
  attendancePct: number | null;
  avgMastery: number | null;
  attention: number;
  /** the topic most of this teacher's students are weak in */
  weakestTopicId: ID | null;
  /** classes logged so far, and the subjects taught now */
  classesTaught: number;
  subjectIds: ID[];
  lastClass: string | null;
  situation: Situation;
}

export type Situation = 'good' | 'ok' | 'help' | 'none';

/** One plain word for how a set of batches is doing: mastery and attendance together. */
export function situationOf(mastery: number | null, attendance: number | null): Situation {
  if (mastery === null) return 'none';
  if (mastery < 50 || (attendance !== null && attendance < 60)) return 'help';
  if (mastery >= 70 && (attendance === null || attendance >= 80)) return 'good';
  return 'ok';
}

/** Classes logged up to today for these batches, newest date last. */
export function classesLogged(d: AppData, batchIds: ID[], today: string) {
  const dates = d.sessions.filter((x) => batchIds.includes(x.batchId) && x.date <= today).map((x) => x.date).sort();
  return { count: dates.length, last: dates.length ? dates[dates.length - 1] : null };
}

export function teacherSummaries(d: AppData, ctx: Ctx): TeacherSummary[] {
  return d.teachers.map((teacher) => {
    const batchIds = d.batches.filter((b) => b.teacherId === teacher.id).map((b) => b.id);
    if (batchIds.length === 0) return { teacher, batchIds, students: 0, attendancePct: null, avgMastery: null, attention: 0, weakestTopicId: null, classesTaught: 0, subjectIds: [], lastClass: null, situation: 'none' as Situation };
    const s = scopeSummary(d, batchIds, ctx);
    const top = batchTopicStats(d, batchIds, ctx).find((x) => x.withData > 0 && x.redPct > 0);
    const attendancePct = attendanceRate(d, { batchIds, from: rangeStart('4w', ctx.today), to: ctx.today }).pct;
    const logged = classesLogged(d, batchIds, ctx.today);
    return {
      teacher,
      batchIds,
      students: studentsInBatches(d, batchIds).length,
      attendancePct,
      avgMastery: s.avgMastery,
      attention: studentsNeedingAttention(d, batchIds, ctx).length,
      weakestTopicId: top?.topicId ?? null,
      classesTaught: logged.count,
      subjectIds: subjectIdsOf(d, batchIds),
      lastClass: logged.last,
      situation: situationOf(s.avgMastery, attendancePct),
    };
  });
}

/** Batches with no teacher yet. */
export const unassignedBatches = (d: AppData) => d.batches.filter((b) => !b.teacherId || !d.teachers.some((t) => t.id === b.teacherId));
