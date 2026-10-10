// Deterministic demo data (brief §13 + §23). Same output for the same reference date.
// Story: ~60% of Class 10 Math is red in Quadratic Equations; Tanvir is slipping
// (marks and attendance); two students have overdue fees; Rafi is the student persona.
import type {
  Teacher,
  AppData, Assessment, AttendanceStatus, Batch, ClassSession, FeeRecord, Goal, ID, PlanTask, Student, StudyPlan, Subject, Topic,
} from '@/types';
import { addDays, addMonths, dayInMonth, eachDay, monthOf, weekdayOf } from '@/lib/dates';
import { createRng, type Rng } from '@/lib/prng';
import { toBanglaDigits } from '@/i18n/format';
import { NAMES, SUBJECT_PRESETS } from './presets';

const SEED = 20261008;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The sample teachers at Aster Demo Academy. Himel Bhai is the owner. */
export const DEMO_TEACHERS: Teacher[] = [
  { id: 't_himel', name: 'Himel Bhai', nameBn: 'হিমেল ভাই', phone: '01000-000000', monthlySalary: 20000 },
  { id: 't_nasrin', name: 'Nasrin Madam', nameBn: 'নাসরিন ম্যাডাম', monthlySalary: 15000 },
  { id: 't_karim', name: 'Karim Sir', nameBn: 'করিম স্যার', monthlySalary: 12000 },
];

export function emptyData(): AppData {
  return {
    profile: {
      teacherName: { en: 'Teacher', bn: 'শিক্ষক' },
      centerName: { en: 'My Coaching Center', bn: 'আমার কোচিং সেন্টার' },
      profession: { en: 'Teacher', bn: 'শিক্ষক' },
    },
    terms: [{ id: 'term_1', name: 'Current term', startDate: '2026-01-01', endDate: '2026-12-31' }],
    currentTermId: 'term_1',
    subjects: [], topics: [], teachers: [], salaries: [], batches: [], students: [], goals: [], sessions: [], assessments: [],
    fees: [], plans: [], events: [], messages: [], interest: [],
  };
}

export function generateSeed(refDate: string): AppData {
  const rng = createRng(SEED);
  const year = refDate.slice(0, 4);

  /* ── term ── */
  const term = {
    id: 'term_2',
    name: `Semester 2 · ${year}`,
    nameBn: `দ্বিতীয় সেমিস্টার · ${toBanglaDigits(year)}`,
    startDate: addDays(refDate, -56),
    endDate: addDays(refDate, 70),
  };

  /* ── subjects & topics ── */
  const subjects: Subject[] = [];
  const topics: Topic[] = [];
  for (const sp of SUBJECT_PRESETS) {
    subjects.push({ id: `sub_${sp.key}`, name: sp.name, level: sp.level });
    sp.topics.forEach((tp, i) => topics.push({ id: `tp_${tp.key}`, subjectId: `sub_${sp.key}`, name: tp.name, order: i }));
  }
  const topicIdsOf = (subKey: string) => topics.filter((t) => t.subjectId === `sub_${subKey}`).map((t) => t.id);

  /* ── teachers (the center owner is Himel Bhai) ── */
  const teachers: Teacher[] = DEMO_TEACHERS.map((t) => ({ ...t }));

  /* ── batches ── */
  const batches: Batch[] = [
    { id: 'b_math10', teacherId: 't_himel', name: 'Class 10 Mathematics', nameBn: 'দশম শ্রেণি গণিত', subjectIds: ['sub_math'], level: 'Class 10', termId: term.id, classDays: [0, 2, 4], startTime: '18:00', monthlyFee: 1500 },
    { id: 'b_phy9', teacherId: 't_nasrin', name: 'Class 9 Physics', nameBn: 'নবম শ্রেণি পদার্থবিজ্ঞান', subjectIds: ['sub_phy'], level: 'Class 9', termId: term.id, classDays: [1, 3], startTime: '17:00', monthlyFee: 1200 },
    { id: 'b_eng10', teacherId: 't_karim', name: 'Class 10 English', nameBn: 'দশম শ্রেণি ইংরেজি', subjectIds: ['sub_eng'], level: 'Class 10', termId: term.id, classDays: [6, 3], startTime: '16:30', monthlyFee: 1000 },
  ];

  /* ── students (27 people; Rafi, Nusrat and Sabbir are in two batches) ── */
  const students: Student[] = [];
  const phone = (n: number) => `01000-000${String(n).padStart(3, '0')}`;
  const mk = (n: number, en: string, bn: string, cls: string, batchIds: ID[]): Student => ({
    id: `s_${String(n).padStart(2, '0')}`, name: en, nameBn: bn, className: cls, batchIds,
    guardianName: `Guardian of ${en.split(' ')[0]}`, guardianPhone: phone(n), studyDays: [0, 1, 2, 3, 4], dailyMinutes: 15,
  });
  let n = 0;
  const alsoEnglish = new Set(['Rafi Ahmed', 'Nusrat Jahan', 'Sabbir Khan']);
  NAMES.math.forEach(([en, bn]) => students.push(mk(++n, en, bn, 'Class 10', alsoEnglish.has(en) ? ['b_math10', 'b_eng10'] : ['b_math10'])));
  NAMES.phy.forEach(([en, bn]) => students.push(mk(++n, en, bn, 'Class 9', ['b_phy9'])));
  NAMES.eng.forEach(([en, bn]) => students.push(mk(++n, en, bn, 'Class 10', ['b_eng10'])));
  const byName = (en: string) => students.find((s) => s.name === en)!;
  const inBatch = (batchId: ID) => students.filter((s) => s.batchIds.includes(batchId));
  const rafi = byName('Rafi Ahmed');

  /* ── class sessions: the last 16 class days before today, per batch ── */
  const sessions: ClassSession[] = [];
  const taught: Record<string, string[]> = {
    b_math10: ['real', 'sets', 'alg', 'exp', 'quad', 'quad', 'sim', 'tri', 'circ', 'trig', 'mens', 'quad', 'trig', 'circ', 'stat', 'mens'],
    b_phy9: ['motion', 'motion', 'force', 'force', 'work', 'work', 'heat', 'heat', 'light', 'light', 'elec', 'elec', 'motion', 'force', 'work', 'heat'],
    b_eng10: ['tenses', 'tenses', 'articles', 'preps', 'preps', 'voice', 'voice', 'narr', 'narr', 'para', 'tenses', 'voice', 'para', 'articles', 'narr', 'preps'],
  };
  for (const b of batches) {
    const days = eachDay(addDays(refDate, -63), addDays(refDate, -1)).filter((d) => b.classDays.includes(weekdayOf(d))).slice(-16);
    const members = inBatch(b.id);
    days.forEach((date, i) => {
      const key = taught[b.id][i % taught[b.id].length];
      const attendance: Record<ID, AttendanceStatus> = {};
      for (const s of members) attendance[s.id] = attendanceFor(rng, s.name, i, days.length);
      sessions.push({
        id: `c_${b.id}_${String(i + 1).padStart(2, '0')}`, batchId: b.id, date, topicIds: [`tp_${key}`],
        understanding: (key === 'quad' ? rng.int(2, 3) : rng.int(3, 5)) as 2 | 3 | 4 | 5,
        homework: rng.chance(0.6) ? `Exercise ${rng.int(2, 9)}.${rng.int(1, 4)}` : undefined,
        attendance,
      });
    });
  }

  /* ── assessments & marks ── */
  const assessments: Assessment[] = [];
  const MATH_TESTS = [
    ['real', 'sets', 'alg', 'exp'], ['alg', 'exp', 'quad', 'sim'], ['quad', 'sim', 'tri', 'circ'], ['trig', 'circ', 'mens', 'quad'], ['quad', 'trig', 'mens', 'stat'],
  ];
  const MATH_OFFSETS = [-52, -38, -24, -12, -3];
  const redInQuad = new Set(['Rafi Ahmed', 'Farhana Islam', 'Maliha Akter', 'Tanvir Hasan', 'Sabbir Khan', 'Arif Chowdhury', 'Mim Akter']);
  const ability: Record<string, number> = {
    'Nusrat Jahan': 82, 'Farhana Islam': 66, 'Maliha Akter': 52, 'Tanvir Hasan': 47, 'Sabbir Khan': 58, 'Tasnim Rahman': 74,
    'Imran Hossain': 70, 'Sadia Sultana': 77, 'Arif Chowdhury': 68, 'Mim Akter': 63, 'Shakib Mahmud': 79,
  };
  const RAFI_TOPIC: Record<string, number> = { real: 88, sets: 72, alg: 70, exp: 61, quad: 38, sim: 64, tri: 66, circ: 55, trig: 42, mens: 74, stat: 79 };
  const MATH_OFFSET: Record<string, number> = { real: 14, sets: 3, alg: 4, exp: -5, sim: -2, tri: 0, circ: -10, trig: -14, mens: 8, stat: 10 };

  const mathPct = (s: Student, key: string, t: number): number => {
    const noise = rng.int(-4, 4);
    if (s.name === 'Rafi Ahmed') return RAFI_TOPIC[key] + (t - 4) * 2 + noise;
    if (key === 'quad') return redInQuad.has(s.name) ? 28 + rng.int(0, 18) : 60 + rng.int(0, 22);
    if (s.name === 'Tanvir Hasan') return 72 - t * 9 + MATH_OFFSET[key] * 0.4 + noise; // clearly slipping, test after test
    return (ability[s.name] ?? 65) + MATH_OFFSET[key] + (t - 2) * 1.5 + noise * 1.5;
  };

  MATH_TESTS.forEach((keys, t) => {
    const parts = keys.map((k) => ({ topicId: `tp_${k}`, maxMarks: 10 }));
    const scores: Assessment['scores'] = {};
    for (const s of inBatch('b_math10')) {
      scores[s.id] = Object.fromEntries(keys.map((k) => [`tp_${k}`, Math.round((clamp(mathPct(s, k, t), 5, 98) / 100) * 10)]));
    }
    assessments.push({
      id: `a_math_${t + 1}`, batchId: 'b_math10', subjectId: 'sub_math', name: `Class Test ${t + 1}`, nameBn: `ক্লাস টেস্ট ${toBanglaDigits(String(t + 1))}`,
      date: addDays(refDate, MATH_OFFSETS[t]), parts, scores,
    });
  });
  const genericTests = (batchId: ID, subKey: string, tests: string[][], offsets: number[], label: [string, string]) => {
    tests.forEach((keys, t) => {
      const scores: Assessment['scores'] = {};
      for (const s of inBatch(batchId)) {
        const base = 52 + ((s.id.charCodeAt(2) * 7 + s.id.charCodeAt(3) * 13) % 36); // stable per student
        scores[s.id] = Object.fromEntries(
          keys.map((k) => [`tp_${k}`, Math.round((clamp(base + rng.int(-12, 12) + t * 1.5, 5, 98) / 100) * 10)]),
        );
      }
      assessments.push({
        id: `a_${subKey}_${t + 1}`, batchId, subjectId: `sub_${subKey}`, name: `${label[0]} ${t + 1}`, nameBn: `${label[1]} ${toBanglaDigits(String(t + 1))}`,
        date: addDays(refDate, offsets[t]), parts: keys.map((k) => ({ topicId: `tp_${k}`, maxMarks: 10 })), scores,
      });
    });
  };
  genericTests('b_phy9', 'phy', [['motion', 'force'], ['force', 'work'], ['heat', 'light'], ['elec', 'work', 'motion']], [-45, -31, -17, -5], ['Unit Test', 'ইউনিট টেস্ট']);
  genericTests('b_eng10', 'eng', [['tenses', 'articles'], ['preps', 'voice'], ['narr', 'para'], ['tenses', 'voice', 'para']], [-48, -34, -20, -6], ['Class Test', 'ক্লাস টেস্ট']);

  // Upcoming exams (no marks yet): these show on the calendar
  assessments.push(
    { id: 'a_math_model', batchId: 'b_math10', subjectId: 'sub_math', name: 'Model Test', nameBn: 'মডেল টেস্ট', date: addDays(refDate, 12), parts: ['quad', 'trig', 'circ', 'mens'].map((k) => ({ topicId: `tp_${k}`, maxMarks: 10 })), scores: {} },
    { id: 'a_phy_mid', batchId: 'b_phy9', subjectId: 'sub_phy', name: 'Mid-term Exam', nameBn: 'মধ্যবর্তী পরীক্ষা', date: addDays(refDate, 20), parts: topicIdsOf('phy').slice(0, 4).map((id) => ({ topicId: id, maxMarks: 10 })), scores: {} },
  );

  /* ── fees: previous + current month ── */
  const prev = addMonths(monthOf(refDate), -1);
  const cur = monthOf(refDate);
  const fees: FeeRecord[] = [];
  for (const b of batches) {
    for (const s of inBatch(b.id)) {
      const paidPrev = ['Tanvir Hasan', 'Sabbir Khan'].includes(s.name) ? 0 : b.monthlyFee;
      let paidCur = rng.chance(0.7) ? b.monthlyFee : 0;
      if (['Tanvir Hasan', 'Sabbir Khan', 'Maliha Akter'].includes(s.name)) paidCur = 0;
      if (s.name === 'Farhana Islam') paidCur = 800;
      fees.push(
        { id: `f_${s.id}_${b.id}_${prev}`, studentId: s.id, batchId: b.id, month: prev, due: b.monthlyFee, paid: paidPrev, paidOn: paidPrev ? dayInMonth(prev, 8) : undefined },
        { id: `f_${s.id}_${b.id}_${cur}`, studentId: s.id, batchId: b.id, month: cur, due: b.monthlyFee, paid: paidCur, paidOn: paidCur ? dayInMonth(cur, 6) : undefined },
      );
    }
  }

  /* ── goals: one per student in their first subject; Rafi has two ── */
  const goals: Goal[] = [];
  students.forEach((s, i) => {
    const b = batches.find((x) => x.id === s.batchIds[0])!;
    const high = s.name === 'Rafi Ahmed' || i % 2 === 0;
    goals.push({ id: `g_${s.id}_${b.subjectIds[0]}`, studentId: s.id, subjectId: b.subjectIds[0], targetPercent: high ? 80 : 70, targetLabel: high ? 'A+' : 'A', byDate: `${year}-12-31` });
  });
  goals.push({ id: `g_${rafi.id}_sub_eng`, studentId: rafi.id, subjectId: 'sub_eng', targetPercent: 75, targetLabel: 'A', byDate: `${year}-12-31` });

  /* ── Rafi's plan: a 3-day streak and today's tasks ── */
  const task = (date: string, i: number, kind: PlanTask['kind'], key: string, minutes: number, done: boolean, reason: string): PlanTask => ({
    id: `pt_${date}_${i}`, date, kind, topicId: `tp_${key}`, minutes, done, reason,
  });
  const y2 = addDays(refDate, -2), y1 = addDays(refDate, -1);
  // Every day totals Rafi's 15 minutes (planned in 5-minute slots).
  const tasks: PlanTask[] = [
    task(y2, 1, 'practice', 'quad', 10, true, 'red'), task(y2, 2, 'review', 'real', 5, true, 'spaced'),
    task(y1, 1, 'learn', 'trig', 10, true, 'red'), task(y1, 2, 'practice', 'circ', 5, true, 'yellow'),
    task(refDate, 1, 'practice', 'quad', 5, true, 'red'), task(refDate, 2, 'learn', 'trig', 5, false, 'red'),
    task(refDate, 3, 'review', 'real', 5, false, 'spaced'),
  ];
  const cycle: Array<[string, string]> = [['quad', 'circ'], ['trig', 'exp'], ['quad', 'circ'], ['trig', 'exp']];
  cycle.forEach(([red, yellow], i) => {
    const date = addDays(refDate, i + 1);
    tasks.push(task(date, 1, 'practice', red, 10, false, 'red'), task(date, 2, 'practice', yellow, 5, false, 'yellow'));
  });
  const plans: StudyPlan[] = [{ id: `plan_${rafi.id}`, studentId: rafi.id, createdAt: refDate, weekStart: y2, tasks }];

  return {
    profile: {
      teacherName: { en: 'Himel Bhai', bn: 'হিমেল ভাই' },
      centerName: { en: 'Aster Demo Academy', bn: 'অ্যাস্টার ডেমো অ্যাকাডেমি' },
      profession: { en: 'Mathematics & Physics Teacher', bn: 'গণিত ও পদার্থবিজ্ঞান শিক্ষক' },
      phone: '01000-000000',
    },
    terms: [term],
    currentTermId: term.id,
    subjects, topics, teachers, salaries: [], batches, students, goals, sessions, assessments, fees, plans,
    events: [{ id: 'ev_holiday', date: addDays(refDate, 9), title: 'Public holiday (no classes)', kind: 'holiday' }],
    messages: [
      { id: 'msg_seed_1', studentId: rafi.id, batchId: 'b_math10', body: 'Please revise Quadratic Equations before our next class. You are improving, keep going!', sentAt: `${y1}T10:00:00.000Z` },
    ],
    interest: [],
  };
}

function attendanceFor(rng: Rng, name: string, i: number, total: number): AttendanceStatus {
  const progress = i / Math.max(1, total - 1);
  let p = 0.94;
  if (name === 'Tanvir Hasan') p = 0.9 - progress * 0.55; // falling attendance
  if (name === 'Sabbir Khan') p = 0.7;
  if (name === 'Maliha Akter') p = 0.82;
  if (!rng.chance(p)) return 'absent';
  return rng.chance(0.08) ? 'late' : 'present';
}
