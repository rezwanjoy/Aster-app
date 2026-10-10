import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import {
  addStudentToBatch, checkIntegrity, markMessagesRead, patch, removeBatch, removeById, removeStudent, removeStudentFromBatch,
  removeSubject, removeTerm, removeTopic, sendMessage, setScore, studentsOnlyIn, upsert,
} from '../src/lib/ops';

const seed = () => generateSeed('2026-10-08');

describe('collection helpers', () => {
  it('upserts and patches without mutating', () => {
    const d = seed();
    const b = d.batches[0];
    const d2 = patch(d, 'batches', b.id, { monthlyFee: 2000 });
    expect(d2.batches[0].monthlyFee).toBe(2000);
    expect(d.batches[0].monthlyFee).toBe(1500);
    const d3 = upsert(d2, 'batches', { ...b, id: 'b_new', name: 'New batch' });
    expect(d3.batches).toHaveLength(4);
    expect(checkIntegrity(d3)).toEqual([]);
    expect(removeById(d3, 'batches', 'b_new').batches).toHaveLength(3);
  });
});

describe('removeBatch', () => {
  it('removes the batch, its classes, exams, fees, messages, and students who belong nowhere else', () => {
    const d = seed();
    const only = studentsOnlyIn(d, 'b_phy9');
    expect(only).toHaveLength(10);
    const next = removeBatch(d, 'b_phy9');
    expect(next.batches.map((b) => b.id)).not.toContain('b_phy9');
    expect(next.sessions.some((s) => s.batchId === 'b_phy9')).toBe(false);
    expect(next.assessments.some((a) => a.batchId === 'b_phy9')).toBe(false);
    expect(next.fees.some((f) => f.batchId === 'b_phy9')).toBe(false);
    expect(next.students).toHaveLength(d.students.length - 10);
    expect(checkIntegrity(next)).toEqual([]);
  });

  it('keeps students who are also in another batch', () => {
    const d = seed();
    const next = removeBatch(d, 'b_eng10');
    const rafi = next.students.find((s) => s.name === 'Rafi Ahmed')!;
    expect(rafi.batchIds).toEqual(['b_math10']);
    expect(next.fees.some((f) => f.studentId === rafi.id && f.batchId === 'b_eng10')).toBe(false);
    expect(next.fees.some((f) => f.studentId === rafi.id && f.batchId === 'b_math10')).toBe(true);
    expect(checkIntegrity(next)).toEqual([]);
  });
});

describe('removeStudent', () => {
  it('removes goals, fees, plans, messages, marks and attendance for that student', () => {
    const d = seed();
    const next = removeStudent(d, 's_01');
    expect(next.students.some((s) => s.id === 's_01')).toBe(false);
    expect(next.goals.some((g) => g.studentId === 's_01')).toBe(false);
    expect(next.fees.some((f) => f.studentId === 's_01')).toBe(false);
    expect(next.plans.some((p) => p.studentId === 's_01')).toBe(false);
    expect(next.messages.some((m) => m.studentId === 's_01')).toBe(false);
    expect(next.sessions.every((s) => !('s_01' in s.attendance))).toBe(true);
    expect(next.assessments.every((a) => !('s_01' in a.scores))).toBe(true);
    expect(checkIntegrity(next)).toEqual([]);
  });
});

describe('batch membership', () => {
  it('adds and removes a student from a batch', () => {
    const d = seed();
    const added = addStudentToBatch(d, 's_13', 'b_math10'); // a physics student joins maths
    expect(added.students.find((s) => s.id === 's_13')!.batchIds).toEqual(['b_phy9', 'b_math10']);
    const removed = removeStudentFromBatch(added, 's_13', 'b_phy9');
    expect(removed.students.find((s) => s.id === 's_13')!.batchIds).toEqual(['b_math10']);
    expect(removed.fees.some((f) => f.studentId === 's_13' && f.batchId === 'b_phy9')).toBe(false);
    expect(checkIntegrity(removed)).toEqual([]);
  });
});

describe('topics, subjects and terms', () => {
  it('removing a topic cleans classes, exams and plans', () => {
    const next = removeTopic(seed(), 'tp_quad');
    expect(next.topics.some((t) => t.id === 'tp_quad')).toBe(false);
    expect(next.sessions.every((s) => !s.topicIds.includes('tp_quad'))).toBe(true);
    expect(next.assessments.every((a) => a.parts.every((p) => p.topicId !== 'tp_quad'))).toBe(true);
    expect(next.assessments.every((a) => Object.values(a.scores).every((row) => !('tp_quad' in row)))).toBe(true);
    expect(next.plans.every((p) => p.tasks.every((t) => t.topicId !== 'tp_quad'))).toBe(true);
    expect(checkIntegrity(next)).toEqual([]);
  });

  it('removing a subject removes its topics, exams and goals', () => {
    const next = removeSubject(seed(), 'sub_phy');
    expect(next.topics.some((t) => t.subjectId === 'sub_phy')).toBe(false);
    expect(next.assessments.some((a) => a.subjectId === 'sub_phy')).toBe(false);
    expect(next.batches.find((b) => b.id === 'b_phy9')!.subjectIds).toEqual([]);
    expect(checkIntegrity(next)).toEqual([]);
  });

  it('always keeps at least one term', () => {
    const d = seed();
    expect(removeTerm(d, d.currentTermId).terms).toHaveLength(1);
    const two = upsert(d, 'terms', { id: 'term_x', name: 'Other', startDate: '2027-01-01', endDate: '2027-06-30' });
    const next = removeTerm(two, d.currentTermId);
    expect(next.currentTermId).toBe('term_x');
    expect(next.batches.every((b) => b.termId === 'term_x')).toBe(true);
    expect(checkIntegrity(next)).toEqual([]);
  });
});

describe('setScore', () => {
  const a = 'a_math_model'; // upcoming exam, no marks yet
  it('records a mark within the maximum', () => {
    const next = setScore(seed(), a, 's_01', 'tp_quad', 7);
    expect(next.assessments.find((x) => x.id === a)!.scores['s_01']['tp_quad']).toBe(7);
  });
  it('rejects marks above the maximum, negative, or not a number', () => {
    const d = seed();
    expect(setScore(d, a, 's_01', 'tp_quad', 11)).toBe(d);
    expect(setScore(d, a, 's_01', 'tp_quad', -1)).toBe(d);
    expect(setScore(d, a, 's_01', 'tp_quad', Number.NaN)).toBe(d);
  });
  it('ignores topics that are not part of the exam and can clear a mark', () => {
    const d = seed();
    expect(setScore(d, a, 's_01', 'tp_real', 5)).toBe(d);
    const set = setScore(d, a, 's_01', 'tp_quad', 5);
    expect(setScore(set, a, 's_01', 'tp_quad', null).assessments.find((x) => x.id === a)!.scores['s_01']['tp_quad']).toBeNull();
  });
});

describe('messages', () => {
  it('sends a trimmed message and ignores empty ones', () => {
    const d = seed();
    expect(sendMessage(d, 's_05', 'b_math10', '   ')).toBe(d);
    const next = sendMessage(d, 's_05', 'b_math10', '  Please come to the extra class.  ', new Date('2026-10-08T09:00:00Z'));
    const m = next.messages[next.messages.length - 1];
    expect(m.body).toBe('Please come to the extra class.');
    expect(m.batchId).toBe('b_math10');
    expect(m.readAt).toBeUndefined();
    expect(checkIntegrity(next)).toEqual([]);
  });
  it('marks a student\'s messages read', () => {
    const next = markMessagesRead(seed(), 's_01', new Date('2026-10-08T12:00:00Z'));
    expect(next.messages.filter((m) => m.studentId === 's_01').every((m) => m.readAt)).toBe(true);
  });
});

describe('checkIntegrity', () => {
  it('reports dangling references', () => {
    const d = seed();
    d.fees[0] = { ...d.fees[0], studentId: 'ghost' };
    expect(checkIntegrity(d).join(' ')).toContain('missing student ghost');
  });
});
