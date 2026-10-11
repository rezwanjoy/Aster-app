// Domain types for Aster (brief §7, updated by §23).
// Dates are ISO strings: day = "YYYY-MM-DD", month = "YYYY-MM".

export type ID = string;
export type Lang = 'en' | 'bn';
export type L10n = { en: string; bn: string };

export interface Profile {
  teacherName: L10n;
  centerName: L10n;
  profession: L10n;
  phone?: string;
  /** Centers can choose to track what they pay their teachers. Off by default. */
  trackSalaries?: boolean;
}

export interface Term {
  id: ID;
  name: string;
  nameBn?: string;
  startDate: string;
  endDate: string;
}

export interface Subject {
  id: ID;
  name: L10n;
  level: string; // e.g. "Class 10"
}

export interface Topic {
  id: ID;
  subjectId: ID;
  name: L10n;
  order: number;
}

/** A teacher who works at the center or school (the owner is one of them). */
export interface Teacher {
  id: ID;
  name: string;
  nameBn?: string;
  phone?: string;
  /** what the center pays this teacher each month, in taka (optional) */
  monthlySalary?: number;
}

/** One teacher's salary paid for one month. */
export interface SalaryPayment {
  id: ID;
  teacherId: ID;
  month: string; // YYYY-MM
  amount: number;
  paidOn: string; // YYYY-MM-DD
}

export interface Batch {
  id: ID;
  /** who teaches it (optional: solo tutors don't need it) */
  teacherId?: ID;
  name: string;
  nameBn?: string;
  subjectIds: ID[];
  level: string;
  termId: ID;
  classDays: number[]; // 0 = Sunday … 6 = Saturday
  startTime?: string; // "HH:mm"
  monthlyFee: number;
}

export interface Student {
  id: ID;
  name: string;
  nameBn?: string;
  className: string; // e.g. "Class 10"
  batchIds: ID[];
  guardianName?: string;
  guardianPhone?: string;
  studyDays: number[]; // 0–6
  dailyMinutes: number; // default 15
}

/** One goal per student per subject. */
export interface Goal {
  id: ID;
  studentId: ID;
  subjectId: ID;
  targetPercent: number;
  targetLabel: string; // e.g. "A+"
  byDate?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface ClassSession {
  id: ID;
  batchId: ID;
  date: string;
  topicIds: ID[];
  understanding: 1 | 2 | 3 | 4 | 5;
  homework?: string;
  notes?: string;
  attendance: Record<ID, AttendanceStatus>; // by studentId
}

export interface Assessment {
  id: ID;
  batchId: ID;
  subjectId: ID;
  name: string;
  nameBn?: string;
  date: string; // a future date = an upcoming exam on the calendar
  parts: { topicId: ID; maxMarks: number }[];
  scores: Record<ID, Record<ID, number | null>>; // studentId → topicId → marks
}

export interface FeeRecord {
  id: ID;
  studentId: ID;
  batchId: ID;
  month: string; // YYYY-MM
  due: number;
  paid: number;
  paidOn?: string;
  note?: string;
}

export type TaskKind = 'learn' | 'practice' | 'review' | 'custom';
export interface PlanTask {
  id: ID;
  date: string;
  kind: TaskKind;
  topicId?: ID; // absent for custom tasks
  title?: string; // used by custom tasks the student adds
  minutes: number;
  done: boolean;
  /** Day the task was completed (drives streaks and spaced review); falls back to `date`. */
  doneOn?: string;
  /** Why it was planned: "red" | "yellow" | "spaced" | "new" (localized in the UI). */
  reason?: string;
}
export interface StudyPlan {
  id: ID;
  studentId: ID;
  createdAt: string;
  weekStart: string;
  tasks: PlanTask[];
  aiNote?: string;
}

export interface CalendarEvent {
  id: ID;
  date: string;
  title: string;
  kind: 'holiday' | 'event';
  batchId?: ID; // absent = whole center
}

/** In-app message (stored on this device; demo has no backend). */
export interface Message {
  id: ID;
  studentId: ID;
  batchId: ID;
  body: string;
  sentAt: string; // ISO timestamp
  readAt?: string;
}

export interface InterestEvent {
  feature: string;
  type: 'view' | 'tap_unlock' | 'would_pay';
  at: string;
  priceChoice?: string;
}

/** Everything the user owns. Persisted as one versioned document. */
export interface AppData {
  profile: Profile;
  terms: Term[];
  currentTermId: ID;
  subjects: Subject[];
  topics: Topic[];
  teachers: Teacher[];
  salaries: SalaryPayment[];
  batches: Batch[];
  students: Student[];
  goals: Goal[];
  sessions: ClassSession[];
  assessments: Assessment[];
  fees: FeeRecord[];
  plans: StudyPlan[];
  events: CalendarEvent[];
  messages: Message[];
  interest: InterestEvent[];
}

/** Collections that are plain arrays of `{ id }` records. */
export type CollectionKey =
  | 'teachers' | 'salaries' | 'terms' | 'subjects' | 'topics' | 'batches' | 'students' | 'goals'
  | 'sessions' | 'assessments' | 'fees' | 'plans' | 'events' | 'messages';

/* ───────── Settings (device preferences; not part of the school data) ───────── */

export type Theme = 'light' | 'dark' | 'system';
export type Mode = 'teacher' | 'center' | 'student';
export type GradingScale = 'percent' | 'gpa5' | 'letter';
export interface GradeBand {
  /** lowest percentage that earns this grade */
  min: number;
  letter: string;
  gpa: number;
}

export interface Settings {
  lang: Lang;
  theme: Theme;
  banglaNumerals: boolean;
  mode: Mode;
  /** Set when someone signs in as a student: they cannot open the teacher side. */
  lockedRole?: Mode;
  /** Has this device picked a role on the welcome screen yet? */
  welcomed: boolean;
  /** Which student is "using Aster" in Student mode. */
  activeStudentId?: ID;
  /** Global teacher batch switcher; "all" = every batch. */
  batchFilter: ID | 'all';
  gradingScale: GradingScale;
  /** the teacher's own grade table (letter, GPA and the lowest % for each grade) */
  gradeBands: GradeBand[];
  masteryBands: { redBelow: number; greenFrom: number };
  reportStyle: { accent: string; teacherMessage: string };
  reminderTemplate: L10n; // placeholders: {student} {amount} {month} {center}
  ai: {
    /** only part of the saved-answer cache key; the server picks the real model */
    model: string;
    /** the teacher has read and accepted the data notice (asked once, before the first AI call) */
    consented: boolean;
    /** free AI insights used this month (counted only when a request is actually sent) */
    usage: { month: string; count: number };
  };
  teacherPin?: string; // demo-level lock, not real security
}
