import { describe, expect, it } from 'vitest';
import { generateSeed, emptyData } from '../src/data/seed';
import { checkIntegrity, removeTeacher } from '../src/lib/ops';
import { addTeachers, CENTER_MAX, classesLogged, situationOf, SOLO_MAX, teacherSummaries, tierFor, unassignedBatches } from '../src/lib/teachers';
import { markSalaryPaid, salaryRows, salaryTotals, setTrackSalaries, unmarkSalaryPaid } from '../src/lib/salary';
import { createBackup, parseBackup } from '../src/lib/backup';
import { DEFAULT_SETTINGS } from '../src/store/defaults';
import { migrateData } from '../src/store/migrations';

const REF = '2026-10-08';
const seed = generateSeed(REF);

describe('teachers in the seed', () => {
  it('has Himel Bhai as owner plus two more, each with a batch, and no broken links', () => {
    expect(seed.teachers.map((t) => t.id)).toEqual(['t_himel', 't_nasrin', 't_karim']);
    expect(seed.batches.map((b) => b.teacherId)).toEqual(['t_himel', 't_nasrin', 't_karim']);
    expect(checkIntegrity(seed)).toEqual([]);
  });

  it('summarises each teacher from their own batches only', () => {
    const rows = teacherSummaries(seed, { today: REF });
    const himel = rows.find((r) => r.teacher.id === 't_himel')!;
    expect(himel.batchIds).toEqual(['b_math10']);
    expect(himel.students).toBe(12);
    expect(himel.weakestTopicId).toBe('tp_quad');
    expect(rows.reduce((s, r) => s + r.students, 0)).toBeGreaterThanOrEqual(seed.students.length);
  });

  it('removing a teacher keeps their batches and students', () => {
    const next = removeTeacher(seed, 't_nasrin');
    expect(next.teachers).toHaveLength(2);
    expect(next.batches.find((b) => b.id === 'b_phy9')?.teacherId).toBeUndefined();
    expect(next.students).toHaveLength(seed.students.length);
    expect(unassignedBatches(next).map((b) => b.id)).toEqual(['b_phy9']);
    expect(checkIntegrity(next)).toEqual([]);
  });

  it('flags a batch pointing at a missing teacher', () => {
    const bad = { ...seed, batches: seed.batches.map((b, i) => (i === 0 ? { ...b, teacherId: 'ghost' } : b)) };
    expect(checkIntegrity(bad).some((e) => e.includes('missing teacher ghost'))).toBe(true);
  });
});

describe('plan sizes', () => {
  it('Solo up to 60, Center up to 300, School above', () => {
    expect([0, SOLO_MAX, SOLO_MAX + 1, CENTER_MAX, CENTER_MAX + 1].map(tierFor)).toEqual(['solo', 'solo', 'center', 'center', 'school']);
  });
});

describe('data v1 → v2 migration', () => {
  const { teachers: _t, ...rest } = seed;
  const strip = (d: typeof seed) => ({ ...d, teachers: undefined, batches: d.batches.map(({ teacherId: _x, ...b }) => b) });

  it('sample data gets the sample teachers back', () => {
    const out = migrateData(strip(seed), 1);
    expect(out.teachers.map((t) => t.name)).toEqual(['Himel Bhai', 'Nasrin Madam', 'Karim Sir']);
    expect(out.batches.map((b) => b.teacherId)).toEqual(['t_himel', 't_nasrin', 't_karim']);
    expect(rest.batches).toBeDefined();
  });

  it("someone's own data gets one owner teacher who teaches every batch", () => {
    const own = { ...emptyData(), batches: [{ ...seed.batches[0], id: 'mine', teacherId: undefined }] };
    const out = addTeachers({ ...own, teachers: undefined });
    expect(out.teachers).toHaveLength(1);
    expect(out.batches[0].teacherId).toBe(out.teachers[0].id);
    expect(out.teachers.some((t) => t.id === out.batches[0].teacherId)).toBe(true);
  });

  it('an old v1 backup file still imports', () => {
    const file = JSON.parse(createBackup(seed, DEFAULT_SETTINGS));
    file.dataVersion = 1;
    delete file.data.teachers;
    file.data.batches = file.data.batches.map(({ teacherId: _x, ...b }: Record<string, unknown>) => b);
    const r = parseBackup(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.teachers.length).toBe(3);
  });
});

describe('teacher stats', () => {
  it('counts classes taught, subjects and a plain situation for each teacher', () => {
    const rows = teacherSummaries(seed, { today: REF });
    const himel = rows.find((r) => r.teacher.id === 't_himel')!;
    expect(himel.classesTaught).toBeGreaterThan(0);
    expect(himel.lastClass).not.toBeNull();
    expect(himel.subjectIds).toEqual(['sub_math']);
    expect(['good', 'ok', 'help']).toContain(himel.situation);
  });
  it('situationOf: mastery and attendance together', () => {
    expect(situationOf(null, 90)).toBe('none');
    expect(situationOf(45, 95)).toBe('help');
    expect(situationOf(80, 50)).toBe('help');
    expect(situationOf(75, 90)).toBe('good');
    expect(situationOf(75, 70)).toBe('ok');
    expect(situationOf(60, null)).toBe('ok');
  });
  it('classesLogged ignores future classes', () => {
    const all = classesLogged(seed, seed.batches.map((b) => b.id), '2999-01-01').count;
    const upToRef = classesLogged(seed, seed.batches.map((b) => b.id), REF).count;
    expect(upToRef).toBeLessThanOrEqual(all);
  });
});

describe('teacher salaries (optional)', () => {
  const month = '2026-10';
  it('is off by default and every salary starts unpaid', () => {
    expect(seed.profile.trackSalaries).toBeUndefined();
    const rows = salaryRows(seed, month);
    expect(rows.map((r) => r.status)).toEqual(['due', 'due', 'due']);
    expect(salaryTotals(rows)).toEqual({ due: 47000, paid: 0, owed: 47000 });
  });
  it('marking paid and undoing it', () => {
    const paid = markSalaryPaid(seed, 't_nasrin', month, REF);
    const rows = salaryRows(paid, month);
    expect(rows.find((r) => r.teacher.id === 't_nasrin')).toMatchObject({ status: 'paid', paid: 15000, paidOn: REF });
    expect(salaryTotals(rows)).toEqual({ due: 47000, paid: 15000, owed: 32000 });
    expect(markSalaryPaid(paid, 't_nasrin', month, REF).salaries).toHaveLength(1); // paying twice keeps one record
    expect(unmarkSalaryPaid(paid, 't_nasrin', month).salaries).toHaveLength(0);
    expect(checkIntegrity(paid)).toEqual([]);
  });
  it('a teacher without a salary shows as unset and cannot be marked paid', () => {
    const none = { ...seed, teachers: seed.teachers.map((t) => (t.id === 't_karim' ? { ...t, monthlySalary: undefined } : t)) };
    expect(salaryRows(none, month).find((r) => r.teacher.id === 't_karim')?.status).toBe('unset');
    expect(markSalaryPaid(none, 't_karim', month, REF)).toBe(none);
  });
  it('removing a teacher removes their salary records', () => {
    const next = removeTeacher(markSalaryPaid(seed, 't_nasrin', month, REF), 't_nasrin');
    expect(next.salaries).toHaveLength(0);
    expect(checkIntegrity(next)).toEqual([]);
  });
  it('the switch is stored in the profile', () => {
    expect(setTrackSalaries(seed, true).profile.trackSalaries).toBe(true);
  });
  it('data v2 → v3 adds an empty salary list; old backups still import', () => {
    const { salaries: _s, ...v2 } = seed;
    expect(migrateData(v2, 2).salaries).toEqual([]);
    const file = JSON.parse(createBackup(seed, DEFAULT_SETTINGS));
    file.dataVersion = 2;
    delete file.data.salaries;
    const r = parseBackup(JSON.stringify(file));
    expect(r.ok).toBe(true);
  });
});
