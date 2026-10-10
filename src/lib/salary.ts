// Optional teacher salary tracking for centers (brief §23d). Plain functions, no UI.
import type { AppData, ID, SalaryPayment, Teacher } from '@/types';

export type SalaryStatus = 'paid' | 'due' | 'unset';

export interface SalaryRow {
  teacher: Teacher;
  due: number;
  paid: number;
  status: SalaryStatus;
  paidOn?: string;
}

/** One row per teacher for a month. A teacher with no salary set shows as "unset". */
export function salaryRows(d: AppData, month: string): SalaryRow[] {
  return d.teachers.map((teacher) => {
    const due = teacher.monthlySalary ?? 0;
    const rec = d.salaries.find((p) => p.teacherId === teacher.id && p.month === month);
    const paid = rec?.amount ?? 0;
    return { teacher, due, paid, paidOn: rec?.paidOn, status: due <= 0 ? 'unset' : paid >= due ? 'paid' : 'due' };
  });
}

export function salaryTotals(rows: SalaryRow[]) {
  const due = rows.reduce((s, r) => s + r.due, 0);
  const paid = rows.reduce((s, r) => s + Math.min(r.paid, r.due), 0);
  return { due, paid, owed: due - paid };
}

const idFor = (teacherId: ID, month: string) => `sal_${teacherId}_${month}`;

/** Mark a teacher's salary for the month as paid in full, today. */
export function markSalaryPaid(d: AppData, teacherId: ID, month: string, today: string): AppData {
  const teacher = d.teachers.find((t) => t.id === teacherId);
  if (!teacher?.monthlySalary) return d;
  const rec: SalaryPayment = { id: idFor(teacherId, month), teacherId, month, amount: teacher.monthlySalary, paidOn: today };
  const rest = d.salaries.filter((p) => p.id !== rec.id);
  return { ...d, salaries: [...rest, rec] };
}

export function unmarkSalaryPaid(d: AppData, teacherId: ID, month: string): AppData {
  return { ...d, salaries: d.salaries.filter((p) => p.id !== idFor(teacherId, month)) };
}

export const setTrackSalaries = (d: AppData, on: boolean): AppData => ({ ...d, profile: { ...d.profile, trackSalaries: on } });
