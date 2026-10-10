// Parent report (brief D10): marks, attendance, fees and one suggestion, as data and as plain text.
// The text is written for WhatsApp: short lines, no markup, in English or Bangla.
import type { AppData, ID, Lang } from '@/types';
import { translate, type TKey } from '@/i18n';
import { formatMonth, formatNumber } from '@/i18n/format';
import { attendanceRate } from './attendance';
import { daysInMonth } from './dates';
import { feesFor, feeStatus, type FeeStatus } from './fees';
import { studentInsight, type NextStep } from './insights';
import { studentPct } from './marks';
import { bandOf, overallMastery, studentTopicMastery, type Band } from './mastery';
import { nameOf } from './names';
import { studentSubjectIds } from './scope';

export interface ReportOptions {
  /** the month the report is about, YYYY-MM */
  month: string;
  today: string;
  includeMarks: boolean;
  includeFees: boolean;
  /** the teacher's own words, printed at the end */
  teacherNote: string;
}

export interface SubjectLine {
  subjectId: ID;
  mastery: number | null;
  band: Band;
  strengths: ID[];
  weak: ID[];
  exams: { assessmentId: ID; pct: number }[];
}
export interface FeeLine {
  batchId: ID;
  due: number;
  paid: number;
  status: FeeStatus;
}
export interface Report {
  studentId: ID;
  options: ReportOptions;
  overall: number | null;
  subjects: SubjectLine[];
  attendance: { pct: number | null; attended: number; total: number };
  fees: FeeLine[];
  suggestion: NextStep | null;
}

export function buildReport(d: AppData, studentId: ID, o: ReportOptions): Report {
  const student = d.students.find((s) => s.id === studentId);
  if (!student) throw new Error(`Unknown student ${studentId}`);
  const monthStart = `${o.month}-01`;
  const monthEnd = `${o.month}-${String(daysInMonth(o.month)).padStart(2, '0')}`;

  const subjects: SubjectLine[] = studentSubjectIds(d, studentId).map((subjectId) => {
    const ms = studentTopicMastery(d, studentId, { today: o.today, subjectIds: [subjectId] });
    const known = ms.filter((m) => m.mastery !== null);
    const mastery = overallMastery(ms);
    return {
      subjectId,
      mastery,
      band: bandOf(mastery),
      strengths: known.filter((m) => m.band === 'green').sort((a, b) => (b.mastery as number) - (a.mastery as number)).slice(0, 2).map((m) => m.topicId),
      weak: known.filter((m) => m.band === 'red').sort((a, b) => (a.mastery as number) - (b.mastery as number)).slice(0, 2).map((m) => m.topicId),
      exams: d.assessments
        .filter((a) => a.subjectId === subjectId && a.date >= monthStart && a.date <= monthEnd && a.date <= o.today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap((a) => {
          const pct = studentPct(a, studentId);
          return pct === null ? [] : [{ assessmentId: a.id, pct }];
        }),
    };
  });

  const to = o.today < monthEnd ? o.today : monthEnd;
  const att = attendanceRate(d, { batchIds: student.batchIds, studentId, from: monthStart, to });
  const fees = feesFor(d, { batchIds: student.batchIds, studentId, month: o.month }).map((f) => ({
    batchId: f.batchId,
    due: f.due,
    paid: f.paid,
    status: feeStatus(f, o.today),
  }));

  return {
    studentId,
    options: o,
    overall: meanOf(subjects.map((s) => s.mastery)),
    subjects,
    attendance: { pct: att.pct, attended: att.attended, total: att.total },
    fees,
    suggestion: studentInsight(d, studentId, { today: o.today }).nextSteps[0] ?? null,
  };
}

function meanOf(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** The report as WhatsApp-ready text in the chosen language. */
export function reportToText(d: AppData, r: Report, lang: Lang, banglaNumerals: boolean): string {
  const t = (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  const n = (v: number) => formatNumber(Math.round(v), lang, banglaNumerals);
  const money = (v: number) => `৳${formatNumber(v, lang, banglaNumerals)}`;
  const student = d.students.find((s) => s.id === r.studentId)!;
  const topic = (id: ID) => d.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const subject = (id: ID) => d.subjects.find((x) => x.id === id)?.name[lang] ?? id;
  const batch = (id: ID) => {
    const b = d.batches.find((x) => x.id === id);
    return b ? nameOf(b, lang) : '';
  };
  const exam = (id: ID) => {
    const a = d.assessments.find((x) => x.id === id);
    return a ? (lang === 'bn' && a.nameBn ? a.nameBn : a.name) : id;
  };
  const first = nameOf(student, lang).split(' ')[0];
  const lines: string[] = [];

  lines.push(d.profile.centerName[lang], t('report.text.title', { month: formatMonth(r.options.month, lang, banglaNumerals) }), `${nameOf(student, lang)} (${student.className})`);

  if (r.options.includeMarks && r.subjects.some((s) => s.mastery !== null)) {
    lines.push('', t('report.text.marks'));
    for (const s of r.subjects) {
      if (s.mastery === null) continue;
      lines.push(`• ${subject(s.subjectId)}: ${n(s.mastery)}% (${t(`mastery.${s.band}` as TKey)})`);
      if (s.strengths.length) lines.push(`  ${t('report.text.strong', { topics: s.strengths.map(topic).join(', ') })}`);
      if (s.weak.length) lines.push(`  ${t('report.text.weak', { topics: s.weak.map(topic).join(', ') })}`);
      for (const e of s.exams) lines.push(`  ${exam(e.assessmentId)}: ${n(e.pct)}%`);
    }
  }

  if (r.attendance.pct !== null) {
    lines.push('', t('report.text.attendance'), `• ${t('report.text.attendanceLine', { pct: n(r.attendance.pct), a: n(r.attendance.attended), total: n(r.attendance.total) })}`);
  }

  if (r.options.includeFees && r.fees.length) {
    lines.push('', t('report.text.fees'));
    for (const f of r.fees) lines.push(`• ${batch(f.batchId)}: ${t('report.text.feeLine', { paid: money(f.paid), due: money(f.due), status: t(`fee.${f.status}` as TKey) })}`);
  }

  if (r.suggestion) {
    const s = r.suggestion;
    const text =
      s.type === 'practice' ? t('report.suggest.practice', { name: first, topic: topic(s.topicId) })
      : s.type === 'attendance' ? t('report.suggest.attendance', { name: first, pct: n(s.pct) })
      : s.type === 'goal' ? t('report.suggest.goal', { name: first, subject: subject(s.subjectId) })
      : t('report.suggest.protect', { name: first, topic: topic(s.topicId) });
    lines.push('', t('report.text.suggestion'), text);
  }

  if (r.options.teacherNote.trim()) lines.push('', t('report.text.note'), r.options.teacherNote.trim());
  lines.push('', `— ${d.profile.teacherName[lang]}`);
  return lines.join('\n');
}
