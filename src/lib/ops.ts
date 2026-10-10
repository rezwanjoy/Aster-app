// Pure operations on AppData. Each returns a NEW AppData (never mutates), and keeps
// references consistent (cascading deletes). The zustand store only calls these.
import type { AppData, Assessment, Batch, CollectionKey, ID, Message, PlanTask, Student, Topic } from '@/types';

let counter = 0;
/** Unique-enough id for locally created records. */
export function newId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

type WithId = { id: ID };
const isCollection = <K extends CollectionKey>(d: AppData, key: K) => d[key] as unknown as WithId[];

/* ───────── generic collection helpers ───────── */

export function upsert<K extends CollectionKey>(d: AppData, key: K, item: AppData[K][number]): AppData {
  const list = isCollection(d, key);
  const exists = list.some((x) => x.id === (item as WithId).id);
  const next = exists ? list.map((x) => (x.id === (item as WithId).id ? (item as WithId) : x)) : [...list, item as WithId];
  return { ...d, [key]: next };
}

export function patch<K extends CollectionKey>(d: AppData, key: K, id: ID, changes: Partial<AppData[K][number]>): AppData {
  const list = isCollection(d, key);
  return { ...d, [key]: list.map((x) => (x.id === id ? { ...x, ...changes } : x)) };
}

/** Remove one record from a simple collection (no cascades; use the dedicated remove* for those). */
export function removeById<K extends CollectionKey>(d: AppData, key: K, id: ID): AppData {
  return { ...d, [key]: isCollection(d, key).filter((x) => x.id !== id) };
}

/* ───────── cascading deletes ───────── */

export function removeStudent(d: AppData, studentId: ID): AppData {
  return {
    ...d,
    students: d.students.filter((s) => s.id !== studentId),
    goals: d.goals.filter((g) => g.studentId !== studentId),
    fees: d.fees.filter((f) => f.studentId !== studentId),
    plans: d.plans.filter((p) => p.studentId !== studentId),
    messages: d.messages.filter((m) => m.studentId !== studentId),
    sessions: d.sessions.map((s) => {
      if (!(studentId in s.attendance)) return s;
      const { [studentId]: _gone, ...rest } = s.attendance;
      return { ...s, attendance: rest };
    }),
    assessments: d.assessments.map((a) => {
      if (!(studentId in a.scores)) return a;
      const { [studentId]: _gone, ...rest } = a.scores;
      return { ...a, scores: rest };
    }),
  };
}

/** Removing a teacher leaves their batches without a teacher (the batches and students stay). */
export function removeTeacher(d: AppData, teacherId: ID): AppData {
  return {
    ...d,
    teachers: d.teachers.filter((t) => t.id !== teacherId),
    salaries: d.salaries.filter((p) => p.teacherId !== teacherId),
    batches: d.batches.map((b) => (b.teacherId === teacherId ? { ...b, teacherId: undefined } : b)),
  };
}

/** Students that would be left with no batch if `batchId` were deleted. */
export const studentsOnlyIn = (d: AppData, batchId: ID): Student[] =>
  d.students.filter((s) => s.batchIds.length > 0 && s.batchIds.every((b) => b === batchId));

/** Deleting a batch also removes its classes, exams, fees, messages and students who belong to no other batch. */
export function removeBatch(d: AppData, batchId: ID): AppData {
  const orphans = studentsOnlyIn(d, batchId).map((s) => s.id);
  let next: AppData = {
    ...d,
    batches: d.batches.filter((b) => b.id !== batchId),
    sessions: d.sessions.filter((s) => s.batchId !== batchId),
    assessments: d.assessments.filter((a) => a.batchId !== batchId),
    fees: d.fees.filter((f) => f.batchId !== batchId),
    messages: d.messages.filter((m) => m.batchId !== batchId),
    events: d.events.filter((e) => e.batchId !== batchId),
    students: d.students.map((s) => ({ ...s, batchIds: s.batchIds.filter((b) => b !== batchId) })),
  };
  for (const id of orphans) next = removeStudent(next, id);
  return next;
}

export function removeTopic(d: AppData, topicId: ID): AppData {
  return {
    ...d,
    topics: d.topics.filter((t) => t.id !== topicId),
    sessions: d.sessions.map((s) => ({ ...s, topicIds: s.topicIds.filter((t) => t !== topicId) })),
    assessments: d.assessments.map((a) => ({
      ...a,
      parts: a.parts.filter((p) => p.topicId !== topicId),
      scores: Object.fromEntries(
        Object.entries(a.scores).map(([sid, row]) => [sid, Object.fromEntries(Object.entries(row).filter(([tid]) => tid !== topicId))]),
      ),
    })),
    plans: d.plans.map((p) => ({ ...p, tasks: p.tasks.filter((t: PlanTask) => t.topicId !== topicId) })),
  };
}

/** Deleting a subject removes its topics, its exams and goals, and detaches it from batches. */
export function removeSubject(d: AppData, subjectId: ID): AppData {
  let next: AppData = d;
  for (const t of d.topics.filter((t) => t.subjectId === subjectId)) next = removeTopic(next, t.id);
  return {
    ...next,
    subjects: next.subjects.filter((s) => s.id !== subjectId),
    assessments: next.assessments.filter((a) => a.subjectId !== subjectId),
    goals: next.goals.filter((g) => g.subjectId !== subjectId),
    batches: next.batches.map((b) => ({ ...b, subjectIds: b.subjectIds.filter((s) => s !== subjectId) })),
  };
}

export function removeTerm(d: AppData, termId: ID): AppData {
  if (d.terms.length <= 1) return d; // always keep one term
  const terms = d.terms.filter((t) => t.id !== termId);
  const fallback = terms[terms.length - 1].id;
  return {
    ...d,
    terms,
    currentTermId: d.currentTermId === termId ? fallback : d.currentTermId,
    batches: d.batches.map((b) => (b.termId === termId ? { ...b, termId: fallback } : b)),
  };
}

/* ───────── batch / student membership ───────── */

export function addStudentToBatch(d: AppData, studentId: ID, batchId: ID): AppData {
  return {
    ...d,
    students: d.students.map((s) => (s.id === studentId && !s.batchIds.includes(batchId) ? { ...s, batchIds: [...s.batchIds, batchId] } : s)),
  };
}

export function removeStudentFromBatch(d: AppData, studentId: ID, batchId: ID): AppData {
  return {
    ...d,
    students: d.students.map((s) => (s.id === studentId ? { ...s, batchIds: s.batchIds.filter((b) => b !== batchId) } : s)),
    fees: d.fees.filter((f) => !(f.studentId === studentId && f.batchId === batchId)),
    sessions: d.sessions.map((s) => {
      if (s.batchId !== batchId || !(studentId in s.attendance)) return s;
      const { [studentId]: _gone, ...rest } = s.attendance;
      return { ...s, attendance: rest };
    }),
    assessments: d.assessments.map((a) => {
      if (a.batchId !== batchId || !(studentId in a.scores)) return a;
      const { [studentId]: _gone, ...rest } = a.scores;
      return { ...a, scores: rest };
    }),
  };
}

/* ───────── marks & messages ───────── */

/** Set (or clear with null) one student's marks for one topic, validated against the part's max. */
export function setScore(d: AppData, assessmentId: ID, studentId: ID, topicId: ID, value: number | null): AppData {
  const a = d.assessments.find((x) => x.id === assessmentId);
  const part = a?.parts.find((p) => p.topicId === topicId);
  if (!a || !part) return d;
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > part.maxMarks)) return d;
  const row = { ...(a.scores[studentId] ?? {}), [topicId]: value };
  const updated: Assessment = { ...a, scores: { ...a.scores, [studentId]: row } };
  return upsert(d, 'assessments', updated);
}

export function sendMessage(d: AppData, studentId: ID, batchId: ID, body: string, now: Date = new Date()): AppData {
  const text = body.trim();
  if (!text) return d;
  const msg: Message = { id: newId('msg'), studentId, batchId, body: text, sentAt: now.toISOString() };
  return upsert(d, 'messages', msg);
}

export function markMessagesRead(d: AppData, studentId: ID, now: Date = new Date()): AppData {
  return {
    ...d,
    messages: d.messages.map((m) => (m.studentId === studentId && !m.readAt ? { ...m, readAt: now.toISOString() } : m)),
  };
}

/* ───────── integrity ───────── */

/** Returns a list of broken references (empty = healthy). Used by tests and on import. */
export function checkIntegrity(d: AppData): string[] {
  const errors: string[] = [];
  const ids = (list: WithId[]) => new Set(list.map((x) => x.id));
  const teacher = ids(d.teachers), term = ids(d.terms), subject = ids(d.subjects), topic = ids(d.topics), batch = ids(d.batches), student = ids(d.students);
  const need = (set: Set<string>, id: string | undefined, what: string) => {
    if (id !== undefined && !set.has(id)) errors.push(what);
  };

  need(term, d.currentTermId, `currentTermId → missing term ${d.currentTermId}`);
  const dupes = (name: string, list: WithId[]) => {
    if (new Set(list.map((x) => x.id)).size !== list.length) errors.push(`${name}: duplicate ids`);
  };
  (['teachers', 'salaries', 'terms', 'subjects', 'topics', 'batches', 'students', 'goals', 'sessions', 'assessments', 'fees', 'plans', 'events', 'messages'] as const).forEach((k) =>
    dupes(k, isCollection(d, k)),
  );

  d.topics.forEach((t: Topic) => need(subject, t.subjectId, `topic ${t.id} → missing subject ${t.subjectId}`));
  d.batches.forEach((b: Batch) => {
    need(term, b.termId, `batch ${b.id} → missing term ${b.termId}`);
    need(teacher, b.teacherId, `batch ${b.id} → missing teacher ${b.teacherId}`);
    b.subjectIds.forEach((s) => need(subject, s, `batch ${b.id} → missing subject ${s}`));
  });
  d.salaries.forEach((p) => need(teacher, p.teacherId, `salary ${p.id} → missing teacher ${p.teacherId}`));
  d.students.forEach((s: Student) => s.batchIds.forEach((b) => need(batch, b, `student ${s.id} → missing batch ${b}`)));
  d.goals.forEach((g) => {
    need(student, g.studentId, `goal ${g.id} → missing student ${g.studentId}`);
    need(subject, g.subjectId, `goal ${g.id} → missing subject ${g.subjectId}`);
  });
  d.sessions.forEach((s) => {
    need(batch, s.batchId, `session ${s.id} → missing batch ${s.batchId}`);
    s.topicIds.forEach((t) => need(topic, t, `session ${s.id} → missing topic ${t}`));
    Object.keys(s.attendance).forEach((st) => need(student, st, `session ${s.id} → missing student ${st}`));
  });
  d.assessments.forEach((a: Assessment) => {
    need(batch, a.batchId, `assessment ${a.id} → missing batch ${a.batchId}`);
    need(subject, a.subjectId, `assessment ${a.id} → missing subject ${a.subjectId}`);
    a.parts.forEach((p) => need(topic, p.topicId, `assessment ${a.id} → missing topic ${p.topicId}`));
    Object.keys(a.scores).forEach((st) => need(student, st, `assessment ${a.id} → score for missing student ${st}`));
  });
  d.fees.forEach((f) => {
    need(student, f.studentId, `fee ${f.id} → missing student ${f.studentId}`);
    need(batch, f.batchId, `fee ${f.id} → missing batch ${f.batchId}`);
  });
  d.plans.forEach((p) => need(student, p.studentId, `plan ${p.id} → missing student ${p.studentId}`));
  d.events.forEach((e) => need(batch, e.batchId, `event ${e.id} → missing batch ${e.batchId}`));
  d.messages.forEach((m) => {
    need(student, m.studentId, `message ${m.id} → missing student ${m.studentId}`);
    need(batch, m.batchId, `message ${m.id} → missing batch ${m.batchId}`);
  });
  return errors;
}


/** Create the missing monthly fee records for every student in the batches (due = the batch fee). */
export function ensureMonthFees(d: AppData, batchIds: ID[], month: string): AppData {
  const have = new Set(d.fees.map((f) => `${f.studentId}|${f.batchId}|${f.month}`));
  const added = [];
  for (const b of d.batches) {
    if (!batchIds.includes(b.id)) continue;
    for (const s of d.students) {
      if (!s.batchIds.includes(b.id) || have.has(`${s.id}|${b.id}|${month}`)) continue;
      added.push({ id: `f_${s.id}_${b.id}_${month}`, studentId: s.id, batchId: b.id, month, due: b.monthlyFee, paid: 0 });
    }
  }
  return added.length ? { ...d, fees: [...d.fees, ...added] } : d;
}
